//! Deployment/demo tooling only. Never used by contract code or a trader agent.
use anyhow::{Context, Result, bail, ensure};
use near_workspaces::{
    Account, Contract, ContractState, CryptoHash, Worker,
    network::Testnet,
    types::{KeyType, NearToken, SecretKey},
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::Path,
};
const UNIT: u128 = 1_000_000_000_000_000_000;
const ROLES: [&str; 6] = [
    "market",
    "belief",
    "tusd",
    "proposer",
    "trader",
    "recipient",
];
fn amount(n: u128) -> String {
    (n * UNIT).to_string()
}
fn root() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .to_path_buf()
}
fn key_path(id: &str) -> std::path::PathBuf {
    root()
        .join(".near-credentials/testnet")
        .join(format!("{id}.json"))
}
fn prefix_valid(p: &str) -> bool {
    (3..=30).contains(&p.len())
        && p.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !p.starts_with('-')
        && !p.ends_with('-')
        && !p.contains("--")
}
fn hash(bytes: &[u8]) -> CryptoHash {
    CryptoHash::try_from(&Sha256::digest(bytes)[..]).unwrap()
}
fn secret(id: &str) -> Result<SecretKey> {
    let v: Value = serde_json::from_slice(&fs::read(key_path(id))?)?;
    v["private_key"]
        .as_str()
        .context("credential lacks private_key")?
        .parse()
        .map_err(Into::into)
}
async fn exists(id: &str) -> Result<bool> {
    let response:Value=reqwest::Client::new().post("https://rpc.testnet.near.org").json(&json!({"jsonrpc":"2.0","id":"preflight","method":"query","params":{"request_type":"view_account","finality":"final","account_id":id}})).send().await?.error_for_status()?.json().await?;
    if response.get("result").is_some() {
        return Ok(true);
    }
    if response["error"]["cause"]["name"] == "UNKNOWN_ACCOUNT" {
        return Ok(false);
    }
    bail!(
        "Testnet account lookup failed; refusing to infer absence: {}",
        response["error"]
    )
}
async fn account(w: &Worker<Testnet>, prefix: &str, role: &str) -> Result<Account> {
    let sub = format!("{prefix}-{role}");
    let id = format!("{sub}.testnet");
    let path = key_path(&id);
    let live = exists(&id).await?;
    if live && !path.exists() {
        bail!(
            "Account {id} already exists without a local ownership credential; choose a different prefix. No account was overwritten."
        )
    }
    if !path.exists() {
        let sk = SecretKey::from_random(KeyType::ED25519);
        fs::create_dir_all(path.parent().unwrap())?;
        fs::set_permissions(path.parent().unwrap(), fs::Permissions::from_mode(0o700))?;
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&path)?;
        file.write_all(serde_json::to_string(&json!({"account_id":id,"public_key":sk.public_key().to_string(),"private_key":sk.to_string()}))?.as_bytes())?;
        file.sync_all()?;
    }
    let a = Account::from_file(&path, w)?;
    ensure!(a.id().as_str() == id, "credential account mismatch");
    if !live {
        let sk = secret(a.id().as_str())?;
        w.create_root_account_subaccount(sub.parse()?, sk)
            .await?
            .into_result()?;
        println!("Created testnet account: https://testnet.nearblocks.io/address/{id}");
    }
    // Read ownership before any deployment; never replace or remove keys.
    a.view_access_key(&secret(a.id().as_str())?.public_key())
        .await
        .context("Local key is not authorized on this account")?;
    Ok(a)
}
async fn read(c: &Contract, method: &str, args: Value) -> Result<Value> {
    Ok(c.view(method).args_json(args).await?.json()?)
}
async fn call(
    a: &Account,
    c: &Contract,
    method: &str,
    args: Value,
    deposit: NearToken,
) -> Result<Value> {
    let result = a
        .call(c.id(), method)
        .args_json(args)
        .deposit(deposit)
        .max_gas()
        .transact()
        .await?;
    println!(
        "{method}: https://testnet.nearblocks.io/txns/{}",
        result.outcome().transaction_hash
    );
    let success = result.into_result()?;
    let bytes = success.raw_bytes()?;
    Ok(if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes)?
    })
}
async fn deploy(a: &Account, w: &Worker<Testnet>, name: &str) -> Result<Contract> {
    let bytes = fs::read(root().join(format!("artifacts/{name}.wasm")))?;
    let expected = hash(&bytes);
    let c = Contract::from_secret_key(a.id().clone(), secret(a.id().as_str())?, w);
    match a.view_account().await?.contract_state {
        ContractState::None => {
            ensure!(
                c.view_state().await?.is_empty(),
                "Account has existing state; refusing deployment"
            );
            a.deploy(&bytes).await?.into_result()?;
            println!("Deployed {}: code hash {}", a.id(), expected);
        }
        ContractState::LocalHash(actual) => ensure!(
            actual == expected,
            "Existing code on {} differs; this tool never upgrades existing code",
            a.id()
        ),
        _ => bail!("Existing global code on {}; refusing deployment", a.id()),
    }
    ensure!(
        matches!(a.view_account().await?.contract_state,ContractState::LocalHash(actual) if actual==expected),
        "code verification failed"
    );
    Ok(c)
}
async fn init(c: &Contract, args: Value) -> Result<()> {
    if !c.view_state().await?.contains_key(b"STATE".as_slice()) {
        call(c.as_account(), c, "new", args, NearToken::from_yoctonear(0)).await?;
    }
    Ok(())
}
async fn load(w: &Worker<Testnet>, prefix: &str, role: &str) -> Result<Account> {
    let id = format!("{prefix}-{role}.testnet");
    let a = Account::from_file(key_path(&id), w)?;
    ensure!(a.id().as_str() == id, "credential account mismatch");
    Ok(a)
}
#[tokio::main]
async fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.is_empty() || args[0] == "--help" {
        println!(
            "Bet on Beliefs TESTNET tooling\n\nUsage: testnet plan PREFIX\n       testnet deploy PREFIX\n       testnet demo PREFIX\n\nplan: read local artifacts, print accounts; no keys or network writes\ndeploy: create/reuse named testnet accounts, verify ownership/code/state, initialize once\ndemo: run or resume a scripted testnet payment lifecycle, print explorer evidence\n\nAsk the human for PREFIX before deploy. Never pass keys as arguments. No upgrades, key deletion, hosting, or submission commands exist."
        );
        return Ok(());
    }
    ensure!(
        args.len() == 2 && ["plan", "deploy", "demo"].contains(&args[0].as_str()),
        "use --help"
    );
    let prefix = &args[1];
    ensure!(
        prefix_valid(prefix),
        "prefix must be 3–30 lowercase letters/digits with single interior hyphens"
    );
    if args[0] == "plan" {
        for role in ROLES {
            println!("{role}: {prefix}-{role}.testnet");
        }
        for n in ["belief_ft", "tusd_ft", "futarchy"] {
            let b = fs::read(root().join(format!("artifacts/{n}.wasm")))?;
            println!("{n}: {} bytes, NEAR code hash {}", b.len(), hash(&b));
        }
        return Ok(());
    }
    let w = near_workspaces::testnet().await?;
    if args[0] == "demo" {
        return demo(&w, prefix).await;
    }
    // Preflight every account before generating credentials or creating any account.
    for role in ROLES {
        let id = format!("{prefix}-{role}.testnet");
        if exists(&id).await? {
            ensure!(
                key_path(&id).exists(),
                "Account {id} exists without local credentials; choose another prefix"
            );
        }
    }
    let mut accounts = Vec::new();
    for role in ROLES {
        accounts.push(account(&w, prefix, role).await?);
    }
    let market = deploy(&accounts[0], &w, "futarchy").await?;
    let belief = deploy(&accounts[1], &w, "belief_ft").await?;
    let tusd = deploy(&accounts[2], &w, "tusd_ft").await?;
    init(
        &belief,
        json!({"treasury":market.id(),"proposer":accounts[3].id()}),
    )
    .await?;
    init(&tusd, json!({})).await?;
    init(
        &market,
        json!({"belief":belief.id(),"tusd":tusd.id(),"max_payment":[amount(1000),amount(1000)]}),
    )
    .await?;
    let config = read(&market, "config", json!({})).await?;
    ensure!(
        config["tokens"] == json!([belief.id(), tusd.id()])
            && config["max_payment"] == json!([amount(1000), amount(1000)]),
        "existing market configuration mismatch"
    );
    ensure!(
        read(&belief, "ft_metadata", json!({})).await?["symbol"] == "BELIEF"
            && read(&tusd, "ft_metadata", json!({})).await?["symbol"] == "tUSD",
        "token metadata mismatch"
    );
    if config["ready"] != true {
        call(
            &accounts[3],
            &market,
            "bootstrap",
            json!({}),
            NearToken::from_yoctonear(0),
        )
        .await?;
    }
    ensure!(
        read(&market, "config", json!({})).await?["ready"] == true,
        "bootstrap failed"
    );
    // Idempotent FT registration; do not top up users or overwrite prior balances.
    for a in [&accounts[0], &accounts[3], &accounts[4], &accounts[5]] {
        for t in [&belief, &tusd] {
            if read(t, "storage_balance_of", json!({"account_id":a.id()}))
                .await?
                .is_null()
            {
                call(
                    a,
                    t,
                    "storage_deposit",
                    json!({"registration_only":true}),
                    NearToken::from_millinear(10),
                )
                .await?;
            }
        }
    }
    let addresses = ROLES
        .iter()
        .zip(accounts.iter())
        .map(|(r, a)| ((*r).to_string(), json!(a.id())))
        .collect::<serde_json::Map<String, Value>>();
    let code_hashes = ["belief_ft", "tusd_ft", "futarchy"]
        .iter()
        .map(|n| {
            let b = fs::read(root().join(format!("artifacts/{n}.wasm"))).unwrap();
            ((*n).to_string(), json!(hash(&b).to_string()))
        })
        .collect::<serde_json::Map<String, Value>>();
    let summary = json!({"network":"testnet","accounts":addresses,"code_hashes":code_hashes});
    fs::create_dir_all(root().join("deployments"))?;
    fs::write(
        root().join(format!("deployments/testnet-{prefix}.json")),
        serde_json::to_vec_pretty(&summary)?,
    )?;
    println!(
        "Verified configuration. Frontend: VITE_MARKET_CONTRACT={}",
        market.id()
    );
    Ok(())
}
async fn demo(w: &Worker<Testnet>, prefix: &str) -> Result<()> {
    let proposer = load(w, prefix, "proposer").await?;
    let trader = load(w, prefix, "trader").await?;
    let recipient = load(w, prefix, "recipient").await?;
    let m = load(w, prefix, "market").await?;
    let b = load(w, prefix, "belief").await?;
    let t = load(w, prefix, "tusd").await?;
    let market = Contract::from_secret_key(m.id().clone(), secret(m.id().as_str())?, w);
    let tokens = [
        Contract::from_secret_key(b.id().clone(), secret(b.id().as_str())?, w),
        Contract::from_secret_key(t.id().clone(), secret(t.id().as_str())?, w),
    ];
    // Recheck deployed hashes before using credentials against any contract.
    for (a, name) in [(&m, "futarchy"), (&b, "belief_ft"), (&t, "tusd_ft")] {
        let bytes = fs::read(root().join(format!("artifacts/{name}.wasm")))?;
        ensure!(
            matches!(a.view_account().await?.contract_state,ContractState::LocalHash(actual) if actual==hash(&bytes)),
            "demo code mismatch"
        );
    }
    let progress_path = root().join(format!("deployments/demo-{prefix}.json"));
    let mut config = read(&market, "config", json!({})).await?;
    let id: u64 = if progress_path.exists() {
        serde_json::from_slice::<Value>(&fs::read(&progress_path)?)?["proposal_id"]
            .as_u64()
            .context("bad progress file")?
    } else {
        ensure!(
            config["active"].is_null(),
            "an unrelated proposal is already active"
        );
        for user in [&proposer, &trader] {
            if read(
                &market,
                "account",
                json!({"account_id":user.id(),"proposal_id":null}),
            )
            .await?["registered"]
                != true
            {
                call(
                    user,
                    &market,
                    "register",
                    json!({}),
                    NearToken::from_millinear(10),
                )
                .await?;
            }
            for (a, target) in [
                (0, if user.id() == proposer.id() { 100 } else { 0 }),
                (1, if user.id() == proposer.id() { 100 } else { 200 }),
            ] {
                if target == 0 {
                    continue;
                }
                let v = read(
                    &market,
                    "account",
                    json!({"account_id":user.id(),"proposal_id":null}),
                )
                .await?["vault"][a]
                    .as_str()
                    .unwrap()
                    .parse::<u128>()?;
                let needed = (target * UNIT).saturating_sub(v);
                if needed == 0 {
                    continue;
                }
                while read(&tokens[a], "ft_balance_of", json!({"account_id":user.id()}))
                    .await?
                    .as_str()
                    .unwrap()
                    .parse::<u128>()?
                    < needed
                {
                    call(
                        user,
                        &tokens[a],
                        "faucet",
                        json!({}),
                        NearToken::from_yoctonear(0),
                    )
                    .await?;
                }
                call(
                    user,
                    &tokens[a],
                    "ft_transfer_call",
                    json!({"receiver_id":market.id(),"amount":needed.to_string(),"msg":"stake"}),
                    NearToken::from_yoctonear(1),
                )
                .await?;
            }
        }
        let id=call(&proposer,&market,"create_proposal",json!({"title":"A small payment for builders","description":"Scripted testnet liquidity demonstrates mechanics, not independent price discovery.","action":{"Transfer":{"asset":0,"receiver":recipient.id(),"amount":amount(1)}},"belief_stake":amount(100),"tusd_stake":amount(100)}),NearToken::from_millinear(100)).await?.as_u64().context("proposal id missing")?;
        fs::write(
            &progress_path,
            serde_json::to_vec_pretty(&json!({"proposal_id":id}))?,
        )?;
        id
    };
    let p = read(&market, "proposal", json!({"proposal_id":id})).await?;
    ensure!(
        p["proposer"] == proposer.id().as_str(),
        "unexpected demo proposer"
    );
    if p["outcome"].is_null() {
        let state = read(
            &market,
            "account",
            json!({"account_id":trader.id(),"proposal_id":id}),
        )
        .await?;
        if state["claims_registered"] != true {
            call(
                &trader,
                &market,
                "register_claims",
                json!({"proposal_id":id}),
                NearToken::from_millinear(10),
            )
            .await?;
        }
        // Resume safely: split only if neither side holds demo tUSD claims; trade only if no BELIEF was bought.
        let state = read(
            &market,
            "account",
            json!({"account_id":trader.id(),"proposal_id":id}),
        )
        .await?;
        if state["claims"][0][1] == "0" && state["claims"][1][1] == "0" {
            call(
                &trader,
                &market,
                "split",
                json!({"proposal_id":id,"asset_id":1,"amount":amount(200)}),
                NearToken::from_yoctonear(0),
            )
            .await?;
        }
        let state = read(
            &market,
            "account",
            json!({"account_id":trader.id(),"proposal_id":id}),
        )
        .await?;
        if state["claims"][0][0] == "0" {
            call(&trader,&market,"trade",json!({"proposal_id":id,"side":0,"input_asset":1,"amount":amount(100),"min_output":amount(40)}),NearToken::from_yoctonear(0)).await?;
        }
        let end = p["end_ns"].as_str().unwrap().parse::<u128>()? / 1_000_000;
        loop {
            let now = u128::from(w.view_block().await?.timestamp()) / 1_000_000;
            if now >= end {
                break;
            }
            println!(
                "Averaging interval: {} seconds remaining",
                (end - now).div_ceil(1000)
            );
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
        }
        call(
            &trader,
            &market,
            "finalize",
            json!({"proposal_id":id}),
            NearToken::from_millinear(10),
        )
        .await?;
    }
    let p = read(&market, "proposal", json!({"proposal_id":id})).await?;
    ensure!(
        p["outcome"] == true && p["execution"] == "executed",
        "demo did not execute; inspect proposal outcome and execution separately: {p}"
    );
    let state = read(
        &market,
        "account",
        json!({"account_id":trader.id(),"proposal_id":id}),
    )
    .await?;
    for a in 0..2 {
        let n = state["claims"][0][a].as_str().unwrap();
        if n != "0" {
            call(
                &trader,
                &market,
                "redeem",
                json!({"proposal_id":id,"asset_id":a,"amount":n}),
                NearToken::from_millinear(10),
            )
            .await?;
        }
    }
    config = read(&market, "config", json!({})).await?;
    println!(
        "Demo proposal #{id}: PASS, executed. Active lock: {}. Scripted trades are not economic validation.",
        config["active"]
    );
    Ok(())
}

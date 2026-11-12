use anyhow::{Result, ensure};
use near_workspaces::{Account, Contract, types::NearToken};
use serde_json::{Value, json};
const UNIT: u128 = 1_000_000_000_000_000_000;
fn amount(n: u128) -> String {
    (n * UNIT).to_string()
}
async fn call(
    user: &Account,
    contract: &Contract,
    method: &str,
    args: Value,
    deposit: NearToken,
) -> Result<()> {
    user.call(contract.id(), method)
        .args_json(args)
        .deposit(deposit)
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    Ok(())
}
async fn view(c: &Contract, method: &str, args: Value) -> Result<Value> {
    Ok(c.view(method).args_json(args).await?.json()?)
}
async fn ft_balance(c: &Contract, account: &str) -> Result<u128> {
    Ok(view(c, "ft_balance_of", json!({"account_id":account}))
        .await?
        .as_str()
        .unwrap()
        .parse()?)
}
async fn register(user: &Account, token: &Contract) -> Result<()> {
    call(
        user,
        token,
        "storage_deposit",
        json!({"account_id":user.id(),"registration_only":true}),
        NearToken::from_millinear(10),
    )
    .await
}
async fn stake(
    user: &Account,
    token: &Contract,
    market: &Contract,
    n: u128,
    msg: &str,
) -> Result<()> {
    call(
        user,
        token,
        "ft_transfer_call",
        json!({"receiver_id":market.id(),"amount":amount(n),"msg":msg}),
        NearToken::from_yoctonear(1),
    )
    .await
}
async fn assert_backing(market: &Contract, tokens: &[Contract; 2]) -> Result<()> {
    let c = view(market, "config", json!({})).await?;
    for a in 0..2 {
        let mut total = 0u128;
        for key in ["treasury", "reserved", "stakes", "outgoing"] {
            total += c[key][a].as_str().unwrap().parse::<u128>()?;
        }
        for id in 0..c["proposal_count"].as_u64().unwrap() {
            let p = view(market, "proposal", json!({"proposal_id":id})).await?;
            let backing = p["collateral"][a].as_str().unwrap().parse::<u128>()?;
            total += backing;
            let s = if p["outcome"] == true { 0 } else { 1 };
            if p["outcome"].is_null() {
                ensure!(p["supply"][0][a].as_str().unwrap().parse::<u128>()? == backing);
            }
            ensure!(p["supply"][s][a].as_str().unwrap().parse::<u128>()? == backing);
        }
        ensure!(
            ft_balance(&tokens[a], market.id().as_str()).await? == total,
            "physical FT backing differs from ledgers for asset {a}"
        );
    }
    Ok(())
}
#[tokio::test]
async fn real_receipts_lifecycle_and_failures() -> Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let wasm = |name: &str| {
        std::fs::read(format!(
            "{}/../artifacts/{name}.wasm",
            env!("CARGO_MANIFEST_DIR")
        ))
    };
    let market = worker.dev_deploy(&wasm("futarchy")?).await?;
    let belief = worker.dev_deploy(&wasm("belief_ft")?).await?;
    let tusd = worker.dev_deploy(&wasm("tusd_ft")?).await?;
    let proposer = worker.dev_create_account().await?;
    let trader = worker.dev_create_account().await?;
    let recipient = worker.dev_create_account().await?;
    call(
        belief.as_account(),
        &belief,
        "new",
        json!({"treasury":market.id(),"proposer":proposer.id()}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    call(
        tusd.as_account(),
        &tusd,
        "new",
        json!({}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    call(
        market.as_account(),
        &market,
        "new",
        json!({"belief":belief.id(),"tusd":tusd.id(),"max_payment":[amount(1000),amount(1000)]}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    call(
        &trader,
        &market,
        "bootstrap",
        json!({}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    ensure!(view(&market, "config", json!({})).await?["treasury"][0] == amount(600_000_000));
    register(market.as_account(), &tusd).await?;
    for u in [&proposer, &trader] {
        call(
            u,
            &market,
            "register",
            json!({}),
            NearToken::from_millinear(10),
        )
        .await?;
        register(u, &belief).await?;
        register(u, &tusd).await?;
        for _ in 0..20 {
            call(u, &tusd, "faucet", json!({}), NearToken::from_yoctonear(0)).await?;
        }
        call(
            u,
            &belief,
            "faucet",
            json!({}),
            NearToken::from_yoctonear(0),
        )
        .await?;
    }
    let tokens = [belief, tusd];
    stake(&proposer, &tokens[0], &market, 1000, "stake").await?;
    stake(&proposer, &tokens[1], &market, 1000, "stake").await?;
    // Invalid message returns the complete amount via the real NEP-141 resolver.
    let before = ft_balance(&tokens[1], trader.id().as_str()).await?;
    stake(&trader, &tokens[1], &market, 10, "invalid").await?;
    ensure!(ft_balance(&tokens[1], trader.id().as_str()).await? == before);
    let args = json!({"title":"Test payment","description":"Actual sandbox receipts","action":{"Transfer":{"asset":0,"receiver":recipient.id(),"amount":amount(10)}},"belief_stake":amount(500),"tusd_stake":amount(500)});
    call(
        &proposer,
        &market,
        "create_proposal",
        args.clone(),
        NearToken::from_millinear(100),
    )
    .await?;
    assert_backing(&market, &tokens).await?;
    ensure!(
        proposer
            .call(market.id(), "create_proposal")
            .args_json(args.clone())
            .deposit(NearToken::from_millinear(100))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    // Private callback and forged FT inflow cannot credit funds.
    ensure!(
        trader
            .call(market.id(), "transfer_complete")
            .args_json(json!({"operation_id":0}))
            .transact()
            .await?
            .is_failure()
    );
    let unused: String = trader
        .call(market.id(), "ft_on_transfer")
        .args_json(json!({"sender_id":trader.id(),"amount":amount(999),"msg":"treasury"}))
        .transact()
        .await?
        .json()?;
    ensure!(unused == amount(999));
    assert_backing(&market, &tokens).await?;
    stake(&trader, &tokens[1], &market, 1000, "stake").await?;
    call(
        &trader,
        &market,
        "register_claims",
        json!({"proposal_id":0}),
        NearToken::from_millinear(10),
    )
    .await?;
    call(
        &trader,
        &market,
        "split",
        json!({"proposal_id":0,"asset_id":1,"amount":amount(1000)}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    call(
        &trader,
        &market,
        "trade",
        json!({"proposal_id":0,"side":0,"input_asset":1,"amount":amount(500),"min_output":"1"}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    assert_backing(&market, &tokens).await?;
    worker.fast_forward(1000).await?;
    // Recipient exists but is unregistered in BELIEF: execution must fail and restore treasury.
    call(
        &trader,
        &market,
        "finalize",
        json!({"proposal_id":0}),
        NearToken::from_millinear(10),
    )
    .await?;
    let p = view(&market, "proposal", json!({"proposal_id":0})).await?;
    ensure!(p["outcome"] == true && p["execution"] == "execution_failed");
    ensure!(view(&market, "config", json!({})).await?["active"].is_null());
    assert_backing(&market, &tokens).await?;
    // Force-unregister the winning claimant in the underlying FT to cause a failed redeem.
    call(
        &trader,
        &tokens[0],
        "storage_unregister",
        json!({"force":true}),
        NearToken::from_yoctonear(1),
    )
    .await?;
    let before = view(
        &market,
        "account",
        json!({"account_id":trader.id(),"proposal_id":0}),
    )
    .await?;
    call(
        &trader,
        &market,
        "redeem",
        json!({"proposal_id":0,"asset_id":0,"amount":amount(1)}),
        NearToken::from_millinear(10),
    )
    .await?;
    ensure!(
        view(
            &market,
            "account",
            json!({"account_id":trader.id(),"proposal_id":0})
        )
        .await?
            == before
    );
    assert_backing(&market, &tokens).await?;
    register(&trader, &tokens[0]).await?;
    call(
        &trader,
        &market,
        "redeem",
        json!({"proposal_id":0,"asset_id":0,"amount":amount(1)}),
        NearToken::from_millinear(10),
    )
    .await?;
    ensure!(ft_balance(&tokens[0], trader.id().as_str()).await? == UNIT);
    assert_backing(&market, &tokens).await?;
    // Second proposal proves the execution-failed lock was released; registered receiver succeeds.
    register(&recipient, &tokens[0]).await?;
    call(
        &proposer,
        &market,
        "create_proposal",
        args,
        NearToken::from_millinear(100),
    )
    .await?;
    call(
        &trader,
        &market,
        "register_claims",
        json!({"proposal_id":1}),
        NearToken::from_millinear(10),
    )
    .await?;
    // Remaining vault is empty; top up from the finite faucet.
    for _ in 0..10 {
        call(
            &trader,
            &tokens[1],
            "faucet",
            json!({}),
            NearToken::from_yoctonear(0),
        )
        .await?;
    }
    stake(&trader, &tokens[1], &market, 1000, "stake").await?;
    call(
        &trader,
        &market,
        "split",
        json!({"proposal_id":1,"asset_id":1,"amount":amount(1000)}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    call(
        &trader,
        &market,
        "merge",
        json!({"proposal_id":1,"asset_id":1,"amount":amount(100)}),
        NearToken::from_millinear(10),
    )
    .await?;
    assert_backing(&market, &tokens).await?;
    call(
        &trader,
        &market,
        "trade",
        json!({"proposal_id":1,"side":0,"input_asset":1,"amount":amount(500),"min_output":"1"}),
        NearToken::from_yoctonear(0),
    )
    .await?;
    worker.fast_forward(1000).await?;
    call(
        &trader,
        &market,
        "finalize",
        json!({"proposal_id":1}),
        NearToken::from_millinear(10),
    )
    .await?;
    ensure!(view(&market, "proposal", json!({"proposal_id":1})).await?["execution"] == "executed");
    ensure!(ft_balance(&tokens[0], recipient.id().as_str()).await? == 10 * UNIT);
    assert_backing(&market, &tokens).await?;
    ensure!(
        trader
            .call(market.id(), "finalize")
            .args_json(json!({"proposal_id":1}))
            .deposit(NearToken::from_millinear(10))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    println!(
        "Sandbox: physical backing, failure restoration, private callbacks, two proposals, split/merge/trade/redeem passed"
    );
    Ok(())
}

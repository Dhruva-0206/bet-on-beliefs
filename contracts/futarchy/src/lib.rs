use market_math::{Oracle, mul_div, swap};
use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::{
    AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue, env,
    json_types::U128,
    near,
    serde_json::{self, Value, json},
    store::{LookupMap, Vector},
};
const UNIT: u128 = 1_000_000_000_000_000_000;
const FEE: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR, retained for bounded state and receipts
const WINDOW: u64 = 600_000_000_000;
const PERIOD: u64 = 900_000_000_000;
const MAX_PROPOSALS: u64 = 100;
const MAX_USERS: u32 = 1000;
const MAX_PENDING: u32 = 4096;
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub enum Action {
    Transfer {
        asset: u8,
        receiver: AccountId,
        amount: U128,
    },
    Burn {
        amount: U128,
    },
}
impl Action {
    fn asset_amount(&self) -> (usize, u128) {
        match self {
            Self::Transfer { asset, amount, .. } => (*asset as usize, amount.0),
            Self::Burn { amount } => (0, amount.0),
        }
    }
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Proposal {
    title: String,
    description: String,
    proposer: AccountId,
    action: Action,
    start: u64,
    end: u64,
    oracle: Oracle,
    pools: [[u128; 2]; 2],
    collateral: [u128; 2],
    supply: [[u128; 2]; 2],
    outcome: Option<bool>,
    execution: u8, // 0 trading, 1 rejected, 2 executing, 3 executed, 4 execution failed
    users: u32,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
struct Pending {
    owner: AccountId,
    asset: u8,
    amount: u128,
    kind: PendingKind,
}
#[near(serializers=[borsh])]
#[derive(Clone)]
enum PendingKind {
    Vault,
    Merge(u64),
    Redeem(u64, usize),
    Execute(u64),
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    tokens: [AccountId; 2],
    treasury: [u128; 2],
    reserved: [u128; 2],
    outgoing: [u128; 2],
    stakes: [u128; 2],
    users: LookupMap<AccountId, [u128; 2]>,
    user_count: u32,
    claims: LookupMap<(u64, AccountId), [[u128; 2]; 2]>,
    proposals: Vector<Proposal>,
    active: Option<u64>,
    next_ritual: u64,
    max_payment: [u128; 2],
    pending: LookupMap<u64, Pending>,
    next_operation: u64,
    pending_count: u32,
    ready: bool,
    bootstrapping: bool,
}
fn add(a: u128, b: u128) -> u128 {
    a.checked_add(b).expect("amount overflow")
}
fn sub(a: u128, b: u128) -> u128 {
    a.checked_sub(b).expect("insufficient balance")
}
fn asset(a: u8) -> usize {
    assert!(a < 2, "invalid asset");
    a as usize
}
fn index(id: u64) -> u32 {
    u32::try_from(id).expect("proposal id overflow")
}
fn fee() {
    assert!(
        env::attached_deposit().as_yoctonear() >= FEE,
        "attach at least 0.01 NEAR"
    );
}
#[near]
impl Contract {
    #[init]
    #[private]
    pub fn new(belief: AccountId, tusd: AccountId, max_payment: [U128; 2]) -> Self {
        assert!(
            belief != tusd
                && belief != env::current_account_id()
                && tusd != env::current_account_id(),
            "distinct token accounts"
        );
        assert!(max_payment.iter().all(|x| x.0 > 0), "invalid cap");
        Self {
            tokens: [belief, tusd],
            treasury: [0; 2],
            reserved: [0; 2],
            outgoing: [0; 2],
            stakes: [0; 2],
            users: LookupMap::new(b"u"),
            user_count: 0,
            claims: LookupMap::new(b"c"),
            proposals: Vector::new(b"p"),
            active: None,
            next_ritual: 0,
            max_payment: max_payment.map(|x| x.0),
            pending: LookupMap::new(b"o"),
            next_operation: 0,
            pending_count: 0,
            ready: false,
            bootstrapping: false,
        }
    }
    /// Before accepting any deposits, account for BELIEF's initial allocation.
    pub fn bootstrap(&mut self) -> Promise {
        assert!(!self.ready && !self.bootstrapping, "bootstrap unavailable");
        self.bootstrapping = true;
        Promise::new(self.tokens[0].clone())
            .function_call(
                "ft_balance_of",
                serde_json::to_vec(&json!({"account_id":env::current_account_id()})).unwrap(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(10),
            )
            .then(Promise::new(env::current_account_id()).function_call(
                "bootstrap_complete",
                b"{}".to_vec(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(10),
            ))
    }
    #[private]
    pub fn bootstrap_complete(&mut self) -> bool {
        if !self.bootstrapping || self.ready {
            return false;
        }
        self.bootstrapping = false;
        if let Ok(bytes) = env::promise_result_checked(0, 128) {
            if let Ok(amount) = serde_json::from_slice::<U128>(&bytes) {
                self.treasury[0] = amount.0;
                self.ready = true;
                return true;
            }
        }
        false
    }
    #[payable]
    pub fn register(&mut self) {
        fee();
        let who = env::predecessor_account_id();
        if !self.users.contains_key(&who) {
            assert!(self.user_count < MAX_USERS, "user bound");
            self.users.insert(who, [0; 2]);
            self.user_count += 1;
        }
    }
    #[payable]
    pub fn register_claims(&mut self, proposal_id: u64) {
        fee();
        let who = env::predecessor_account_id();
        assert!(self.users.contains_key(&who), "register first");
        let key = (proposal_id, who);
        if !self.claims.contains_key(&key) {
            let p = self
                .proposals
                .get_mut(index(proposal_id))
                .expect("unknown proposal");
            assert!(p.users < MAX_USERS, "proposal user bound");
            p.users += 1;
            self.claims.insert(key, [[0; 2]; 2]);
        }
    }
    #[payable]
    pub fn create_proposal(
        &mut self,
        title: String,
        description: String,
        action: Action,
        belief_stake: U128,
        tusd_stake: U128,
    ) -> u64 {
        assert!(
            env::attached_deposit().as_yoctonear() >= 10 * FEE,
            "attach at least 0.1 NEAR for proposal storage"
        );
        assert!(
            matches!(action, Action::Transfer { .. }),
            "use propose_ritual for burns"
        );
        self.create(title, description, action, [belief_stake.0, tusd_stake.0])
    }
    #[payable]
    pub fn propose_ritual(&mut self, belief_stake: U128, tusd_stake: U128) -> u64 {
        assert!(
            env::attached_deposit().as_yoctonear() >= 10 * FEE,
            "attach at least 0.1 NEAR for proposal storage"
        );
        assert!(
            env::block_timestamp() >= self.next_ritual,
            "ritual cooldown"
        );
        let amount = self.treasury[0] / 100;
        assert!(amount > 0, "empty ritual");
        let id = self.create(
            "The 1% ritual".into(),
            "Burn 1% of available treasury BELIEF captured at creation.".into(),
            Action::Burn {
                amount: U128(amount),
            },
            [belief_stake.0, tusd_stake.0],
        );
        self.next_ritual = env::block_timestamp()
            .checked_add(PERIOD)
            .expect("time overflow");
        id
    }
    pub fn observe(&mut self, proposal_id: u64) {
        let p = self
            .proposals
            .get_mut(index(proposal_id))
            .expect("unknown proposal");
        assert!(p.outcome.is_none(), "resolved");
        p.oracle
            .observe(env::block_timestamp())
            .expect("oracle error");
    }
    /// Split a previously deposited vault amount into both worlds.
    pub fn split(&mut self, proposal_id: u64, asset_id: u8, amount: U128) {
        let a = asset(asset_id);
        assert!(amount.0 > 0, "zero amount");
        let who = env::predecessor_account_id();
        let mut p = self.trading(proposal_id);
        let key = (proposal_id, who.clone());
        let mut c = *self.claims.get(&key).expect("register claims first");
        let v = self.users.get_mut(&who).expect("register first");
        v[a] = sub(v[a], amount.0);
        self.stakes[a] = sub(self.stakes[a], amount.0);
        p.collateral[a] = add(p.collateral[a], amount.0);
        for side in 0..2 {
            c[side][a] = add(c[side][a], amount.0);
            p.supply[side][a] = add(p.supply[side][a], amount.0);
        }
        self.claims.insert(key, c);
        self.proposals.replace(index(proposal_id), p);
    }
    pub fn trade(
        &mut self,
        proposal_id: u64,
        side: u8,
        input_asset: u8,
        amount: U128,
        min_output: U128,
    ) -> U128 {
        assert!(side < 2, "invalid side");
        let s = side as usize;
        let a = asset(input_asset);
        let b = 1 - a;
        let mut p = self.trading(proposal_id);
        let key = (proposal_id, env::predecessor_account_id());
        let mut c = *self.claims.get(&key).expect("register claims first");
        let out = swap(p.pools[s][a], p.pools[s][b], amount.0, min_output.0)
            .expect("invalid swap or slippage");
        c[s][a] = sub(c[s][a], amount.0);
        c[s][b] = add(c[s][b], out);
        p.pools[s][a] = add(p.pools[s][a], amount.0);
        p.pools[s][b] = sub(p.pools[s][b], out);
        let prices = p
            .pools
            .map(|r| mul_div(r[1], UNIT, r[0]).expect("price overflow"));
        p.oracle
            .change(env::block_timestamp(), prices)
            .expect("oracle error");
        self.claims.insert(key, c);
        self.proposals.replace(index(proposal_id), p);
        U128(out)
    }
    #[payable]
    pub fn merge(&mut self, proposal_id: u64, asset_id: u8, amount: U128) -> Promise {
        fee();
        let a = asset(asset_id);
        assert!(amount.0 > 0, "zero amount");
        let mut p = self.trading(proposal_id);
        let who = env::predecessor_account_id();
        let key = (proposal_id, who.clone());
        let mut c = *self.claims.get(&key).expect("register claims first");
        for s in 0..2 {
            c[s][a] = sub(c[s][a], amount.0);
            p.supply[s][a] = sub(p.supply[s][a], amount.0);
        }
        p.collateral[a] = sub(p.collateral[a], amount.0);
        self.claims.insert(key, c);
        self.proposals.replace(index(proposal_id), p);
        self.send(
            Pending {
                owner: who,
                asset: asset_id,
                amount: amount.0,
                kind: PendingKind::Merge(proposal_id),
            },
            None,
        )
    }
    #[payable]
    pub fn withdraw_stake(&mut self, asset_id: u8, amount: U128) -> Promise {
        fee();
        let a = asset(asset_id);
        assert!(self.ready && amount.0 > 0, "unavailable");
        let who = env::predecessor_account_id();
        let v = self.users.get_mut(&who).expect("register first");
        v[a] = sub(v[a], amount.0);
        self.stakes[a] = sub(self.stakes[a], amount.0);
        self.send(
            Pending {
                owner: who,
                asset: asset_id,
                amount: amount.0,
                kind: PendingKind::Vault,
            },
            None,
        )
    }
    #[payable]
    pub fn finalize(&mut self, proposal_id: u64) -> PromiseOrValue<bool> {
        fee();
        assert_eq!(self.active, Some(proposal_id), "not active");
        let mut p = self
            .proposals
            .get(index(proposal_id))
            .expect("unknown proposal")
            .clone();
        assert!(p.outcome.is_none(), "already finalized");
        let pass = p
            .oracle
            .outcome(env::block_timestamp())
            .expect("window not ended");
        p.outcome = Some(pass);
        // Release existing reserve claims; no supply changes.
        let key = (proposal_id, p.proposer.clone());
        let mut c = *self.claims.get(&key).expect("proposer registered");
        for s in 0..2 {
            for a in 0..2 {
                c[s][a] = add(c[s][a], p.pools[s][a]);
                p.pools[s][a] = 0;
            }
        }
        self.claims.insert(key, c);
        let (a, amount) = p.action.asset_amount();
        self.reserved[a] = sub(self.reserved[a], amount);
        if !pass {
            self.treasury[a] = add(self.treasury[a], amount);
            p.execution = 1;
            self.active = None;
            self.proposals.replace(index(proposal_id), p);
            return PromiseOrValue::Value(false);
        }
        p.execution = 2;
        let action = p.action.clone();
        self.proposals.replace(index(proposal_id), p);
        let receiver = match &action {
            Action::Transfer { receiver, .. } => receiver.clone(),
            Action::Burn { .. } => env::current_account_id(),
        };
        PromiseOrValue::Promise(self.send(
            Pending {
                owner: receiver,
                asset: a as u8,
                amount,
                kind: PendingKind::Execute(proposal_id),
            },
            Some(action),
        ))
    }
    #[payable]
    pub fn redeem(&mut self, proposal_id: u64, asset_id: u8, amount: U128) -> Promise {
        fee();
        let a = asset(asset_id);
        assert!(amount.0 > 0, "zero amount");
        let mut p = self
            .proposals
            .get(index(proposal_id))
            .expect("unknown proposal")
            .clone();
        let side = if p.outcome.expect("not resolved") {
            0
        } else {
            1
        };
        let who = env::predecessor_account_id();
        let key = (proposal_id, who.clone());
        let mut c = *self.claims.get(&key).expect("register claims first");
        c[side][a] = sub(c[side][a], amount.0);
        p.supply[side][a] = sub(p.supply[side][a], amount.0);
        p.collateral[a] = sub(p.collateral[a], amount.0);
        self.claims.insert(key, c);
        self.proposals.replace(index(proposal_id), p);
        self.send(
            Pending {
                owner: who,
                asset: asset_id,
                amount: amount.0,
                kind: PendingKind::Redeem(proposal_id, side),
            },
            None,
        )
    }
    #[private]
    pub fn transfer_complete(&mut self, operation_id: u64) -> bool {
        let Some(op) = self.pending.remove(&operation_id) else {
            return false;
        };
        self.pending_count -= 1;
        let a = asset(op.asset);
        self.outgoing[a] = sub(self.outgoing[a], op.amount);
        let success = !matches!(
            env::promise_result_checked(0, 0),
            Err(near_sdk::PromiseError::Failed)
        );
        match op.kind {
            PendingKind::Vault => {
                if !success {
                    let v = self.users.get_mut(&op.owner).expect("registered");
                    v[a] = add(v[a], op.amount);
                    self.stakes[a] = add(self.stakes[a], op.amount);
                }
            }
            PendingKind::Merge(id) => {
                if !success {
                    let p = self.proposals.get_mut(index(id)).expect("proposal");
                    let c = self.claims.get_mut(&(id, op.owner)).expect("claims");
                    for s in 0..2 {
                        c[s][a] = add(c[s][a], op.amount);
                        p.supply[s][a] = add(p.supply[s][a], op.amount);
                    }
                    p.collateral[a] = add(p.collateral[a], op.amount);
                }
            }
            PendingKind::Redeem(id, side) => {
                if !success {
                    let p = self.proposals.get_mut(index(id)).expect("proposal");
                    let c = self.claims.get_mut(&(id, op.owner)).expect("claims");
                    c[side][a] = add(c[side][a], op.amount);
                    p.supply[side][a] = add(p.supply[side][a], op.amount);
                    p.collateral[a] = add(p.collateral[a], op.amount);
                }
            }
            PendingKind::Execute(id) => {
                let p = self.proposals.get_mut(index(id)).expect("proposal");
                assert_eq!(p.execution, 2, "execution state");
                p.execution = if success { 3 } else { 4 };
                if !success {
                    self.treasury[a] = add(self.treasury[a], op.amount);
                }
                assert_eq!(self.active, Some(id), "execution lock");
                self.active = None;
            }
        }
        success
    }
    pub fn config(&self) -> Value {
        json!({"network":"testnet","tokens":self.tokens,"ready":self.ready,"active":self.active,"next_ritual_ns":self.next_ritual.to_string(),"window_ns":WINDOW.to_string(),"max_payment":self.max_payment.map(|x|x.to_string()),"proposal_count":self.proposals.len(),"treasury":self.treasury.map(|x|x.to_string()),"reserved":self.reserved.map(|x|x.to_string()),"stakes":self.stakes.map(|x|x.to_string()),"outgoing":self.outgoing.map(|x|x.to_string()),"pending_count":self.pending_count})
    }
    pub fn account(&self, account_id: AccountId, proposal_id: Option<u64>) -> Value {
        json!({"registered":self.users.contains_key(&account_id),"vault":self.users.get(&account_id).copied().unwrap_or([0;2]).map(|x|x.to_string()),"claims_registered":proposal_id.is_some_and(|id|self.claims.contains_key(&(id,account_id.clone()))),"claims":proposal_id.and_then(|id|self.claims.get(&(id,account_id.clone())).copied()).unwrap_or([[0;2];2]).map(|r|r.map(|x|x.to_string()))})
    }
    pub fn proposal(&self, proposal_id: u64) -> Value {
        let p = self
            .proposals
            .get(index(proposal_id))
            .expect("unknown proposal");
        json!({"id":proposal_id,"title":p.title,"description":p.description,"proposer":p.proposer,"action":p.action,"start_ns":p.start.to_string(),"end_ns":p.end.to_string(),"pools":p.pools.map(|r|r.map(|x|x.to_string())),"collateral":p.collateral.map(|x|x.to_string()),"supply":p.supply.map(|r|r.map(|x|x.to_string())),"outcome":p.outcome,"execution": (["trading","rejected","executing","executed","execution_failed"][p.execution as usize])})
    }
}
impl Contract {
    fn trading(&self, id: u64) -> Proposal {
        assert_eq!(self.active, Some(id), "not active");
        let p = self
            .proposals
            .get(index(id))
            .expect("unknown proposal")
            .clone();
        assert!(
            p.outcome.is_none() && env::block_timestamp() < p.end,
            "trading closed"
        );
        p
    }
    fn create(
        &mut self,
        title: String,
        description: String,
        action: Action,
        liquidity: [u128; 2],
    ) -> u64 {
        assert!(
            self.ready && self.active.is_none(),
            "proposal locked or bootstrap required"
        );
        assert!(
            !title.trim().is_empty() && title.len() <= 120 && description.len() <= 2000,
            "text bounds"
        );
        assert!(
            (self.proposals.len() as u64) < MAX_PROPOSALS,
            "proposal bound"
        );
        assert!(liquidity.iter().all(|x| *x > 0), "both stakes required");
        let (a, amount) = action.asset_amount();
        assert!(a < 2 && amount > 0, "invalid action");
        if let Action::Transfer { receiver, .. } = &action {
            assert!(
                amount <= self.max_payment[a]
                    && receiver != &env::current_account_id()
                    && !self.tokens.contains(receiver),
                "invalid capped payment"
            );
        }
        if matches!(action, Action::Burn { .. }) {
            assert!(
                amount <= self.treasury[0] / 100,
                "burn cap is 1% available treasury"
            );
        }
        let who = env::predecessor_account_id();
        let v = self.users.get_mut(&who).expect("register first");
        for i in 0..2 {
            v[i] = sub(v[i], liquidity[i]);
            self.stakes[i] = sub(self.stakes[i], liquidity[i]);
        }
        self.treasury[a] = sub(self.treasury[a], amount);
        self.reserved[a] = add(self.reserved[a], amount);
        let start = env::block_timestamp();
        let price = mul_div(liquidity[1], UNIT, liquidity[0]).expect("price overflow");
        let p = Proposal {
            title,
            description,
            proposer: who.clone(),
            action,
            start,
            end: start.checked_add(WINDOW).expect("time overflow"),
            oracle: Oracle::new(start, WINDOW, [price; 2]).expect("invalid oracle seed"),
            pools: [liquidity; 2],
            collateral: liquidity,
            supply: [liquidity; 2],
            outcome: None,
            execution: 0,
            users: 1,
        };
        let id = self.proposals.len() as u64;
        self.claims.insert((id, who), [[0; 2]; 2]);
        self.proposals.push(p);
        self.active = Some(id);
        id
    }
    fn send(&mut self, op: Pending, action: Option<Action>) -> Promise {
        assert!(self.pending_count < MAX_PENDING, "pending bound");
        let id = self.next_operation;
        self.next_operation = id.checked_add(1).expect("operation overflow");
        self.pending_count += 1;
        self.outgoing[op.asset as usize] = add(self.outgoing[op.asset as usize], op.amount);
        let (method, args) = if matches!(action, Some(Action::Burn { .. })) {
            ("burn", json!({"amount":U128(op.amount)}))
        } else {
            (
                "ft_transfer",
                json!({"receiver_id":op.owner,"amount":U128(op.amount),"memo":"Bet on Beliefs settlement"}),
            )
        };
        let token = self.tokens[op.asset as usize].clone();
        self.pending.insert(id, op);
        Promise::new(token)
            .function_call(
                method,
                serde_json::to_vec(&args).unwrap(),
                NearToken::from_yoctonear(1),
                Gas::from_tgas(20),
            )
            .then(Promise::new(env::current_account_id()).function_call(
                "transfer_complete",
                serde_json::to_vec(&json!({"operation_id":id})).unwrap(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(30),
            ))
    }
}
#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let unused = PromiseOrValue::Value(amount);
        if !self.ready || amount.0 == 0 || msg.len() > 64 {
            return unused;
        }
        let Some(a) = self
            .tokens
            .iter()
            .position(|x| x == &env::predecessor_account_id())
        else {
            return unused;
        };
        if msg == "treasury" {
            let Some(n) = self.treasury[a].checked_add(amount.0) else {
                return unused;
            };
            self.treasury[a] = n;
            return PromiseOrValue::Value(U128(0));
        }
        if msg != "stake" {
            return unused;
        }
        let Some(v) = self.users.get(&sender_id).copied() else {
            return unused;
        };
        let (Some(balance), Some(total)) = (
            v[a].checked_add(amount.0),
            self.stakes[a].checked_add(amount.0),
        ) else {
            return unused;
        };
        let mut next = v;
        next[a] = balance;
        self.users.insert(sender_id, next);
        self.stakes[a] = total;
        PromiseOrValue::Value(U128(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::PromiseResult;
    use near_sdk::{
        test_utils::{VMContextBuilder, accounts},
        testing_env,
    };
    fn ctx(who: usize, time: u64, deposit: u128, result: Option<PromiseResult>) {
        let c = VMContextBuilder::new()
            .current_account_id(accounts(0))
            .predecessor_account_id(accounts(who))
            .block_timestamp(time)
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .build();
        testing_env!(
            c,
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            result.into_iter().collect()
        );
    }
    fn contract() -> Contract {
        ctx(0, 0, 0, None);
        let mut c = Contract::new(accounts(1), accounts(2), [U128(1000 * UNIT); 2]);
        c.ready = true;
        c.treasury = [10_000 * UNIT; 2];
        for user in [3, 4] {
            ctx(user, 0, FEE, None);
            c.register();
            for token in [1, 2] {
                ctx(token, 0, 0, None);
                assert!(matches!(
                    c.ft_on_transfer(accounts(user), U128(2000 * UNIT), "stake".into()),
                    PromiseOrValue::Value(U128(0))
                ));
            }
        }
        c
    }
    fn create(c: &mut Contract) -> u64 {
        ctx(3, 0, 10 * FEE, None);
        c.create_proposal(
            "Pay a builder".into(),
            "Test capped action".into(),
            Action::Transfer {
                asset: 0,
                receiver: accounts(5),
                amount: U128(100 * UNIT),
            },
            U128(1000 * UNIT),
            U128(1000 * UNIT),
        )
    }
    fn backing(c: &Contract) -> [u128; 2] {
        let mut sum = [0; 2];
        for a in 0..2 {
            sum[a] = c.treasury[a] + c.reserved[a] + c.stakes[a] + c.outgoing[a];
            for p in c.proposals.iter() {
                sum[a] += p.collateral[a];
            }
        }
        sum
    }
    fn invariant(c: &Contract, id: u64) {
        let p = c.proposals.get(index(id)).unwrap();
        let mut sum = p.pools;
        for user in [3, 4] {
            if let Some(claims) = c.claims.get(&(id, accounts(user))) {
                for s in 0..2 {
                    for a in 0..2 {
                        sum[s][a] += claims[s][a];
                    }
                }
            }
        }
        assert_eq!(sum, p.supply);
        for a in 0..2 {
            match p.outcome {
                None => {
                    assert_eq!(p.supply[0][a], p.collateral[a]);
                    assert_eq!(p.supply[1][a], p.collateral[a]);
                }
                Some(pass) => assert_eq!(p.supply[if pass { 0 } else { 1 }][a], p.collateral[a]),
            }
        }
    }
    #[test]
    fn reserve_split_swap_merge_failure_and_reject() {
        let mut c = contract();
        let before = backing(&c);
        let id = create(&mut c);
        invariant(&c, id);
        assert_eq!(backing(&c), before);
        assert_eq!(c.reserved[0], 100 * UNIT);
        ctx(4, 1, FEE, None);
        c.register_claims(id);
        c.split(id, 0, U128(100 * UNIT));
        c.split(id, 1, U128(100 * UNIT));
        c.trade(id, 0, 1, U128(10 * UNIT), U128(1));
        invariant(&c, id);
        assert_eq!(backing(&c), before);
        ctx(4, 2, FEE, None);
        drop(c.merge(id, 1, U128(20 * UNIT)));
        invariant(&c, id);
        assert_eq!(backing(&c), before);
        // Merge callback may arrive after resolution. Restore backing and both claims once.
        ctx(5, WINDOW, FEE, None);
        let _ = c.finalize(id);
        assert_eq!(c.active, None);
        ctx(0, WINDOW + 1, 0, Some(PromiseResult::Failed));
        assert!(!c.transfer_complete(0));
        invariant(&c, id);
        assert_eq!(backing(&c), before);
        assert!(!c.transfer_complete(0));
        assert_eq!(backing(&c), before);
        assert_eq!(c.reserved, [0; 2]);
    }
    fn pass(c: &mut Contract, id: u64) {
        ctx(4, 1, FEE, None);
        c.register_claims(id);
        c.split(id, 1, U128(1000 * UNIT));
        c.trade(id, 0, 1, U128(500 * UNIT), U128(1));
        ctx(5, WINDOW, FEE, None);
        assert!(matches!(c.finalize(id), PromiseOrValue::Promise(_)));
        assert_eq!(c.active, Some(id));
        assert_eq!(c.proposals.get(index(id)).unwrap().outcome, Some(true));
    }
    #[test]
    fn failed_execution_preserves_outcome_and_unlocks_once() {
        let mut c = contract();
        let before = backing(&c);
        let id = create(&mut c);
        pass(&mut c, id);
        invariant(&c, id);
        assert_eq!(backing(&c), before);
        ctx(0, WINDOW + 1, 0, Some(PromiseResult::Failed));
        assert!(!c.transfer_complete(0));
        assert_eq!(c.active, None);
        assert_eq!(c.proposals.get(index(id)).unwrap().execution, 4);
        assert_eq!(c.proposals.get(index(id)).unwrap().outcome, Some(true));
        assert_eq!(backing(&c), before);
        assert!(!c.transfer_complete(0));
    }
    #[test]
    fn successful_execution_and_failed_redemption_restore_once() {
        let mut c = contract();
        let before = backing(&c);
        let id = create(&mut c);
        pass(&mut c, id);
        ctx(0, WINDOW + 1, 0, Some(PromiseResult::Successful(vec![])));
        assert!(c.transfer_complete(0));
        assert_eq!(backing(&c), [before[0] - 100 * UNIT, before[1]]);
        ctx(4, WINDOW + 2, FEE, None);
        drop(c.redeem(id, 0, U128(10 * UNIT)));
        let pending = backing(&c);
        invariant(&c, id);
        ctx(0, WINDOW + 3, 0, Some(PromiseResult::Failed));
        assert!(!c.transfer_complete(1));
        invariant(&c, id);
        assert_eq!(backing(&c), pending);
        assert!(!c.transfer_complete(1));
        ctx(4, WINDOW + 4, FEE, None);
        drop(c.redeem(id, 0, U128(10 * UNIT)));
        ctx(0, WINDOW + 5, 0, Some(PromiseResult::Successful(vec![])));
        assert!(c.transfer_complete(2));
        invariant(&c, id);
        assert_eq!(backing(&c), [pending[0] - 10 * UNIT, pending[1]]);
    }
    #[test]
    fn vault_callbacks_out_of_order() {
        let mut c = contract();
        let before = backing(&c);
        ctx(3, 0, FEE, None);
        drop(c.withdraw_stake(0, U128(10 * UNIT)));
        ctx(4, 0, FEE, None);
        drop(c.withdraw_stake(1, U128(20 * UNIT)));
        ctx(0, 1, 0, Some(PromiseResult::Failed));
        assert!(!c.transfer_complete(1));
        assert_eq!(backing(&c), before);
        ctx(0, 2, 0, Some(PromiseResult::Successful(vec![])));
        assert!(c.transfer_complete(0));
        assert_eq!(backing(&c), [before[0] - 10 * UNIT, before[1]]);
        assert!(!c.transfer_complete(1));
    }
    #[test]
    fn invalid_inflows_refund_full_amount() {
        let mut c = contract();
        let before = backing(&c);
        for (token, who, msg) in [
            (5, 3, "stake"),
            (1, 5, "stake"),
            (1, 3, "split"),
            (2, 3, "unknown"),
        ] {
            ctx(token, 0, 0, None);
            assert!(matches!(
                c.ft_on_transfer(accounts(who), U128(123), msg.into()),
                PromiseOrValue::Value(U128(123))
            ));
        }
        assert_eq!(backing(&c), before);
    }
    #[test]
    fn bootstrap_only_once() {
        ctx(0, 0, 0, None);
        let mut c = Contract::new(accounts(1), accounts(2), [U128(UNIT); 2]);
        drop(c.bootstrap());
        ctx(
            0,
            1,
            0,
            Some(PromiseResult::Successful(
                b"\"600000000000000000000000000\"".to_vec(),
            )),
        );
        assert!(c.bootstrap_complete());
        assert_eq!(c.treasury[0], 600_000_000 * UNIT);
        assert!(!c.bootstrap_complete());
    }
    #[test]
    #[should_panic(expected = "proposal locked")]
    fn single_active() {
        let mut c = contract();
        create(&mut c);
        create(&mut c);
    }
    #[test]
    #[should_panic(expected = "already finalized")]
    fn double_finalize() {
        let mut c = contract();
        let id = create(&mut c);
        pass(&mut c, id);
        ctx(5, WINDOW, FEE, None);
        let _ = c.finalize(id);
    }
    #[test]
    #[should_panic(expected = "trading closed")]
    fn end_boundary_no_swap() {
        let mut c = contract();
        let id = create(&mut c);
        ctx(3, WINDOW, 0, None);
        c.trade(id, 0, 1, U128(1), U128(0));
    }
    #[test]
    fn ritual_fixed_amount_and_cooldown() {
        let mut c = contract();
        ctx(3, 0, 10 * FEE, None);
        let id = c.propose_ritual(U128(1000 * UNIT), U128(1000 * UNIT));
        assert_eq!(
            c.proposals.get(index(id)).unwrap().action.asset_amount(),
            (0, 100 * UNIT)
        );
        assert_eq!(c.next_ritual, PERIOD);
        ctx(1, 1, 0, None);
        let _ = c.ft_on_transfer(accounts(4), U128(UNIT), "treasury".into());
        assert_eq!(
            c.proposals.get(index(id)).unwrap().action.asset_amount(),
            (0, 100 * UNIT)
        );
    }
    #[test]
    #[should_panic(expected = "use propose_ritual")]
    fn general_burn_cannot_bypass_ritual() {
        let mut c = contract();
        ctx(3, 0, 10 * FEE, None);
        c.create_proposal(
            "Bypass".into(),
            String::new(),
            Action::Burn { amount: U128(UNIT) },
            U128(UNIT),
            U128(UNIT),
        );
    }
    #[test]
    #[should_panic(expected = "ritual cooldown")]
    fn rejected_ritual_still_observes_cooldown() {
        let mut c = contract();
        ctx(3, 0, 10 * FEE, None);
        let id = c.propose_ritual(U128(100 * UNIT), U128(100 * UNIT));
        ctx(4, WINDOW, FEE, None);
        let _ = c.finalize(id);
        ctx(3, WINDOW + 1, 10 * FEE, None);
        c.propose_ritual(U128(100 * UNIT), U128(100 * UNIT));
    }
    #[test]
    #[should_panic(expected = "invalid capped payment")]
    fn cap_cannot_be_bypassed() {
        let mut c = contract();
        ctx(3, 0, 10 * FEE, None);
        c.create_proposal(
            "Overspend".into(),
            String::new(),
            Action::Transfer {
                asset: 0,
                receiver: accounts(5),
                amount: U128(1001 * UNIT),
            },
            U128(UNIT),
            U128(UNIT),
        );
    }
    #[test]
    fn successful_burn_consumes_only_reserved_funds() {
        let mut c = contract();
        let before = backing(&c);
        ctx(3, 0, 10 * FEE, None);
        let id = c.propose_ritual(U128(1000 * UNIT), U128(1000 * UNIT));
        pass(&mut c, id);
        ctx(
            0,
            WINDOW + 1,
            0,
            Some(PromiseResult::Successful(b"null".to_vec())),
        );
        assert!(c.transfer_complete(0));
        assert_eq!(backing(&c), [before[0] - 100 * UNIT, before[1]]);
        invariant(&c, id);
    }
}

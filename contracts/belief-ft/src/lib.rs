use near_contract_standards::fungible_token::{
    FungibleToken,
    core::FungibleTokenCore,
    metadata::{FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider},
    resolver::FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::{
    AccountId, NearToken, PanicOnDefault, PromiseOrValue, assert_one_yocto, env, json_types::U128,
    near,
};
const UNIT: u128 = 1_000_000_000_000_000_000;
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    token: FungibleToken,
    faucet_remaining: u128,
}
#[near]
impl Contract {
    #[init]
    #[private]
    pub fn new(treasury: AccountId, proposer: AccountId) -> Self {
        let faucet = env::current_account_id();
        assert!(
            treasury != proposer && treasury != faucet && proposer != faucet,
            "distinct allocation accounts required"
        );
        let mut token = FungibleToken::new(b"t".to_vec());
        for (account, amount) in [
            (&treasury, 600_000_000 * UNIT),
            (&proposer, 200_000_000 * UNIT),
            (&faucet, 200_000_000 * UNIT),
        ] {
            token.internal_register_account(account);
            token.internal_deposit(account, amount);
            near_contract_standards::fungible_token::events::FtMint {
                owner_id: account,
                amount: U128(amount),
                memo: Some("initial allocation"),
            }
            .emit();
        }
        Self {
            token,
            faucet_remaining: 200_000_000 * UNIT,
        }
    }

    /// Faucet redistributes a finite reserve. Registration is paid by the caller separately.
    pub fn faucet(&mut self) -> U128 {
        let caller = env::predecessor_account_id();
        let source = env::current_account_id();
        assert_ne!(caller, source, "self faucet");
        let amount = 100 * UNIT;
        assert!(self.faucet_remaining >= amount, "faucet exhausted");
        self.faucet_remaining = self.faucet_remaining.checked_sub(amount).unwrap();
        self.token
            .internal_transfer(&source, &caller, amount, Some("testnet faucet".into()));
        U128(amount)
    }
    pub fn faucet_remaining(&self) -> U128 {
        U128(self.faucet_remaining)
    }
    #[payable]
    pub fn burn(&mut self, amount: U128) {
        assert_one_yocto();
        assert!(amount.0 > 0, "zero burn");
        self.token
            .internal_withdraw(&env::predecessor_account_id(), amount.0);
        near_contract_standards::fungible_token::events::FtBurn {
            owner_id: &env::predecessor_account_id(),
            amount,
            memo: Some("holder burn"),
        }
        .emit();
    }
}
#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }
    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }
    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }
    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}
#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        self.token
            .ft_resolve_transfer(sender_id, receiver_id, amount)
    }
}
#[near]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }
    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }
    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.storage_unregister(force)
    }
    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}
#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.into(),
            name: "BELIEF testnet".into(),
            symbol: "BELIEF".into(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 18,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{
        test_utils::{VMContextBuilder, accounts},
        testing_env,
    };
    fn context(caller: usize, deposit: u128) {
        testing_env!(
            VMContextBuilder::new()
                .current_account_id(accounts(0))
                .predecessor_account_id(accounts(caller))
                .attached_deposit(NearToken::from_yoctonear(deposit))
                .build()
        );
    }
    fn init() -> Contract {
        context(0, 0);
        Contract::new(accounts(1), accounts(2))
    }
    #[test]
    fn allocation_and_faucet_conserve_supply() {
        let mut c = init();
        assert_eq!(c.ft_total_supply().0, 1_000_000_000 * UNIT);
        context(3, 10u128.pow(24));
        c.storage_deposit(None, Some(true));
        context(3, 0);
        let reserve = c.faucet_remaining().0;
        assert_eq!(c.faucet().0, 100 * UNIT);
        assert_eq!(c.ft_balance_of(accounts(3)).0, 100 * UNIT);
        assert_eq!(c.faucet_remaining().0, reserve - 100 * UNIT);
        assert_eq!(c.ft_total_supply().0, 1_000_000_000 * UNIT);
        context(3, 1);
        c.burn(U128(40 * UNIT));
        assert_eq!(c.ft_total_supply().0, 1_000_000_000 * UNIT - 40 * UNIT);
        assert_eq!(c.ft_balance_of(accounts(3)).0, 60 * UNIT);
    }
    #[test]
    #[should_panic(expected = "not registered")]
    fn faucet_requires_registration() {
        let mut c = init();
        context(3, 0);
        c.faucet();
    }
    #[test]
    #[should_panic(expected = "1 yoctoNEAR")]
    fn burn_requires_one_yocto() {
        let mut c = init();
        context(3, 0);
        c.burn(U128(1));
    }
    #[test]
    #[should_panic(expected = "faucet exhausted")]
    fn finite_faucet() {
        let mut c = init();
        c.faucet_remaining = 0;
        context(3, 0);
        c.faucet();
    }
    #[test]
    fn transfer_and_storage() {
        let mut c = init();
        for user in [3, 4] {
            context(user, 10u128.pow(24));
            c.storage_deposit(None, Some(true));
        }
        context(3, 0);
        c.faucet();
        context(3, 1);
        c.ft_transfer(accounts(4), U128(20 * UNIT), None);
        assert_eq!(c.ft_balance_of(accounts(3)).0, 80 * UNIT);
        assert_eq!(c.ft_balance_of(accounts(4)).0, 20 * UNIT);
        assert!(c.storage_balance_of(accounts(4)).is_some());
    }
}

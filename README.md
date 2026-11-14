# Bet on Beliefs

Conditional markets decide whether a NEAR testnet treasury executes a payment or burns BELIEF. The contract reserves the action budget, compares ten-minute price averages, and settles the selected outcome.

Created and led by **Dhruva Somen Chakrabarty**.

## What it does and why I built it

A treasury decision needs a clear rule and a verifiable result. Bet on Beliefs makes both visible: trade conditional BELIEF against conditional tUSD in PASS (execute) and FAIL (reject) markets, then let the contract apply the rule. This is a testnet experiment in futarchy, not a claim that token prices measure public welfare. It draws on [MetaDAO](https://metadao.com/docs) and the wider futarchy mechanism.

## Try the app

Live app: **https://dhruva-0206.github.io/bet-on-beliefs/**. HTTPS, public assets and live testnet reads were verified on 2026-11-14. The public-site Meteor payment lifecycle is verified through both redemptions. See [verification](docs/VERIFICATION.md) for test scope and receipt evidence.

The app defaults to `bob-dhruva-market.testnet`. Browse its real proposal and treasury without a wallet. To transact, connect **Meteor on testnet**. Use a separate testnet account with testnet NEAR for storage and gas. Never provide a recovery phrase or private key to this app or its maintainers. Advanced settings allow a different `.testnet` market.

## A complete walkthrough

1. **Connect Meteor.** Confirm the account and testnet badge in the header.
2. **Get tokens.** Follow “Get test tokens and set up.” Each faucet registers token storage (0.01 testnet NEAR attached, excess refunded) and sends 100 tokens from finite reserves.
3. **Register the market and deposit.** Market registration is separate and retains 0.01 NEAR. Transfer wallet tokens into your own vault with a 1 yoctoNEAR transfer-call deposit. Treasury balances are separate from both.
4. **Choose an open proposal or propose.** A payment proposal reserves treasury funds. Its proposer supplies both liquidity stakes from their vault and pays a retained 0.1 NEAR fee. Only one proposal may be active or executing.
5. **Register proposal claims and trade.** Claim registration retains 0.01 NEAR per proposal for additional participants; proposal creation registers the proposer automatically. Splitting one deposited token creates one PASS and one FAIL claim. “Split vault & trade” spends only the chosen side; the opposite-side claim remains yours. Set the minimum output before approving.
6. **Finalize after ten minutes.** PASS average must be **strictly greater than FAIL average × 1.03**. Equality rejects the action. Outcome and action execution are separate states.
7. **Redeem.** After resolution, each winning claim returns one underlying token. Check final receipts and refreshed balances. Finalization, merging, redemption and withdrawals each retain a 0.01 NEAR operation fee where required by the contract.

Two distinct payment examples are verified: scripted contract proposal 0 (UI #1), and Dhruva’s public-site Meteor walkthrough on contract proposal 1 (UI #2). The human walkthrough deposited 10 of each asset, traded 1 tUSD on PASS, finalized a 1 BELIEF payment and redeemed both assets. Final wallet: 201 BELIEF / 100 tUSD; vaults, winning claims and proposal collateral zero.

## How the mechanism works

Both markets start with equal conditional reserves. Swaps use constant product with a 0.30% fee and checked U256 arithmetic. The oracle integrates the previous recorded reserve price before every reserve change over a fixed 600-second interval. Finalization uses those averages, not the spot prices displayed while trading. The deployed proposal view does not expose recorded averages; the UI says so rather than inferring them.

Actions are capped payments or a burn of 1% of available treasury BELIEF, captured at proposal creation. Burn proposals have a 15-minute cooldown. Available treasury, action reservations, depositor vaults, collateral and outgoing transfers have separate ledgers. Private callbacks restore failed asynchronous transfers once. Failed action execution restores its budget without changing the selected market outcome. See [design](DESIGN.md), [accounting](docs/ACCOUNTING.md) and [oracle policy](docs/ORACLE.md).

## Verified evidence and its scope

| Evidence | What it establishes |
| --- | --- |
| 35 Rust unit tests | Token allocation, lifecycle behavior, checked arithmetic and oracle fixtures. |
| One sandbox integration scenario, four proposals | Real Wasm receipts, payment/burn execution, failed-transfer recovery, authorization and backing checks. |
| Scripted testnet lifecycle | A real ten-minute proposal selected PASS, paid 1 BELIEF and completed both trader redemptions. [Receipts and fixed-block snapshots](deployments/README.md). |
| Browser regressions | Synthetic wallet boundaries, transaction construction, UI recovery and project base path. They do not constitute human signatures. See [verification](docs/VERIFICATION.md) for check scope. |
| Public-site human lifecycle | Dhruva signed registration, vault deposits, proposal creation, a PASS split/trade, finalization and both redemptions. Every transaction was verified FINAL. [Final accounting](deployments/human-lifecycle-final-accounting.json) checks same-block backing across all proposals. One participant demonstrates mechanics, not independent price discovery. |
| Real Meteor faucet tests | `dhruva.testnet` signed token registration/faucet calls. The [post-decoder-fix repeat](deployments/human-wallet-post-fix.json) is FINAL with four successful receipts: 200 BELIEF, 100 tUSD and zero vault balances at the recorded block. This does not prove the full user lifecycle. |

Contract artifact hashes and account addresses are in [BUILD_HASHES](docs/BUILD_HASHES.json) and the [testnet manifest](deployments/testnet-bob-dhruva.json). Historical reports are dated snapshots, not claims about every later chain state.

## Architecture and reproduction

Three Rust contracts: `contracts/belief-ft`, `contracts/tusd-ft` and `contracts/futarchy`. The Vite/React frontend in `web/` reads actual testnet RPC and connects Meteor through NEAR Wallet Selector. There are no AI traders, cron jobs or extra tracks in the MVP.

```sh
bash scripts/setup-dev.sh
npm ci --prefix web
npm run test --prefix web
npm run build --prefix web
npm run preview --prefix web
# Browser installation and regression checks:
cd web
npx playwright install --with-deps chromium
npm run test:browser
BOB_DEV_BROWSER=1 npm run test:browser
cd ..
VITE_MARKET_CONTRACT=bob-dhruva-market.testnet npm run build:pages --prefix web
npm run test:pages --prefix web
```

Contract checks, when affected: `cargo test --workspace --exclude integration-tests --locked`, `bash scripts/build-contracts.sh`, then `cargo test -p integration-tests --test lifecycle --locked -- --nocapture`. See [Linux development](docs/DEVELOPMENT.md), [wallet instructions](docs/FRONTEND.md) and [Pages deployment](docs/HOSTING.md).

## Limitations and trust assumptions

Thin markets, sustained manipulation and extreme short manipulation can affect the decision. Tested attacks establish their observed behavior, not general resistance. Scripted faucet trades demonstrate mechanics, not reliable price discovery. Token price is not public welfare, and conditional-market prices do not establish causation.

Contracts are not independently audited. Full-access deployment keys remain with their owners; the contracts are upgradeable. There is one active proposal and a sole proposer liquidity provider. Faucets redistribute finite reserves and test tokens have no promised value. [Dependency review](docs/DEPENDENCY_REVIEW.md) records the decoder remediation, remaining low findings and build warnings. Automated and manual accessibility checks are scoped evidence, not a full compliance claim.

## Creator, assistance and license

**Dhruva Somen Chakrabarty** conceived and led this project, set the scope, orchestrated implementation/debugging and made product decisions. The documented Meteor signatures were performed by Dhruva. Codex assisted with code, tests and documentation.

Libraries include NEAR SDK/standards 5.30.1, uint 0.10.0, near-workspaces 0.24.0, Rust 1.95.0, React, Vite, Meteor SDK and NEAR Wallet Selector. Exact versions and dependency overrides are in the manifests and lockfiles. [Interface guidance](docs/FRONTEND.md#interface-design) informed clarity, accessibility and recovery.

Also by Dhruva: [Builders First](https://github.com/Dhruva-0206/builders-first), an independent NEAR investment thesis built from developer data.

Built for NEAR HACKATHON, November 2026. Primary fit: Memecoins With Mechanics; secondary fit: Social Money. All contract deployments are testnet only. [MIT license](LICENSE), copyright 2026 DHRUVA SOMEN CHAKRABARTY.

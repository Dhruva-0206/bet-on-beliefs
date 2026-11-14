# Evidence and verification

The public app is https://dhruva-0206.github.io/bet-on-beliefs/. Its deployed
frontend source is `bac97ce36bda26c9eebaf77dadc38b3f97b693c9`;
this is the initial release snapshot from 2026-11-14. Later publications have
separate dated reports; the original asset evidence is unchanged.
[Pages run](https://github.com/Dhruva-0206/bet-on-beliefs/actions/runs/43585261964)
completed build and deployment. [Asset evidence](../deployments/pages-live-release.json)
records HTTPS responses and SHA-256 matches for all nine public files.

## Automated checks

The verified frontend suite contains 8 unit/compatibility tests, 14 production
browser tests, 14 development browser tests and 4 Pages-path browser tests.
It exercises transaction construction through the Meteor adapter, serialization,
popup handling, cancellation, receipt confirmation, failure and saved-hash recovery.
These tests use synthetic signing boundaries and do not sign transactions.
Type checks and root/Pages production builds pass in frontend CI.

Contract CI runs 35 Rust unit tests and one real-Wasm sandbox scenario covering
four proposals, payment/burn execution, failed-transfer recovery, authorization,
backing checks and oracle attack fixtures. Test commands and tool versions are
in [DEVELOPMENT](DEVELOPMENT.md) and [README](../README.md#architecture-reproduction-credits-and-license).
The accounting argument and its assumptions are in [ACCOUNTING](ACCOUNTING.md).

Required workflows run on pushes and pull requests:
[frontend](../.github/workflows/web.yml),
[contracts](../.github/workflows/contracts.yml), and
[repository hygiene](../.github/workflows/scaffold.yml).
Check the exact commit in [GitHub Actions](https://github.com/Dhruva-0206/bet-on-beliefs/actions).
The manual Pages workflow is a separate publishing operation.

## Human and scripted testnet evidence

Dhruva used Meteor on the public site as `dhruva.testnet` for contract proposal
1 (UI #2): registration, vault deposits, proposal creation, PASS split/trade,
finalization and both redemptions. Every transaction was independently verified
FINAL with all receipts successful. Browser origin is human-reported; chain
execution and state were independently queried.

Finalization paid 1 BELIEF to Dhruva's testnet account. The winning claims redeemed
10 BELIEF and 11 tUSD, including proposer liquidity released at finalization.
At final block 277648609, the wallet held 201 BELIEF and 100 tUSD. Vaults, PASS
claims and this proposal's collateral were zero; losing FAIL entries have no
redemption rights. No active proposal, reservation or pending transfer remained.
[Final accounting](../deployments/human-lifecycle-final-accounting.json) checks
unchanged contract hashes and physical token balances against all proposal and
market ledgers at that block. [Receipt index](../deployments/README.md) links the
individual records and the separate scripted proposal 0 lifecycle.

One participant demonstrates mechanics, not independent price discovery. Burn
and failure scenarios were tested in the sandbox, not claimed as human testnet runs.
All snapshots are dated evidence; balances can change after their recorded blocks.

## Browser, accessibility and dependency scope

[Public-site layout checks](../deployments/pages-live-layout.json) cover 320, 390,
768 and 1440 pixel widths, actual testnet reads, keyboard focus, labels, button
heights, selected text contrasts, reduced motion and text enlargement. No runtime
errors or horizontal overflow were observed. This is not a full WCAG audit.

[Dependency review](DEPENDENCY_REVIEW.md) records the decoder remediation and
remaining low findings. Audit thresholds are enforced in frontend CI; successful
wallet tests are functional evidence, not a security audit.

## Receipt links

| Step | Scripted proposal 0 (UI #1) | Human proposal 1 (UI #2) |
| --- | --- | --- |
| Creation | [Receipt](https://testnet.nearblocks.io/txns/AjTd8yQD2e1uD1JCL5C1cgTMhszoMBT8QYtuZywGioPk) | [Receipt](https://testnet.nearblocks.io/txns/Eu9ct9fyWRQSp8UQShtwohBs7eESaQHB6AJPEnsNDfMy) |
| Trade | [Receipt](https://testnet.nearblocks.io/txns/FJBJBYoRBUeqwJYvjBau627sX9Zf66AtAq4UZ2QTLjvp) | [Split and trade](https://testnet.nearblocks.io/txns/8g9nAz7tzwa7PQGzzkLxcxMMk51y3CR2xq1hww4izyns) |
| Finalization and payment | [Receipt](https://testnet.nearblocks.io/txns/6phUWCoGJQP7dJH78KMks5jgRXf4d41XfPHkZLcKmWJ4) | [Receipt](https://testnet.nearblocks.io/txns/AiPEh5GpbvWsWdCeUq1F5NtEGHXuv1jhG8xjkbeNzRuT) |
| BELIEF redemption | [Receipt](https://testnet.nearblocks.io/txns/C631mAq4uxCkGn8cgTjGT714cyL9YCiKDx8VErEaX9NC) | [Receipt](https://testnet.nearblocks.io/txns/2hghAnS9jDJAk1LH8cY5Jp2J3JE9EfLu2XzSeB9ft8WC) |
| tUSD redemption | [Receipt](https://testnet.nearblocks.io/txns/6sJJ1wHjpPEUcqTUeUwdR2JotoMfcbodLjqSDwwMdS5x) | [Receipt](https://testnet.nearblocks.io/txns/5K9Gt9RusFptBANh281dmtsAj7iSPyurTZubvzF9rJaj) |

## Technical detail

The AMM uses constant product with a 0.30% fee and checked U256 intermediates.
The oracle integrates the previous recorded reserve price before every reserve
change over a fixed 600-second interval. No-trade periods carry forward that
known price. Finalization uses interval averages, not displayed spot prices;
the deployed proposal view does not expose numerical averages.

Payment caps, the 1% available-treasury burn and its 15-minute cooldown are
specified in [DESIGN](../DESIGN.md). Available treasury, reservations, vaults,
proposal collateral and outgoing transfers have separate ledgers. Private
callbacks restore failed asynchronous transfers once. Execution failure restores
the action budget without changing the selected outcome. See [ACCOUNTING](ACCOUNTING.md)
and [ORACLE](ORACLE.md) for equations, assumptions and manipulation fixtures.

Both faucets redistribute finite reserves; they do not mint tokens. Repeated
calls can drain the allocations, and no per-person Sybil resistance is provided.
The [post-decoder-fix faucet repeat](../deployments/human-wallet-post-fix.json)
is a separate FINAL transaction with four successful receipts, not evidence for
proposal settlement. Historical audit results and regression scope are in
[DEPENDENCY_REVIEW](DEPENDENCY_REVIEW.md). The remediation audit found 15 low
and zero moderate/high/critical findings; eval/util and chunk-size build warnings
remain. Audit results describe their recorded date, not all future dependencies.

## Editorial screenshots (2026-11-14)

[README screenshot](img/app.png) and the frontend's `public/social.png` were
captured from the real public app with no wallet connection or transaction.
The README capture shows both executed proposals and the settled human payment.
The social capture is 1200×630 pixels and retains the existing dark/lime appearance.
They are illustrations of the observed app, not replacement transaction evidence.

## Editorial pass checks (2026-11-14)

Newly run checks for the README, header accessibility and metadata update:
8 unit/compatibility tests, 14 production browser tests, 14 development browser
tests and 4 Pages-path tests passed. Root and Pages builds include TypeScript
checking. A dev-suite attempt initially stopped because the production runner
still occupied port 4317; the sequential rerun passed without changing tests.

Read-only local production checks at 1440px and 375px used actual testnet RPC,
opened both executed proposals, checked the single home-link accessible name,
metadata and overflow, and observed no runtime or console errors. The social PNG
returned HTTP 200 at 1200×630. Audit remained 15 low, zero moderate/high/critical.
Documentation paths, removed references, exact MIT terms and staged-secret checks
passed. Contract source and historical JSON evidence were unchanged; contract
unit/sandbox results for this pass come from required CI rather than a new local run.

The initial Pages asset report above describes the earlier deployment. The
editorial publication must be matched to its own workflow run and source commit;
see GitHub Actions and the final release notes for that publication's live checks.

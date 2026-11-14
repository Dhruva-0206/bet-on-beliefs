# Verification and evidence

The public app is https://dhruva-0206.github.io/bet-on-beliefs/. Its deployed
frontend source is `bac97ce36bda26c9eebaf77dadc38b3f97b693c9`;
subsequent documentation commits do not automatically republish it.
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
in [DEVELOPMENT](DEVELOPMENT.md) and [README](../README.md#architecture-and-reproduction).
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

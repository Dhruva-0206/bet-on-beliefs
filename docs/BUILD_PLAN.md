# Build plan and acceptance gates

Deadline: 2026-11-14 23:59 UTC (15 November 05:29 IST). Rebase estimates on actual start time; do not claim the original November 12 phases are complete.

1. Linux setup: inspect toolchain, verify current official NEAR SDK/build guidance, install necessary tools, pin versions and commit lockfiles. Verify exact commands with --help. Do not compile NEAR sandbox on Windows.
2. Token contracts: use near-contract-standards NEP-141; implement finite BELIEF faucet distribution, holder burn, and capped tUSD faucet. Test storage registration, supply and authorization.
3. Pure math and state: checked U256 arithmetic, AMM, oracle specification/tests, split/merge accounting, reservations and single-proposal lifecycle. Decide stale-data policy before coding oracle.
4. Integration: near-workspaces on Linux; deploy all three contracts; exercise successful and failed execution, split/merge, redemption failure recovery, repeated calls, ritual limits and all accounting invariants.
5. Demonstration: idempotent deploy/setup scripts and full lifecycle script with explorer links. Never overwrite an existing account's code without checking ownership, state and intended deployment.
6. Frontend: Vite/React/TypeScript, testnet wallet selector, read-only browsing, faucets, trade form with minimum output, four conditional balances, treasury reservations, countdown, finalize/redeem and transaction evidence. Integrate only wallets verified to work on testnet. Never show fixture data as live chain data.
7. CI and delivery: Ubuntu contract unit/integration tests and frontend build, hosted app after user hosting approval, README proof, 60–90 second demo script, final submission checklist. Keep Builders First cross-disclosure. Never publish or submit automatically.

Original contract freeze: 2026-11-13 18:00 UTC (23:30 IST). If missed or if later contract changes are necessary, present a concrete revised freeze/exception for human approval. Never silently override it.

Cut AI traders, cron automation, NEP-245 compatibility views and advanced charting first. Do not cut settlement correctness, failed-transfer tests, manipulation tests or reproducible demo.

## Handoff status

Updated 2026-11-13: the interrupted checkpoint was completed and remotely verified as `69ddccd243191336c76714cc7988dec584b7a7e3`. All three checkpoint CI workflows passed. Prior local evidence remains: 35 unit tests, one four-proposal sandbox scenario, three optimized Wasm builds, frontend precision/build checks and eight browser checks.

The human approved `bob-dhruva` (fallback `bob-dhruva-26` only if taken). All six first-choice accounts were available and created on testnet; all three tested contract hashes are deployed. A real ten-minute proposal selected PASS, executed a one-BELIEF payment, and completed both trader redemptions. Fixed-block ledger verification and live desktop/mobile frontend reads passed before and after settlement. Tooling TLS and RPC connectivity issues were resolved without contract changes. Setup idempotence was verified on testnet. See `deployments/README.md` and `docs/HANDOFF.md`.

Interactive human MyNearWallet signing and public hosting remain pending. Private Codespace preview only; no settings/visibility changes, social posts, submission or key deletion. AGENTS.md and credentials remain ignored. Original contract freeze and deadline above still apply.

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

Updated 2026-11-12: all three contracts are implemented, with 35 passing unit tests and one passing near-workspaces sandbox scenario spanning four proposal lifecycles. All three optimized Wasm builds pass. The wallet frontend builds, passes precision tests and eight desktop/mobile browser checks. Deployment/demo tooling compiles; its help and local plan mode have been checked. Real deployment/setup and signed-wallet execution have not run.

Gitignored AGENTS.md contains the working rules and is not committed. No testnet accounts exist: the human's account prefix has been requested and remains required before creation. No keys removed, hosted app, visibility/settings change, social post or submission. CI now defines actual unit/integration/frontend checks, but local results are the evidence reported here; remote CI success is not asserted.

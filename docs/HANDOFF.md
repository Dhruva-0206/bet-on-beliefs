# Bet on Beliefs checkpoint

Implementation paused at the human's request on 2026-11-12 UTC. Do not resume
implementation, builds, tests, account creation or deployment until asked.
Repository: Dhruva-0206/bet-on-beliefs. Existing branch: `main`.
The checkpoint is the commit containing this file; obtain its hash with
`git log -1 --format=%H`. Previous pushed milestones: `44abbcf` (tokens/math),
`f175119` (markets/settlement), `5a5c52d` (wallet frontend).

## Completed implementation

- BELIEF and tUSD use NEAR standards 5.30.1, 18 decimals, finite prefunded
  faucets, storage registration and holder burns. BELIEF allocation is
  60% treasury / 20% proposer / 20% faucet. All constructors are self-only.
- Checked U256 AMM/oracle math; 30 bps swaps and explicit minimum output.
  Oracle integrates the previous recorded reserve price over the fixed full
  600-second interval, caps at its end, and uses a strict 3% PASS threshold.
  Exact carry-forward is justified by integration before every reserve change.
  Tests demonstrate sustained and extreme short manipulation can still pass.
- One active/executing proposal; capped payments; 1% burn ritual with a
  15-minute cooldown; reserved action funds; separate vault, collateral,
  treasury and outgoing ledgers; paired split/merge and winning redemption.
- Unique outgoing operation IDs and private callbacks restore failed transfers
  once, including failed merge/redemption and out-of-order callbacks. Execution
  failure restores treasury without changing the selected outcome.
- Explicit storage/user/proposal/pending-operation bounds and retained native
  fees; bootstrap accounts for the initial BELIEF treasury balance.
- Vite/React/TypeScript wallet UI reads actual testnet RPC, supports MyNearWallet,
  faucets, vault funding/withdrawals, four claim balances, minimum-output trades,
  proposal/ritual creation, finalization/redemption and explorer links. Empty
  configuration has no fixture chain data. No hosting is configured.
- Pinned toolchains/dependencies and lockfiles; Linux build/install scripts;
  near-workspaces integration suite; testnet deployment/demo CLI; CI definitions;
  accounting argument, artifact hashes and recording/handoff documentation.

## Exact validation already completed (not rerun during checkpoint)

| Command / gate | Observed result |
| --- | --- |
| `bash scripts/setup-dev.sh` | Passed after initial Git configuration permission boundary was approved; hooks configured |
| `cargo test --workspace --exclude integration-tests --locked` | 35 passed, 0 failed: BELIEF 5, futarchy 14, market-math 11, tUSD 5; final run includes self-only constructors |
| `bash scripts/build-contracts.sh` | All 3 optimized Wasm builds passed with cargo-near 0.21.0 and Rust 1.95.0; final hashes in `docs/BUILD_HASHES.json` |
| `cargo test -p integration-tests --test lifecycle --locked -- --nocapture` | Final run: 1 passed, 0 failed, 138.12 seconds; one scenario covering 4 proposal lifecycles against final rebuilt binaries |
| Sandbox coverage | Actual FT backing, failed execution/merge/redemption restoration, successful payment/burn, no-trade rejection, slippage, forged inflows, private callbacks, unauthorized first initialization, repeated calls |
| `npm run build --prefix web` | Type check and production build passed |
| `npm run test --prefix web` | Precision/quote test file passed; Node reporter: 1 test file passed, 0 failed |
| `npm run test:browser --prefix web` | Final run: 8 passed, 0 failed, 15.3 seconds; desktop/mobile empty/error states and production testnet wallet-adapter initialization |
| `cargo build -p integration-tests --bin testnet --locked` | Passed after changing demo wait to actual chain timestamps |
| CLI inspection | Cargo build/test, cargo-near Wasm build, Vite, Playwright and `testnet --help` checked; local-only `testnet plan local-check` passed, creating no accounts or keys |
| Formatting / shell syntax | `cargo fmt --all -- --check`, shell syntax checks for setup/install/build scripts, and `git diff --check` passed before pause |

The first sandbox attempt failed because the harness assumed 1,000 blocks meant
sufficient elapsed time. The harness now checks actual block timestamps. A
corrected run passed in 243.30 seconds; the final run with constructor-hardening
checks passed in 138.12 seconds. Initial CLI/browser installations also needed
Linux libraries; those environment issues were resolved. Do not confuse these
historical failures with unreported successful gates.

Tool versions: Rust/Cargo 1.95.0, SDK/standards 5.30.1, near-workspaces 0.24.0,
near-sandbox crate 0.4.1 / binary 2.14.1, cargo-near 0.21.0, Node 24.22.2,
npm 11.19.1. The CLI reports 0.23.0 available; 0.21.0 is intentionally the tested
pin. These are host Wasm builds, not a Docker reproducibility claim.

## Deployment, accounts and remaining issues

- **Pending human decision: testnet account prefix.** It was requested but not
  supplied. Ask for it before any account creation. Do not infer one from the
  local plan's `local-check` example.
- No testnet accounts, keys, deployments or testnet transactions were created.
  No submitted testnet transaction awaits settlement. Submitted local sandbox
  transactions completed as part of the passing scenario.
- The deployment tool is compiled and its help/plan checked, but its actual
  testnet creation, funding, setup and demo paths have not been executed.
  It plans six accounts: market, belief, tusd, proposer, trader and recipient.
- Live human-wallet signing, redirect evidence and the actual deployed frontend
  lifecycle remain unverified. Browser adapter initialization is narrower proof.
- npm audit reported 11 low-severity findings through the wallet crypto stack's
  elliptic dependency; no moderate/high/critical findings. Vite reports wallet
  dependency eval/util warnings. See `docs/FRONTEND.md`; no forced downgrade was
  applied. Tests are not an audit or manipulation-resistance proof.
- Demo recovery has a documented creation-to-progress-file crash window. If
  interrupted there, inspect the existing proposal rather than create another.
  If resumed after its window before trading, inspect state: the script may
  attempt a now-closed split/trade and stop. This path is not testnet-validated.
- Remote CI results have not been verified. The checkpoint push may trigger
  automatic GitHub workflows; no manual CI/build/test run is requested here.
- No settings/visibility changes, hosting, social posts, submissions or key
  removals occurred. README retains honest AI assistance and Builders First
  disclosures. AI traders, cron and extra tracks remain outside the MVP.

## Processes and intentionally local files

At pause, process inspection found no running Cargo, rustc, near-sandbox,
Vite, Playwright, Chrome, lifecycle test or testnet CLI process. No local process
needs resuming or terminating. No new build/test/deployment was launched to make
this checkpoint.

Intentionally ignored and untracked: `AGENTS.md`, `artifacts/`, `target/`,
`web/dist/`, `web/node_modules/`, `web/test-results/`. Credential directories,
`.env` and `.env.*` (except example files) must stay ignored if later created.
Dependency manifests and lockfiles are project source and are committed;
installed dependencies and caches are not. Never put secret values in this file.

## Precise next steps after the human resumes

1. Read `README.md`, `DESIGN.md`, `docs/BUILD_PLAN.md`, this handoff and the
   gitignored `AGENTS.md`; inspect Git status and confirm the checkpoint commit.
2. Check UTC time. Original contract freeze is **2026-11-13 18:00 UTC**.
   Request a concrete exception before any contract change after it. Deadline:
   **2026-11-14 23:59 UTC**. Never silently override either boundary.
3. Obtain the human's testnet prefix. Review `docs/DEVELOPMENT.md` and the CLI
   source. If artifacts are unavailable or source changed, rebuild and run the
   affected local gates only after work has explicitly resumed.
4. Run `cargo run -p integration-tests --bin testnet --locked -- plan PREFIX`
   with the actual chosen prefix. Inspect proposed accounts and hashes.
5. With account creation authorized by that decision, run the same CLI with
   `deploy PREFIX`. Verify helper funding, account ownership, state, hashes and
   configuration. Never overwrite different existing code or remove keys.
6. Run `demo PREFIX`, recording actual explorer links and the outcome/execution
   distinction. Confirm physical accounting and the selected claim redemption.
7. Point the local frontend at the verified market, exercise actual testnet
   wallet signing and the complete lifecycle, then update honest evidence.
8. Review staged diffs and push normal milestones with hooks enabled. Re-read
   live official hackathon rules before preparing final submission materials.
   Hosting, visibility changes, posting, key deletion and submission each still
   require explicit human approval. Do not perform them automatically.

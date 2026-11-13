# Bet on Beliefs handoff — 2026-11-13

The human resumed work and approved testnet prefix `bob-dhruva`, with
`bob-dhruva-26` only if taken. The first choice was available. The interrupted
checkpoint was committed and pushed with hooks as
`69ddccd243191336c76714cc7988dec584b7a7e3`, then verified on origin/main.
No work was discarded. Earlier milestones: `44abbcf`, `f175119`, `5a5c52d`.

All three contracts are now deployed on testnet with the same tested Wasm hashes.
Proposal `0` completed its real ten-minute interval, selected PASS, executed a
one-BELIEF payment and completed both trader redemptions. The active lock,
reserved funds and outgoing obligations are cleared. No contract source changed
during this resumed session. Interactive human wallet signing and public hosting
remain pending; neither is claimed complete.

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

## Validation and evidence

Prior passed gates were retained rather than repeated without cause:

- `cargo test --workspace --exclude integration-tests --locked`: 35 passed,
  zero failed (BELIEF 5, futarchy 14, math/oracle 11, tUSD 5).
- `bash scripts/build-contracts.sh`: three optimized Wasm builds passed.
  Deployed hashes match `docs/BUILD_HASHES.json`; no contract rebuild was needed.
- `cargo test -p integration-tests --test lifecycle --locked -- --nocapture`:
  one scenario, four proposals, passed in 138.12 seconds. Covers failed execution,
  merge/redemption, successful payment/burn, authorization and physical backing.
- Previous precision/quote test file passed; unchanged and not rerun.
- The checkpoint's three GitHub workflows all passed. See
  `deployments/checkpoint-ci.json`; later commits have their own CI runs.

New verification after deployment/tooling changes:

- Deployment CLI rebuilt successfully with `--locked`, including HTTPS/TLS.
- Full testnet setup succeeded, then reran without accounts/code replacement or
  transactions, proving the setup path's idempotence on this deployment.
- Actual scripted lifecycle: proposal/create, split, trade, 600-second wait,
  finalization/payment and two winning redemptions succeeded. The local wait
  process exited with SIGTERM, but its saved proposal ID resumed without
  duplicating split/trade. No submitted transaction was abandoned.
- Finalization and both redemptions independently queried by RPC: `FINAL`,
  successful values, six receipts each, zero failed receipts.
- `python3 scripts/verify-testnet.py deployments/testnet-bob-dhruva.json` passed
  for pre-demo, trading and settled states. It pins all queries to one final
  block, verifies code/metadata, backing, single active locking and reserve
  release. Settled report also records one full-access key on each contract.
- Frontend type check/production build passed after RPC/display changes.
- Eight browser regression checks passed after changing the read RPC (20.3s).
  Later signed-out balance display correction was checked in the live UI.
- `node scripts/verify-live.mjs bob-dhruva-market.testnet` passed desktop/mobile
  actual-chain reads in both trading and executed states: no runtime errors or
  horizontal overflow; unknown signed-out wallet balances show dashes.
  Wallet signing is explicitly false in these reports.
- Rust formatting, shell syntax (previous checkpoint), CLI help and diff checks
  passed. No unrelated contract checks were rerun.

Public evidence and exact transaction links: `deployments/README.md`.
Final snapshot: `deployments/verification-settled.json`, block 277479415,
2026-11-13 07:28 UTC. Public state may change after that snapshot.

## Deployment and keys

| Role | Testnet account |
| --- | --- |
| Market | bob-dhruva-market.testnet |
| BELIEF | bob-dhruva-belief.testnet |
| tUSD | bob-dhruva-tusd.testnet |
| Proposer | bob-dhruva-proposer.testnet |
| Scripted trader | bob-dhruva-trader.testnet |
| Recipient | bob-dhruva-recipient.testnet |

Do not treat these now-existing owned accounts as a prefix collision and create
fallback duplicates. Reuse the ownership credentials and verify state/hashes.
Six OS-random deployment credentials are in ignored `.near-credentials/testnet`,
files mode 0600 and directory mode 0700. Never print, commit or upload keys.
All keys remain; no immutability/keyless claim. There is no mainnet path.

The tool initially lacked a near-workspaces TLS feature. `rustls` was enabled
alongside `install`; that changed tooling dependencies only. The first attempt
saved one key but made no account. Subsequent setup deployed successfully, then
hit the original public RPC's rate limit during storage registration. Tooling
and frontend reads now use the officially listed FASTNEAR testnet endpoint,
`https://test.rpc.fastnear.com`, independently checked as testnet/protocol 88.
Setup resumed with existing keys; no code was overwritten.

## Remaining issues and human boundaries

- Interactive human MyNearWallet signing/redirect validation remains unverified.
  An async request asked the human to load the private preview, connect their
  own testnet wallet and approve a faucet/storage-registration transaction.
  Verify any supplied public transaction hash; never request keys/seed phrases.
- Public Sites hosting was offered as an explicit approval choice. No approval
  has been received and no hosting changes or publishing were performed.
- No repository visibility/settings change, social post, submission or key
  deletion. README retains AI assistance and Builders First disclosures.
- Demo creation-to-progress-file crash window remains documented. Inspect an
  existing active proposal and recover its ID rather than create another.
  The tool now skips split/trade after the window closes when resuming.
- npm audit: 11 low-severity wallet crypto findings, no moderate/high/critical;
  Vite dependency eval/util warnings remain. See docs/FRONTEND.md.
- Faucet/scripted markets demonstrate mechanics, not economic reliability.
  Burn and failure paths are sandbox evidence, not claimed as testnet runs.

## Processes and local-only files

A production preview serves port 5173 in this Codespace (private visibility was
read back with `gh codespace ports`). No public-hosting configuration changed.
Use the Codespace Ports tab; load `bob-dhruva-market.testnet` in the app.
The preview may need restarting if the execution server stops its processes:
`npm run preview --prefix web -- --host 0.0.0.0 --port 5173`.
The demo finished; there are no pending testnet outgoing operations or CLI
transactions. No Cargo build/test needs resuming. Inspect process state before
starting another preview; avoid duplicate listeners.

Ignored/untracked: `AGENTS.md`, `.near-credentials/`, `artifacts/`, `target/`,
`web/dist/`, `web/node_modules/`, `web/test-results/`. Any .env files must remain
ignored. Public deployment JSON contains only addresses/hashes/chain data.
Manifests and lockfiles are source and remain tracked.

## Precise next steps

1. Read AGENTS.md, README.md, DESIGN.md, docs/BUILD_PLAN.md and this handoff;
   inspect status, pending human responses and the latest remote commit.
2. Check UTC. Contract freeze is **2026-11-13 18:00 UTC**. Ask for a concrete
   exception before contract changes after that time. Deadline remains
   **2026-11-14 23:59 UTC**. Existing tested deployment needs no code change.
3. Complete human-wallet signing validation if the human is available. Check
   the public receipt and resulting actual chain/UI state; do not substitute a
   mocked wallet for this acceptance gate.
4. Act on public hosting only after explicit approval. The built app and live
   testnet evidence are reviewable already. Preserve all key/privacy boundaries.
5. If new implementation changes are necessary, rerun only affected checks,
   inspect staged diffs and commit/push normally with hooks; never force-push.
6. Human records the real demo. Re-read live official rules before final
   submission materials. Posting, submission, key deletion and settings changes
   still require explicit approval; do not perform them automatically.

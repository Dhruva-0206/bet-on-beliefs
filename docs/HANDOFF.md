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
during this resumed session. Human Meteor signing is now verified for both faucets; public hosting remains
pending. Historical pending statements below describe earlier checkpoints.

## Post-fix human wallet validation — 2026-11-14

The human repeated Meteor BELIEF faucet signing on the dependency-fixed frontend
commit `879722345e0441b00c7cea83199ea82090f062f9`. Transaction
`3STrYWC6Pcc8obHHHaKM3raBGn1YqqNjEHnk455ftBSL` is FINAL and successful:
four receipts, all successful, no failures. Receiver is the BELIEF contract;
expected storage/faucet actions and the 100 BELIEF transfer event were verified.
At final block 277638099, dhruva.testnet holds 200 BELIEF and 100 tUSD,
with both vaults zero, matching the human UI. Public evidence:
`deployments/human-wallet-post-fix.json`. This closes the repeat human faucet
signing gate after the decoder fix; broader human market walkthrough remains.
All three workflows for 8797223 passed, independently confirmed in the preceding
session. No contracts changed or redeployed; no keys were accessed/deleted.

Next: prepare GitHub Pages configuration and proposed project URL for review.
Do not enable Pages, dispatch deployment, or publish without explicit approval.
Keep the private preview available. Preserve a full real-app walkthrough and
wording/design refinement before recording the final demo; neither is completed
by faucet signing alone. Contract freeze has passed; no contract change is
needed for hosting preparation.

## Decoder remediation — latest

Scoped query-string 10.0.0 override for Meteor SDK; adapter/SDK versions remain
10.1.4/1.0.24. The guarded Vite transform adapts the named stringify import to
the new default API in both dev optimization and production. decode-uri-component
is absent from the lockfile; no forced downgrade or node_modules patch.

Clean npm ci, 4 unit/compatibility tests (including four legacy-encoding fixtures
and two bounded malformed-input payloads), production build, 10 production
browser checks (12.8s), 10 dev checks (16.6s), then 2 production popup follow-up
checks (5.7s) for the new return-URL assertions passed. Real adapter faucet
serialization reaches a synthetic Meteor signing boundary and cancels, with no
signatures/broadcasts. Popup query parameters are also checked. Contract source,
deployment accounts/credentials and human wallet keys were untouched. No
contract tests were repeated for this frontend dependency change.

Audit now has 15 low/0 moderate/0 high/0 critical. Full audit exit 1 reflects
residual low elliptic-chain findings; the moderate-or-higher gate exits 0 and is
required by CI. Historical four-high snapshot remains preserved. Details:
`docs/DEPENDENCY_REVIEW.md`, `deployments/dependency-audit-remediated.json`.
The existing real human faucet test remains valid historical evidence; no new
human signature is claimed against this transitive update. Recommend a human
hard-refresh/faucet retry when available. Keep hosting private; no publication
approval has been given.

Preview restarted with strict 0.0.0.0:5173, single listener PID 47412, log
/tmp/bob-preview-5173.log. Local HTTP and authenticated forwarded HTTPS returned
200; port visibility read back private. Read-only live desktop/mobile checks
passed again; no transactions were signed. See
`deployments/frontend-live-decoder-remediated.json`.

## Human wallet validation and audit review — latest

`dhruva.testnet` successfully connected and signed both storage/faucet calls in
Meteor. The human reports 100 BELIEF, 100 tUSD and both vaults zero. Independently
queried both hashes with `wait_until: FINAL`: both successful, four receipts each,
zero failed receipts. Each has expected `storage_deposit`/`faucet` actions and a
NEP-141 transfer event for 100 tokens to the human. Public evidence:
`deployments/human-wallet-validation.json`. tUSD hash:
`91R8LZJUJ5oWVECiwMCyeaZW4c1Gg5dTFqhq4YJKUVqT`; BELIEF hash:
`DdhHSPEXCuSLVzAJQtke2WMvANBn7QbnGzaQHKQayQhU`.

At final block 277495974 (`2rZsLdSVA16nj17bUNTtvoDzf4SQJe8co6KfZYbphCRS`),
both token balances equal 100 * 10^18 and vaults are [0,0], matching the human UI.
The market account is not registered yet, as expected for token faucets alone.
This completes real human connection/faucet signing validation, not all market
wallet flows. No human keys were accessed, and no transactions were signed or
submitted by the agent in this verification turn.

`npm audit` still reports 13 low/4 high (exit 1). All four high package findings
propagate through decoder 0.2.2/query-string 7.1.3/Meteor SDK/adapter. Reviewed
both maintainer advisories, actual installed source and production bundle.
SDK's inspected popup path uses stringify rather than parsing; vulnerable code
is nevertheless bundled, and complete unreachability is not proven. Patched
0.5.1 is ESM versus the old CJS loader; npm's suggested adapter 6.0.1 rollback is
not a safe automatic fix. See `docs/DEPENDENCY_REVIEW.md` and public audit JSON.
Recommendation: retain private preview until a compatible remediation is tested.
No dependency changes were made. Runtime checks were not repeated for these
record-only changes. All three CI workflows for the preceding Buffer repair
`275b3280d38351e2885ac7b7fe1f0984688a026e` now passed (frontend, scaffold,
contract unit/sandbox).

## Faucet Buffer repair (2026-11-13)

The human reached the connected wallet but faucet construction threw
`ReferenceError: Buffer is not defined`. A Chromium debugger reproduced the
old production failure. The throwing frame is `stringifyJsonOrBytes` in
`@near-js/transactions/lib/esm/action_creators.js:47`, called by functionCall
from the app's transact action construction. Meteor SDK base64 encoding has a
second free Buffer use. The prior alias fixed module imports, not the global.

New `web/src/bootstrap.ts` installs browser Buffer/process before a dynamic main
import. A process shim also fixes a dev-only missing-global failure. The SDK
key-log guard now runs during Vite dependency optimization as well as production;
SDK CommonJS dependencies remain optimized. No contracts, deployment credentials
or human wallet keys were touched. No real transactions were signed/submitted.

Validation: production type check/build passed; 10 development browser checks
passed (15.7s), then 10 production browser checks passed (18.3s). The new test
clicks BELIEF and tUSD faucets after a synthetic Meteor login, carries the real
adapter through transaction serialization to an intercepted extension signing
request, asserts its decoded payload, and cancels. All RPC is intercepted and
broadcasting is forbidden. Before the fix it failed before reaching signing.
CI now covers both modes. This closes the construction regression, not the
remaining human-signing acceptance gate. Prior contract tests were not repeated.

Preview restarted: single listener PID 33360, strict 0.0.0.0:5173; local and
authenticated forwarded HTTPS both returned 200 with app HTML. Visibility remains
private. Log: /tmp/bob-preview-5173.log. Hard-refresh and retry the faucets with
Meteor's `dhruva.testnet`. Verify human-provided hashes and refreshed balances
before marking real signing complete. Four high dependency findings remain as
previously documented. No public hosting approval has been given.

## Human wallet funding (2026-11-13 09:54 UTC)

The human created `dhruva.testnet` in Meteor. RPC verified it exists on testnet
with zero native balance; connection approval reported a cost of
0.0002313048375 NEAR. With explicit human authorization, transferred exactly
1 testnet NEAR from existing `bob-dhruva-proposer.testnet` to `dhruva.testnet`.
Transaction `CGn618uA6Fo2ESTyAjXV7GJWu4whjyFKDGt5kvLQcgEy` is FINAL and
successful, with zero failed receipts. Final observed balance: 1 NEAR at block
277494340. Public evidence: `deployments/human-wallet-funding.json`.
No human wallet keys were accessed/requested. Existing deployment credentials,
contracts and accounts were retained. Human should retry Meteor connection,
then claim BELIEF/tUSD faucets and supply public hashes/displayed balances for
verification. Funding alone does not validate human wallet signing.

## Latest wallet repair (2026-11-13)

All three CI workflows for `2672138fbe2e8b17a542cc3f1d1915a5c01f1d0c`
passed. The human reported MyNearWallet no longer accepts app connections.
The connector is replaced by pinned Meteor Wallet 10.1.4 (SDK 1.0.24), whose
current official documentation and SDK explicitly support testnet. The user
already has Meteor on mainnet and must create a separate testnet account inside
the wallet. No accounts were migrated or created by the agent, and no contract,
deployment or deployment credential changed. See docs/FRONTEND.md for exact steps,
upstream issue #40 and the Codespace Cloudflare limitation.

Browser compatibility fixes supply Buffer/globalThis. A guarded build transform
removes the SDK's generated-access-key debug statement; nanoid is pinned to a
patched same-major version. Four high dependency findings remain in the decoder
chain; do not describe this as a clean dependency audit. Real human signing is
still pending, followed by the explicit hosting-approval boundary.

Affected verification passed: production type check/build; 2 precision/quote
unit tests; all 8 desktop/mobile browser checks (11.7s); then 2 targeted Meteor
checks (6.4s) after adding the key-log regression assertion. The production UI
opens Meteor's testnet login route without a real signature. Live read-only QA
passed again on desktop/mobile against the existing deployment. No contract
tests were repeated because no contract/deployment files changed.

The stopped preview caused the earlier 502. It was restarted with strict port
selection; current listener PID 16522 binds 0.0.0.0:5173. Local HTTP and an
authenticated request to the forwarded HTTPS URL both returned 200 with app HTML.
Port visibility remains private. Runtime log: /tmp/bob-preview-5173.log. No
visibility or hosting changes were made. Read process state again after any
execution-server restart. The wallet website itself was Cloudflare-blocked from
this Codespace; human signing/account-creation UI remains unverified.


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
- Vite/React/TypeScript wallet UI reads actual testnet RPC, supports Meteor Wallet,
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

- Human Meteor connection and both faucet signatures passed with verified receipts.
  Other market operations have scripted/sandbox evidence, not human signing QA.
- Public Sites hosting was offered as an explicit approval choice. No approval
  has been received and no hosting changes or publishing were performed.
- No repository visibility/settings change, social post, submission or key
  deletion. README retains AI assistance and Builders First disclosures.
- Demo creation-to-progress-file crash window remains documented. Inspect an
  existing active proposal and recover its ID rather than create another.
  The tool now skips split/trade after the window closes when resuming.
- npm audit after remediation: 15 low and zero moderate/high/critical findings;
  Vite dependency eval/util warnings remain. See docs/FRONTEND.md.
- Faucet/scripted markets demonstrate mechanics, not economic reliability.
  Burn and failure paths are sandbox evidence, not claimed as testnet runs.

## Processes and local-only files

A production preview serves port 5173 in this Codespace (private visibility was
read back with `gh codespace ports`). No public-hosting configuration changed.
Use the Codespace Ports tab; load `bob-dhruva-market.testnet` in the app.
The preview may need restarting if the execution server stops its processes:
`npm run preview --prefix web` (strict 0.0.0.0:5173).
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
3. Decoder remediation and synthetic compatibility checks are complete. Preserve
   human faucet receipts; offer a hard-refresh/human faucet retry for the updated
   serializer. Keep remaining low findings visible in docs/DEPENDENCY_REVIEW.md.
4. Act on public hosting only after explicit approval. The built app and live
   testnet evidence are reviewable already. Preserve all key/privacy boundaries.
5. If new implementation changes are necessary, rerun only affected checks,
   inspect staged diffs and commit/push normally with hooks; never force-push.
6. Human records the real demo. Re-read live official rules before final
   submission materials. Posting, submission, key deletion and settings changes
   still require explicit approval; do not perform them automatically.

# Bet on Beliefs handoff (2026-11-14 release)

Creator and lead: DHRUVA SOMEN CHAKRABARTY. Dhruva conceived and directed the
project, orchestrated the AI-assisted implementation/debugging, made product
decisions and performed the documented wallet signatures. Codex assisted with
coding, tests and documentation. Builders First is independently implemented;
its demo video remains pending according to Dhruva. Do not modify that repo.

## Current release status

The creator explicitly approved enabling GitHub Pages and publishing the refined
static frontend at https://dhruva-0206.github.io/bet-on-beliefs/ after verification.
No further generic hosting approval is required for that specific release.
The refinement is ready for CI; publication and public-origin acceptance will be
recorded below only when verified. The Codespace preview remains private.

## Completed refinement

- Default deployed market; Advanced contract switching; shorter hero; direct
  navigation; distinct treasury, wallet and vault labels; compact setup path
  with completion/next states and separate token/market/claim registration fees.
- Meteor/testnet and browser bootstrap/compatibility adapter preserved. Receipt
  confirmation checks every final receipt. Approval, submitted, pending,
  confirmed, cancelled and failed states are separate. Unverified submitted
  hashes persist in session storage and block duplicate sending until checked.
- Settled proposals prioritize outcome, execution evidence and redemption.
  Strict decision formula is PASS average > FAIL average × 1.03. The deployed
  view does not expose recorded averages; the UI discloses that gap.
- Creator credits, README structure, exact MIT copyright replacement, maintained
  prose cleanup, design rationale and demo/description revised. Prior handoff is
  preserved verbatim in history/HANDOFF_pre_release_2026-11-14.md.

## Verification

Local: type check and root/Pages production builds passed; 8 frontend unit and
compatibility tests passed; 14 production browser checks (21.5s), 14 dev checks
(24.7s), and 4 Pages-path checks (18.0s) passed. Synthetic tests cover real
adapter serialization into a mocked signing boundary, cancellation, verified
confirmation and saved-hash read-only recovery. No real signature was generated
by the agent. Existing contract checks were not repeated locally because no
contract source/code/configuration changed. Latest CI is a separate release gate.

Read-only visual/keyboard review covers 320, 390, 768 and 1440 pixels, focus,
labels, no horizontal overflow, 44px button heights, selected text contrasts,
reduced motion and root-text enlargement. It is not a full WCAG compliance audit.
Screenshots are local ignored test-results; public summary evidence is saved in
deployments/. Research references and rationale: REFINEMENT.md.

Current audit: 15 low, zero moderate/high/critical. Residual elliptic-chain low
findings and eval/util/large-chunk build warnings remain. DEPENDENCY_REVIEW.md
records the query-string 10 mitigation; no forced major downgrade was used.

## Existing chain and human evidence

Three testnet contracts at bob-dhruva-market/belief/tusd.testnet are unchanged;
use deployments/testnet-bob-dhruva.json for exact accounts and code hashes.
Proposal 0's scripted ten-minute lifecycle selected PASS, paid 1 BELIEF and
completed both trader redemptions. Physical backing was checked at fixed blocks.
This demonstrates mechanics, not independent price discovery or causal welfare.
35 Rust unit tests and one four-proposal sandbox scenario provide distinct
accounting, failure recovery and attack-fixture evidence. Full-access keys remain.

Private-origin Meteor tests by dhruva.testnet are recorded in
human-wallet-validation.json and human-wallet-post-fix.json under deployments/.
Post-fix hash 3STrYWC6Pcc8obHHHaKM3raBGn1YqqNjEHnk455ftBSL is FINAL, with
four successful receipts. Recorded balances: 200 BELIEF, 100 tUSD, vaults zero.
These faucet signatures do not establish the full human market lifecycle.

## Keys and processes

Credentials remain ignored in .near-credentials/testnet, mode 0600. Do not print,
commit, upload or delete them. AGENTS.md, .env files, node_modules, target,
artifacts, dist/dist-pages and browser output remain ignored. Public assets only
are eligible for Pages upload. Normal preview command: npm run preview --prefix
web (0.0.0.0:5173, strict). Log: /tmp/bob-preview-5173.log. Inspect the listener
before restarting; execution-server resets can stop it. No chain transaction is
pending from this work.

## Next steps and boundaries

1. Inspect status and latest CI. Publish the approved frontend only after gates
   pass, verify actual HTTPS/assets/testnet reads and desktop/mobile behavior.
2. Ask Dhruva to connect Meteor on the public origin. Read dhruva.testnet's
   market registration before selecting a useful single signature. Register once
   if still unregistered, rather than repeat a faucet merely for evidence.
3. Verify public FINAL receipt/all receipts and resulting market/balance state.
   Until then, public-origin signing remains pending. Never use wallet keys or
   substitute mocked signing for this acceptance step.
4. Full human lifecycle walkthrough and final recording remain separate gates.
   DELIVERY.md contains signature-by-signature guidance, a 60–90 second script
   around one real decision and an honest description draft. Refine further if
   the walkthrough exposes an issue; do not claim it already happened.
5. Contract freeze passed at 2026-11-13 18:00 UTC. Request a concrete exception
   before any contract source/deployed code/configuration change. Deadline:
   2026-11-14 23:59 UTC. Keep keys and no mainnet operations.
6. No X/social publishing, hackathon submission or key deletion is authorized.
   Re-read live rules before an exact submission payload; obtain missing personal
   fields, demo post and consent without guessing, and receive payload approval.

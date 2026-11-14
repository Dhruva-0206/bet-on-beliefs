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
Refinement commit 93e73b2cf3f9a5e0fca54885b97bbce22f8dffe0 passed all three
workflows. Checkpoint bac97ce36bda26c9eebaf77dadc38b3f97b693c9 also passed
frontend, scaffold and contract unit/sandbox CI.

The owner enabled Pages with Source=GitHub Actions and ran the approved workflow.
Run 43585261964 completed both build and deploy successfully, publishing source
bac97ce36bda26c9eebaf77dadc38b3f97b693c9. The approved URL returns HTTPS 200.
All nine public files match the downloaded Pages artifact by SHA-256; no private
files or secret-pattern hits were found. Evidence: deployments/pages-live-release.json.
Public read-only browser checks passed at 320, 390, 768 and 1440 pixels with actual
testnet reads, keyboard checks and text enlargement; see pages-live-layout.json.
Public-origin Meteor market registration is verified in
deployments/human-wallet-public-origin.json. Transaction
Et7qYrgZ2n1HcEYSF44iSGNDgCei8YiGAZ3751GX2B5Y is FINAL; both receipts
succeeded. Market registration is true, wallet balances are 200 BELIEF and
100 tUSD, and both vaults are zero. The preview remains private.
Earlier Codespace dispatch returned 403; the owner used GitHub's Actions UI.
Run 43585015306 built but skipped publication because its approval input was false.

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

1. Deployment and public read-only checks are complete. The deployed source's
   frontend, scaffold, contract and Pages workflows all passed. Future pushes do
   not automatically publish; the Pages workflow remains manual and gated.
2. Public-origin registration acceptance is complete. Origin is human-reported;
   FINAL execution, both receipts, registration and balances were independently
   read from testnet. No agent signed a transaction.
3. BELIEF vault deposit FeaeSEjXDK7GMpqPj2hwfme9oYE6XynPwfN3AP8JLhsX
   is FINAL with all six receipts successful. The transfer-call consumed all
   10 BELIEF (no token refund); final-block wallet/vault are 190/10 BELIEF and
   100/0 tUSD. Evidence: deployments/human-wallet-belief-deposit.json.
   tUSD deposit Ay5TKCyv1ofiBR7h8Luhr6UrE4QpgmcJ4JsgZmERcK1Q is also
   FINAL with all six receipts successful and all 10 tUSD accepted. Wallets are
   190 BELIEF/90 tUSD; vaults are 10/10. Evidence and same-block proposal
   preflight: deployments/human-wallet-tusd-deposit.json. dhruva.testnet is
   BELIEF-storage registered; available treasury is 599999999 BELIEF, reserved
   zero, payment cap 1000 BELIEF, no active proposal or pending operation.
   Proposal creation Eu9ct9fyWRQSp8UQShtwohBs7eESaQHB6AJPEnsNDfMy is
   FINAL, both receipts successful, proposal ID 1. Exact submitted description
   is preserved in deployments/human-wallet-proposal-creation.json. Both stakes
   were allocated, vaults zero, treasury reserved 1 BELIEF, active proposal 1.
   Proposer claims are automatically registered (confirmed true); no extra
   register_claims transaction is required. End: 2026-11-14 11:01:50.726 UTC.
   Trade funding 5w5U237rQgbe1JujBm3znbVCN9EzMufMs29vYDU6Y71p is FINAL,
   six successful receipts, 1 tUSD credited. PASS split/trade
   8g9nAz7tzwa7PQGzzkLxcxMMk51y3CR2xq1hww4izyns is FINAL, both receipts
   successful. Evidence: human-wallet-trade-funding.json and
   human-wallet-pass-trade.json under deployments/. Claims before settlement:
   PASS BELIEF 0.906610893880149131, PASS tUSD 0, FAIL BELIEF 0, FAIL tUSD 1.
   Wallets 190 BELIEF/89 tUSD, both vaults zero. Contract proposal ID 1 is shown
   as proposal #2 in the one-based UI. End: 11:01:50.726 UTC on 2026-11-14.
   Finalization AiPEh5GpbvWsWdCeUq1F5NtEGHXuv1jhG8xjkbeNzRuT is FINAL,
   all six receipts successful. Outcome PASS; action executed. BELIEF NEP-141
   event proves 1 BELIEF transferred from market to dhruva.testnet; wallet now
   191 BELIEF/89 tUSD. Active proposal null, reserved zero, pending count zero.
   Pools emptied into proposer claims. PASS balances are exactly 10 BELIEF and
   11 tUSD; FAIL balances also 10/11 but are losing claims, not extra redeemable
   collateral. Evidence: deployments/human-wallet-finalization.json.
   Next human signatures: redeem 10 BELIEF (asset_id 0) then 11 tUSD (asset_id 1),
   each proposal_id 1 and 0.01 testnet NEAR plus gas. Verify first before second.
   Expected final wallets 201 BELIEF/100 tUSD; vaults remain zero. Redemptions
   remain pending. No agent signed. Proposer pool release explains why winning
   balances exceed the pre-finalization traded balance.
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

# Walkthrough, demo and submission preparation

Current release and acceptance status: [HANDOFF](HANDOFF.md). The creator approved
the specific GitHub Pages release. That approval does not authorize an X post,
hackathon submission, key deletion or changes to Builders First. The live
[official rules](https://nearhackathon.com/HACKATHON.md) were re-read on 2026-11-14
before this script/description. Recheck before any submission. Deadline:
2026-11-14 23:59 UTC. Retain the independent Builders First disclosure.

## Full wallet walkthrough (signatures belong to Dhruva)

Use actual testnet data and inspect each receiver/deposit. Never send another
transaction merely to manufacture evidence. Keep public hashes after every step.

1. On the public origin, connect Meteor as dhruva.testnet. If the market account
   is still unregistered, register it once (0.01 NEAR retained). This is a useful
   next setup action, rather than another duplicate faucet claim. Verify FINAL
   status, all receipts and the registered account state.
2. Deposit the intended liquidity stakes from wallet to vault. A payment proposal
   needs BELIEF and tUSD stakes, plus the 0.1 NEAR creation fee. Use only amounts
   deliberately chosen for this test, with sufficient native testnet NEAR.
3. For a new payment, select BELIEF, a small amount within the available treasury
   and cap, and an already token-registered recipient (the existing testnet
   recipient is bob-dhruva-recipient.testnet). Confirm no other proposal is active.
   Propose once and verify its reserved action budget and paired initial pools.
4. Register claims for that proposal (0.01 NEAR). Fund only the intended additional
   trading amount if needed. Split vault tUSD and trade one side with an explicit
   minimum output. Inspect all four claim balances and the retained opposite side.
   A second participant is optional for mechanics; do not imply independent
   market opinion when one person or scripted accounts supply the trades.
5. Wait the actual 600-second interval. Finalize once when the UI enables it
   (0.01 NEAR). The strict average comparison selects the outcome. Verify the
   action receipt separately; an execution failure does not relabel the outcome.
6. Redeem a winning claim deliberately (0.01 NEAR). Verify refreshed wallet,
   claim and collateral balances. Withdraw any remaining unallocated vault funds
   only when intended. Do not donate or burn tokens just for a recording.

Private-origin faucet signing and a scripted real testnet lifecycle are already
verified. The full human walkthrough above is not yet claimed complete. Public
origin registration/signing also remains pending until its receipt is recorded.
Contract source/code/configuration is frozen; present an exception before any
contract change. All deployment keys remain.

## 60–90 second demo script

Record the walkthrough only after it has actually run. Use the matching real
proposal and receipt, not hardcoded results from another proposal. If using the
existing proposal 0, label it a **scripted testnet example** and show its actual
historical receipts. Never imply the faucet tests establish the full lifecycle.

- **0–10 seconds:** “I'm Dhruva Somen Chakrabarty. I built Bet on Beliefs to give
  a treasury decision a clear rule and a verifiable result. These are testnet
  tokens.” Show the app, testnet badge and the chosen payment proposal.
- **10–25 seconds:** Show the action amount, recipient and available/reserved
  treasury balances. “The proposal reserves its payment budget. Its proposer
  supplies liquidity from a separate vault.”
- **25–40 seconds:** Show the actual recorded trade and four claim balances.
  “A split creates both PASS and FAIL claims. Trading one side leaves the other
  side with its owner. This is conditional exposure, not an ordinary binary bet.”
- **40–55 seconds:** Cut the wait with the caption **600 seconds elapsed**.
  “PASS average must be strictly greater than FAIL average times 1.03.” Show
  outcome and action execution separately. Do not substitute spot for averages.
- **55–75 seconds:** Open the final action receipt and redemption evidence.
  “The NEAR contracts reserve funds, settle claims and restore failed transfers.
  Here is the actual result and the resulting underlying token balance.”
- **75–90 seconds:** “This demonstrates mechanics, not reliable price discovery.
  Thin markets can be manipulated. Upgrade keys remain and the contracts are
  not independently audited.” Show the source/evidence link and creator credits.

Existing verified scripted case: proposal 0 selected PASS, paid 1 BELIEF and
completed both trader redemptions. [Exact evidence](../deployments/README.md).
Use that result only when presenting that case. Caption code assistance briefly
and accurately: “Created and led by Dhruva Somen Chakrabarty. Codex assisted with
coding, tests and documentation.”

## Submission-ready project description (draft, not submitted)

Bet on Beliefs is a NEAR testnet treasury governed by conditional markets. A
proposal reserves a payment or BELIEF burn budget, and participants trade PASS
and FAIL claims. After ten minutes the contract compares time-weighted prices:
PASS must be strictly greater than FAIL times 1.03. Outcome, action execution,
collateral and redemptions are visible separately. Checked arithmetic, separate
ledgers and private callbacks support accounting and failed-transfer recovery.
Evidence includes 35 Rust unit tests, a four-proposal sandbox scenario, a scripted
ten-minute testnet payment/redemption lifecycle, browser regressions and real
Meteor faucet signatures. Public-origin signing and the full human market
walkthrough have their own acceptance records; they are not inferred from faucet
success. Created and led by Dhruva Somen Chakrabarty with Codex assistance.
Faucet liquidity is a mechanics demonstration, not reliable price discovery;
manipulation and upgrade-key trust remain explicit limitations.

Before submitting, update the acceptance sentence only to match newly recorded
evidence. Obtain the actual public demo post link and all required personal
fields, display the exact payload and receive approval. Do not invent contact,
payout or consent data. Submit at most once. The human publishes the X post.
Builders First is independently implemented and its demo video remains pending,
according to the creator; do not modify that repository or claim its submission.

# Walkthrough, demo and submission preparation

The completed public-site lifecycle and receipt scope are documented in
[VERIFICATION](EVIDENCE.md). Recording and submission are separate from the
verified application. Official rules: https://nearhackathon.com/HACKATHON.md.

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
4. Additional participants register claims for that proposal (0.01 NEAR); the proposer is registered automatically. Fund only the intended additional
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
verified. The public-site human walkthrough is now complete for contract proposal
1 (UI #2), through both redemptions and fixed-block accounting. See
[final accounting](../deployments/human-lifecycle-final-accounting.json). Public
origin registration/signing is verified in
[receipt evidence](../deployments/human-wallet-public-origin.json).


## 60–90 second demo script

Record the completed contract proposal **1**, shown as **#2** in the UI. Do not
start another proposal or repeat transactions for the video. Use existing receipts
and saved evidence for earlier states. If no earlier footage exists, show the
transaction details and label that segment “Verified transaction replay”. Do not
present a replay as a new live signature. Never show wallet secrets or credentials.

- **0–10 seconds:** Show the public app, testnet badge and proposal #2.
  “I'm Dhruva Somen Chakrabarty. I created Bet on Beliefs so a treasury decision
  has a clear rule and a verifiable result. This is a completed testnet example.”
- **10–25 seconds:** Show the proposal action and creation receipt.
  “I proposed a one-BELIEF treasury payment to my testnet account and supplied
  ten BELIEF and ten tUSD as separate liquidity stakes. The payment was reserved.”
- **25–40 seconds:** Show the split/trade receipt and recorded claim snapshot.
  “I split one additional tUSD and bought PASS BELIEF claims, retaining the FAIL
  tUSD claim. This was my own mechanics test, not independent market opinion.”
- **40–55 seconds:** Caption “600-second window completed”. Show the decision rule
  and settled outcome. “PASS average must be strictly greater than FAIL average
  times 1.03. The contract selected PASS. These are interval averages, not spot
  prices.” The deployed view does not expose numerical averages; do not invent them.
- **55–75 seconds:** Show finalization transfer and both redemption receipts, then
  current balances. “The treasury paid one BELIEF. I redeemed ten BELIEF and
  eleven tUSD, including released proposer liquidity. My wallet now has 201 BELIEF
  and 100 tUSD. Winning claims and this proposal's collateral are zero.”
- **75–90 seconds:** Show repo evidence and creator credits. “NEAR contracts keep
  treasury funds, vaults and claim collateral separate and settle through verified
  receipts. Thin markets can be manipulated, upgrade keys remain, and this is not
  independently audited.” Caption: “Created and led by Dhruva Somen Chakrabarty.
  Codex assisted with coding, tests and documentation.”

Exact public hashes are in [deployment evidence](../deployments/README.md).
Use the actual human-case receipts, not the separate scripted proposal 0 receipts.

## Submission-ready project description (draft, not submitted)

Bet on Beliefs is a NEAR testnet treasury governed by conditional markets. A
proposal reserves a payment or BELIEF burn budget, and participants trade PASS
and FAIL claims. After ten minutes the contract compares time-weighted prices:
PASS must be strictly greater than FAIL times 1.03. Outcome, action execution,
collateral and redemptions are visible separately. Checked arithmetic, separate
ledgers and private callbacks support accounting and failed-transfer recovery.
Evidence includes 35 Rust unit tests, a four-proposal sandbox scenario, a scripted
ten-minute testnet payment/redemption lifecycle, browser regressions, real
Meteor faucet signatures and a completed public-site human payment lifecycle,
including a manual PASS trade, executed payment and both redemptions. Every
transaction was verified FINAL, with fixed-block accounting checks. Created and led by Dhruva Somen Chakrabarty with Codex assistance.
Faucet liquidity is a mechanics demonstration, not reliable price discovery;
manipulation and upgrade-key trust remain explicit limitations.

Before submitting, update the acceptance sentence only to match newly recorded
evidence. Obtain the actual public demo post link and all required personal
fields, display the exact payload and receive approval. Do not invent contact,
payout or consent data. Submit at most once. The human publishes the X post.
Also by Dhruva: [Builders First](https://github.com/Dhruva-0206/builders-first), an independent NEAR investment thesis built from developer data.

## Final submission checklist (not authorization to submit)

- Record and review the 60–90 second video above. Confirm readable mobile/desktop
  captures, real proposal #2 and matching receipts. No new transaction is needed.
- Human publishes the demo post on X, mentioning NEAR HACKATHON, @NEARProtocol
  and #NEARHackathon, attaching the demo and linking app/repo. Obtain its public URL.
- Confirm the repository is public and accessible, final CI is green, and the
  app/evidence links work. Keep hosting through judging (November 18, ideally 25).
- Collect confirmed project/lead names, email, team size, track IDs, existing
  mainnet payout account and demo-post URL. A payout address does not authorize
  mainnet operations. Keep personal submission payloads out of Git.
- Obtain explicit agreement to the exact notice: “I agree that the organizers
  may use these details to review our submission and contact us about this hackathon.”
- Re-read the official rules, validate the full payload, show it to Dhruva and
  wait for approval. Check that this repository has not already been submitted.
- Submit at most once before 2026-11-14 23:59 UTC, only after approval. Retain the
  request ID for allowed retries; saved mistakes use the official change process.
- Preserve creator, AI/library and independent Builders First disclosures.

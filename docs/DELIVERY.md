# Delivery and human handoff

The live [official rules](https://nearhackathon.com/HACKATHON.md) were read on
2026-11-12 before preparing this document. Re-read them before submission.
The deadline remains 2026-11-14 23:59 UTC. Testnet-only entries are eligible.
A local demo is eligible with a reproducible public repository and a public
video post. Repository visibility changes, hosting, the human's social post,
contact details, payout address, consent and the exact submission payload all
remain human-controlled. One submission per project; do not submit twice.
Keep the independent Builders First disclosure. These notes are not a submission.

## Recording outline (75–90 seconds)

Record only after the actual testnet lifecycle succeeds. Use real wallet and
explorer screens. Do not substitute sandbox output or fixtures for testnet data.

1. 0–10s: Show the treasury and its available/reserved balances. Explain the
   problem: a community treasury needs a concrete decision rule for a payment.
2. 10–25s: Propose a capped payment with both personal liquidity stakes. Show
   action funds move from available to reserved; show the identical starting pools.
3. 25–45s: With a second wallet, deposit tUSD, split it and Trade PASS. Show all
   four claim balances, the retained FAIL tUSD and the explicit minimum received.
4. 45–60s: Cut the 10-minute wait and label the elapsed time. Finalize from a
   wallet. Show PASS/FAIL outcome separately from execution status, then open
   the actual recipient's successful FT transaction in the explorer.
5. 60–75s: Redeem a winning claim and show the underlying balance. Explain that
   NEAR contracts enforce reservations, transfers and failed-receipt restoration.
6. 75–90s: State the limits: scripted faucet liquidity is mechanics evidence,
   thin markets can be manipulated, price is not public welfare, and deployment
   keys remain. Link the source and the failed-transfer integration tests.

## Remaining acceptance gates

- Supply the human's testnet prefix before creating any accounts.
- Local Wasm builds, 35 unit tests, four-proposal sandbox scenario, frontend build
  and eight browser checks have passed. Repeat affected gates after any changes.
- Verify the deployed code hashes/configuration, then run the actual testnet demo.
- Exercise a real wallet signing path and its redirect/transaction evidence.
- Inspect staged changes before every commit and retain the AI disclosure.
- If contract changes are needed after 2026-11-13 18:00 UTC, request a concrete
  freeze exception before changing them.
- Obtain explicit hosting/visibility/post/submission approvals when those actions
  are actually requested. No such actions have been performed by this tooling.

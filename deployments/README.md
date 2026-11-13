# Verified testnet deployment

Deployed 2026-11-13 using the human-approved `bob-dhruva` prefix. All names were
available before creation; the authorized `bob-dhruva-26` fallback was not needed.
These are NEAR **testnet** accounts. No mainnet deployment or hosted public app.

| Role | Account |
| --- | --- |
| Market | [bob-dhruva-market.testnet](https://testnet.nearblocks.io/address/bob-dhruva-market.testnet) |
| BELIEF | [bob-dhruva-belief.testnet](https://testnet.nearblocks.io/address/bob-dhruva-belief.testnet) |
| tUSD | [bob-dhruva-tusd.testnet](https://testnet.nearblocks.io/address/bob-dhruva-tusd.testnet) |
| Proposer | bob-dhruva-proposer.testnet |
| Scripted trader | bob-dhruva-trader.testnet |
| Payment recipient | bob-dhruva-recipient.testnet |

All three deployed code hashes match the previously tested optimized Wasm.
Each contract retains one full-access key; code remains replaceable by the key
holder. No keys were removed. Credentials are ignored, local-only files with
mode 0600, and are never included in these public manifests.

## Actual lifecycle evidence

Proposal ID `0` (displayed as #1 in the UI) reserved a one-BELIEF payment, seeded
both pools from 100 BELIEF and 100 tUSD of proposer liquidity, and received a
scripted 200-tUSD split and 100-PASS-tUSD purchase. The real 600-second interval
elapsed. PASS won, the payment executed, and the trader redeemed winning BELIEF
and tUSD. The recipient holds exactly one BELIEF. The active lock, reservations
and pending outgoing operations are cleared. Proposer claims remain backed.

- [Create proposal](https://testnet.nearblocks.io/txns/AjTd8yQD2e1uD1JCL5C1cgTMhszoMBT8QYtuZywGioPk)
- [Split](https://testnet.nearblocks.io/txns/A9tVFjG1TVgehsVW31HLfwZoGxY4PexzVLSb1Xi5PscJ)
- [Trade PASS](https://testnet.nearblocks.io/txns/FJBJBYoRBUeqwJYvjBau627sX9Zf66AtAq4UZ2QTLjvp)
- [Finalize and execute](https://testnet.nearblocks.io/txns/6phUWCoGJQP7dJH78KMks5jgRXf4d41XfPHkZLcKmWJ4)
- [Redeem BELIEF](https://testnet.nearblocks.io/txns/C631mAq4uxCkGn8cgTjGT714cyL9YCiKDx8VErEaX9NC)
- [Redeem tUSD](https://testnet.nearblocks.io/txns/6sJJ1wHjpPEUcqTUeUwdR2JotoMfcbodLjqSDwwMdS5x)

The finalization and both redemption transactions were independently queried
through RPC: all report `FINAL`, successful final values, six receipts each,
and zero failed receipts. See `settlement-receipts.json`. Scripted faucet
liquidity is a mechanics demonstration, not independent economic validation.

## Snapshots and reproduction

- `testnet-bob-dhruva.json`: accounts and code hashes.
- `verification-before-demo.json`: initial treasury allocation and token metadata.
- `verification-trading.json`: both conditional supplies equal collateral,
  physical balances equal the ledgers, and one BELIEF is reserved.
- `verification-settled.json`: same-block final backing checks after payment and
  redemptions, zero pending operations, and retained full-access key counts.
- `frontend-live-trading.json` / `frontend-live-settled.json`: actual desktop and
  mobile browser reads, no runtime errors/overflow, no wallet signing claimed.
- `transactions-bob-dhruva.json`: public transaction links from setup and demo.

```sh
python3 scripts/verify-testnet.py deployments/testnet-bob-dhruva.json --output /tmp/bob-current.json
# Start the production frontend locally, then in another terminal:
npm run preview --prefix web -- --host 127.0.0.1 --port 5173
cd web
node scripts/verify-live.mjs bob-dhruva-market.testnet
```

The verifier pins every account/contract query to one final block, requires
chain `testnet`, checks code hashes and metadata, and rejects snapshots with
transfers in flight. It reads no credentials and signs no transactions. Public
chain state can change after each recorded snapshot.

Setup was rerun after completion: no accounts were recreated, no code was
replaced and no transactions were sent. The demo's local wait process was
interrupted; its saved proposal ID allowed it to resume the same proposal
without duplicating a split or trade. Final execution and redemption succeeded.
Human Meteor signing for both faucets passed; see `human-wallet-validation.json` for FINAL receipts, events and final-block balances matching the reported UI. Burn and
failure scenarios are covered by the sandbox suite, not claimed as testnet runs.

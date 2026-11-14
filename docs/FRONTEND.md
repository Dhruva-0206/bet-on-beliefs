# Frontend and wallet instructions

The application defaults to the deployed `bob-dhruva-market.testnet`. Browse the
proposal and treasury without a wallet. Advanced settings can load another
`.testnet` market; no example proposal or balance is shown as chain data.

## Connect and prepare

1. Open https://dhruva-0206.github.io/bet-on-beliefs/ after release verification
   in HANDOFF. The Codespace port remains a private development preview.
2. Connect Meteor and choose a separate testnet account. Confirm the visible
   account and testnet badge. Never import or share keys through this app.
3. Use **Get test tokens and set up**. **Get 100 BELIEF** or **Get 100 tUSD**
   attaches 0.01 testnet NEAR for token storage and calls the finite faucet.
   Storage excess is refunded, including when already registered. Gas also costs
   testnet NEAR; these faucets do not supply native NEAR.
4. Market registration is separate. It retains 0.01 NEAR and allows vault use.
   Deposit wallet tokens to your vault with a 1 yoctoNEAR transfer-call deposit.
5. An open proposal requires its own claim registration, retaining 0.01 NEAR.
   Then split deposited tokens and trade the chosen world with a minimum output,
   or use existing conditional claims. The opposite side's claim remains yours.
6. Creating a proposal uses both liquidity stakes from the vault and retains
   0.1 NEAR. A payment recipient must already be registered in the selected token.
   Finalization, withdrawal, merge and redemption retain 0.01 NEAR where required.

## Confirmation and recovery

Review the receiver, method and deposit in Meteor. The UI distinguishes approval,
submission, pending confirmation, confirmed final receipts, cancellation and
failure. Submission alone never means success. After confirmation, inspect actual
balances; an FT transfer-call may return unused tokens rather than fund a vault.

The UI blocks duplicate clicks while an action is active. Unverified submitted
hashes are saved with their public sender in session storage. **Check pending
receipt** is read-only and does not resend the action. RPC failure or timeout is
not proof that a submitted transaction failed. Check its explorer link before
retrying. If Meteor returns no hash, inspect wallet activity before any retry.
Popup-blocking and insufficient-balance messages include recovery instructions.
Refreshing unavailable/stale chain data is also read-only; actions pause while
chain data is unavailable or stale.

Outcome is separate from execution. Execution failure restores treasury funds
but does not change the selected world. The deployed proposal view does not
expose recorded averages, so the app labels that gap instead of manufacturing
an average from a current spot price. Settled proposals emphasize receipt
inspection and redemption; they do not show inactive trading controls.

## Development

```sh
npm ci --prefix web
npm run test --prefix web
npm run build --prefix web
npm run preview --prefix web
cd web
npx playwright install --with-deps chromium
npm run test:browser
BOB_DEV_BROWSER=1 npm run test:browser
cd ..
VITE_MARKET_CONTRACT=bob-dhruva-market.testnet npm run build:pages --prefix web
npm run test:pages --prefix web
```

The preview binds 0.0.0.0:5173 with strict port selection. Keep Codespace port
visibility private. The Pages build uses `/bet-on-beliefs/` and a separate ignored
output directory. Node and dependencies are pinned in the manifests/lockfile.
`web/src/bootstrap.ts` installs browser Buffer/process before importing the app.
The guarded SDK transform preserves Meteor's query-string 10 compatibility and
removes its generated-key debug log in dev and production. Do not remove these
when changing UI copy. [Dependency review](DEPENDENCY_REVIEW.md).

Read-only live QA: `cd web` then
`node scripts/verify-live.mjs bob-dhruva-market.testnet`. Screenshots/reports are
ignored under test-results. It never signs and does not replace real wallet QA.
Private-origin Meteor faucet receipts, including the post-dependency-fix repeat,
are under deployments/. Public-origin signing remains a separate acceptance
step until its own final receipt is recorded. [Release handoff](HANDOFF.md).

# Wallet frontend

```sh
npm ci --prefix web
npm run build --prefix web
npm run test --prefix web
# Browser QA on Linux (requires system libraries and a browser download)
cd web
npx playwright install --with-deps chromium
npm run test:browser
BOB_DEV_BROWSER=1 npm run test:browser
```

Node is pinned in `.nvmrc`; direct npm dependencies have exact versions and the
resolved tree is in `web/package-lock.json`. Set `VITE_MARKET_CONTRACT` in
`web/.env.local`, or enter a verified deployed `.testnet` market account in the
app. Run `npm run dev --prefix web` for the local application. No hosting is
configured. Empty configuration shows no fixture proposals or balances.

Read-only browsing calls FASTNEAR testnet RPC (`https://test.rpc.fastnear.com`).
Wallet Selector 10.1.4 now uses **Meteor Wallet** 10.1.4, replacing the retired
MyNearWallet app connector reported by the human. Meteor's official integration
example explicitly configures testnet:
https://github.com/Meteor-Wallet/meteor-public
https://github.com/near/wallet-selector/tree/main/packages/meteor-wallet
The pinned Meteor SDK 1.0.24 supports both injected extension communication and
`https://wallet.meteorwallet.app/connect/testnet/login` popup communication.
Browser QA exercises the production Connect button and verifies the testnet
popup URL, without claiming a real signed transaction. The upstream open report
https://github.com/Meteor-Wallet/meteor-public/issues/40 means actual human
connection/signing required a human gate, now passed for both faucets by `dhruva.testnet` (see `deployments/human-wallet-validation.json`). Meteor's web UI returns a Cloudflare
403 from this Codespace, so its current account-creation labels could not be
verified here; do not mistake that for a successful live wallet session.

## Human testnet wallet check

1. Open the private preview:
   https://laughing-space-invention-wr4qxxxxvjpqh56gw-5173.app.github.dev
   Sign into GitHub if requested, then hard-refresh to load the Meteor build.
2. Enter `bob-dhruva-market.testnet` and click **Load on-chain data**.
3. Click **Connect wallet** and choose **Meteor Wallet**. Allow its popup if
   needed. The connector requests **testnet**, even if your existing Meteor
   account is mainnet.
4. In Meteor, use its network selection/settings to select **Testnet**. Use its
   account menu's create-new-account flow for a separate testnet account. If the
   connection screen offers account creation, use that testnet flow. Labels may
   vary by extension release. Do not migrate/import your mainnet account or
   approve a mainnet request. If Testnet or new-account creation is unavailable,
   stop and report the visible message rather than guessing or importing keys.
5. Complete wallet-owned account setup privately. Never send recovery words or
   keys to the app or assistant. Confirm Testnet and the new public account ID
   before authorizing the market connection. The account needs testnet NEAR for
   storage/gas; BELIEF/tUSD faucets do not supply native NEAR. If unfunded, report
   the public ID so funding options can be checked without migrating accounts.
6. In **Fund your conviction**, click **Register FT & faucet** under BELIEF.
   Inspect receiver `bob-dhruva-belief.testnet`, calls `storage_deposit` plus
   `faucet`, and deposit **0.01 testnet NEAR** plus gas. Approve in Meteor.
7. Return and allow the 15-second balance refresh. BELIEF wallet balance should
   increase by 100; vault stays unchanged. Repeat for tUSD, checking receiver
   `bob-dhruva-tusd.testnet`, to increase its wallet balance by 100.
8. Provide only your public account ID, transaction hash/explorer link, and
   displayed balances. Verify FINAL execution, every receipt, and actual FT
   balance changes before marking human signing complete. Public hosting still
   requires explicit approval after this gate.

Preview: `npm run preview --prefix web` now binds `0.0.0.0:5173` with
`--strictPort`, so a conflict fails instead of silently changing ports. Keep
forwarding private, with HTTP to the local server and HTTPS at the external URL.

Faucets register FT storage first. Market registration, proposal claim
registration and native operation fees are distinct. Vault `stake` deposits can
be split or used for proposer liquidity. A split-and-trade transaction sends
both calls to the market in one receipt. The opposite world's claims remain
with the user. All JSON token amounts are decimal strings, constructed with
BigInt and at most 18 decimal places. Pool quotes include the 30 bps fee and are
estimates; only the signed minimum output is authoritative.

The app displays four conditional balances, separate outcome/execution states,
collateral, reservations, pending outgoing obligations, countdowns, fees and
explorer transaction links. A failed execution does not relabel the winning
market world. Wallet redirect errors are surfaced. Chain read failures disable
operations. Browser tests cover empty and error states plus testnet wallet
initialization; they do not claim a signed-wallet end-to-end test has passed.

Dependency remediation audit (2026-11-13): **15 low, zero moderate/high/critical**.
The scoped Meteor override to query-string 10.0.0 removes decode-uri-component.
A guarded dev/build transform adapts the SDK's named import to the new default
API; both faucet signing boundaries and popup parameters pass dev/production QA.
The nanoid 5.1.16 override remains. Full audit exits 1 for residual elliptic-chain
low findings; the moderate-or-higher audit gate passes. See
[review and remediation](DEPENDENCY_REVIEW.md). Repeat human faucet signing after
hard-refresh to extend the preserved pre-update human evidence; synthetic tests
do not replace that check. Hosting remains private.

The faucet failure was reproduced with a browser debugger:
`transact → @near-js/transactions functionCall → stringifyJsonOrBytes → Buffer.from`.
A buffer import alias handles imported modules but cannot initialize a free
`Buffer` global. Meteor SDK `requestSignTransactions` also uses free Buffer for
base64 transaction encoding. `src/bootstrap.ts` installs browser `buffer` and
`process` implementations, then dynamically imports the app, guaranteeing those
globals exist before wallet/transaction dependencies evaluate. A static main
import would execute dependencies before the assignments. Vite retains its
`globalThis` alias. The key-log mitigation also runs during dev dependency
optimization, preserving CommonJS interop instead of excluding the SDK.

The faucet browser regression uses a fake Meteor extension and intercepted RPC;
it clicks both real faucet buttons, decodes the unsigned transactions delivered
to Meteor, verifies receivers/arguments/deposits/gas/testnet, then cancels at the
signing boundary. It rejects broadcasting and checks for key logging/runtime
errors. Both dev and production run it on desktop/mobile in CI. It does not
validate real human signing.

SDK 1.0.24 contains `console.log(accessKey)` during
sign-in: a narrowly scoped build transform removes that exact statement and
fails if the expected source changes. No generated app key should be logged.
Vite still reports dependency eval/util and large-chunk warnings.


Live read-only QA (with the production preview running on port 5173):

```sh
cd web
node scripts/verify-live.mjs bob-dhruva-market.testnet
```

This checks the actual deployed market on desktop/mobile, without fixtures or
wallet signing. It writes local screenshots and a report under ignored
`web/test-results/`. The Codespace port remains private; this is not a hosted
public application. Human Meteor faucet signing has separately passed; this read-only script itself never signs.

Completed human check: both Meteor transactions are FINAL with four successful receipts each, including faucet transfer events for 100 tokens. The on-chain wallet balances and zero vaults match the human-reported UI. Market registration/trading were not part of this human check. See [dependency review](DEPENDENCY_REVIEW.md) before considering public hosting.

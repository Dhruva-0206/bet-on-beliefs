# Wallet frontend

```sh
npm ci --prefix web
npm run build --prefix web
npm run test --prefix web
# Browser QA on Linux (requires system libraries and a browser download)
cd web
npx playwright install --with-deps chromium
npm run test:browser
```

Node is pinned in `.nvmrc`; direct npm dependencies have exact versions and the
resolved tree is in `web/package-lock.json`. Set `VITE_MARKET_CONTRACT` in
`web/.env.local`, or enter a verified deployed `.testnet` market account in the
app. Run `npm run dev --prefix web` for the local application. No hosting is
configured. Empty configuration shows no fixture proposals or balances.

Read-only browsing calls NEAR testnet RPC. Wallet operations use Wallet Selector
10.1.4 with MyNearWallet, selected from its official testnet documentation:
https://github.com/near/wallet-selector/tree/main/packages/core
The production adapter initializes on testnet and selects
`https://testnet.mynearwallet.com`; Chromium tests verify this without signing.
Live human-wallet signing and chain interaction remain a separate gate.

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

Dependency audit on 2026-11-12: 11 low severity findings, no moderate/high/critical
findings. They originate from `elliptic` through the wallet crypto stack
([advisory](https://github.com/advisories/GHSA-848j-6mx2-7j84)). The registry's
suggested fix downgrades major wallet APIs, so it was not applied automatically.
Vite also reports wallet dependency `eval` and browser-external `util` warnings;
production browser initialization tests pass. Reassess dependencies before any
production use. No production/security validation is claimed.

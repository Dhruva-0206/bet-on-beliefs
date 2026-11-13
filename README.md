# Bet on Beliefs

A memecoin treasury governed by markets: trade the “do it” and “don't do it” worlds, then let the NEAR contract execute the result.

**Status: all three contracts and the wallet frontend are implemented and locally tested. Testnet account creation/deployment and live wallet signing await the human’s account prefix. No testnet accounts or hosted app exist yet.**

## Intended experience

1. Propose a capped treasury payment or a recurring burn of 1% of available treasury BELIEF.
2. Deposit test tokens to obtain paired PASS and FAIL claims.
3. Trade conditional BELIEF against conditional tUSD in either world.
4. After the window, compare time-weighted prices. PASS must exceed FAIL by the configured margin.
5. Anyone can finalize. The contract executes an approved action and users redeem the selected outcome's claims.

This is a testnet experiment in futarchy, inspired by [MetaDAO](https://metadao.com/docs). It does not claim to invent futarchy or prove that token prices measure social welfare.

## Development

Open this repository in a Linux GitHub Codespace. The devcontainer configures Git hooks and forwards the frontend port. See [build plan](docs/BUILD_PLAN.md) and [mechanism design](DESIGN.md).

Layout: `contracts/belief-ft`, `contracts/tusd-ft`, `contracts/futarchy`, `web`, `tests`, and `scripts`. See [frontend instructions](docs/FRONTEND.md) for local wallet UI setup. No hosting is configured.

## Evidence

Verified locally on Linux, 2026-11-12:

- 35 token, lifecycle, arithmetic and oracle unit tests: `cargo test --workspace --exclude integration-tests --locked`.
- Three optimized on-chain Wasm builds: `bash scripts/build-contracts.sh`; [local artifact hashes](docs/BUILD_HASHES.json).
- One near-workspaces integration test covering four proposals: `cargo test -p integration-tests --test lifecycle --locked -- --nocapture`. It checks physical FT backing, failed payment/merge/redemption recovery, successful payment and burn, private callbacks, self-only initialization, repeated calls, slippage and no-trade rejection.
- Frontend type check/production build and precision tests: `npm run build --prefix web` and `npm run test --prefix web`.
- Eight desktop/mobile Chromium checks: `npm run test:browser --prefix web`. Wallet initialization is verified on testnet; actual wallet signing remains untested.

See [development notes](docs/DEVELOPMENT.md), the [accounting argument](docs/ACCOUNTING.md), [oracle policy and attack limitations](docs/ORACLE.md), and [recording/handoff checklist](docs/DELIVERY.md). CI now defines real contract builds, unit/sandbox tests and frontend/browser checks; remote CI results are not claimed here. A scaffold check is not product validation. No deployed addresses or testnet transactions are available yet. Scripted faucet trades demonstrate mechanics, not reliable price discovery.

## Hackathon

Built for NEAR HACKATHON, November 2026. Primary fit: Memecoins With Mechanics; secondary fit: Social Money. All deployments will use NEAR testnet.

Also by this team: [Builders First](https://github.com/Dhruva-0206/builders-first). The projects are independent.

## Credits and license

Built with AI coding assistance. Uses NEAR SDK and NEAR contract standards 5.30.1, uint 0.10.0, near-workspaces 0.24.0, Rust 1.95.0, React, Vite and NEAR Wallet Selector. Resolved dependencies are pinned in Cargo.lock and web/package-lock.json; exact direct versions are in the manifests. MIT license.

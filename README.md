# Bet on Beliefs

A memecoin treasury governed by markets: trade the “do it” and “don't do it” worlds, then let the NEAR contract execute the result.

**Status: token contracts and checked market arithmetic implemented with local unit tests. Treasury/market contract, wallet UI, integration tests and testnet deployment are not implemented yet. No live tokens or financial product.**

## Intended experience

1. Propose a capped treasury payment or a recurring burn of 1% of available treasury BELIEF.
2. Deposit test tokens to obtain paired PASS and FAIL claims.
3. Trade conditional BELIEF against conditional tUSD in either world.
4. After the window, compare time-weighted prices. PASS must exceed FAIL by the configured margin.
5. Anyone can finalize. The contract executes an approved action and users redeem the selected outcome's claims.

This is a testnet experiment in futarchy, inspired by [MetaDAO](https://metadao.com/docs). It does not claim to invent futarchy or prove that token prices measure social welfare.

## Development

Open this repository in a Linux GitHub Codespace. The devcontainer configures Git hooks and forwards the future frontend port. See [build plan](docs/BUILD_PLAN.md) and [mechanism design](DESIGN.md).

Planned layout: `contracts/belief-ft`, `contracts/tusd-ft`, `contracts/futarchy`, `web`, `tests`, and `scripts`. Implementation directories are added when their first working code is ready.

## Evidence

Token and arithmetic tests run with `cargo test --workspace --locked`; see [development notes](docs/DEVELOPMENT.md) and the explicit [oracle policy and limitations](docs/ORACLE.md). This is local unit evidence, not sandbox integration or deployed-product validation. No deployed addresses or transactions exist yet. A scaffold check is not a contract correctness check.

## Hackathon

Built for NEAR HACKATHON, November 2026. Primary fit: Memecoins With Mechanics; secondary fit: Social Money. All deployments will use NEAR testnet.

Also by this team: [Builders First](https://github.com/Dhruva-0206/builders-first). The projects are independent.

## Credits and license

Built with AI coding assistance. Uses NEAR SDK and NEAR contract standards 5.30.1, uint 0.10.0, and Rust 1.95.0; resolved Rust dependencies are pinned in Cargo.lock. MIT license.

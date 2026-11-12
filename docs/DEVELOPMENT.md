# Reproducible local development

Linux only. Run `bash scripts/setup-dev.sh` first. Rust is pinned by
`rust-toolchain.toml`; SDK/standards are exactly 5.30.1 and resolved crates are
committed in `Cargo.lock`. Node observed in this Codespace: 24.22.2; npm 11.19.1.
SDK 5.30.1 requires Rust 1.95, verified from its published Cargo manifest.

Commands:

```sh
cargo test --workspace --locked
cargo fmt --all -- --check
```

Official references inspected 2026-11-12:

- https://docs.rs/near-sdk/5.30.1/near_sdk/
- https://docs.rs/near-contract-standards/5.30.1/near_contract_standards/
- https://github.com/near/cargo-near
- https://github.com/near/near-workspaces-rs
- https://github.com/near/NEPs/blob/master/neps/nep-0141.md

Use explicit standards trait delegation; the legacy FT implementation macros
are deprecated and the current storage API uses `NearToken`.

BELIEF allocates 600 million to the treasury account, 200 million to the proposer,
and 200 million to its own faucet reserve. These must be distinct accounts.
tUSD starts with a finite one-billion-token faucet reserve. Both faucets dispense
100 tokens per call to registered callers. They are public test liquidity:
repeated calls can drain the finite allocation, and no per-person Sybil resistance
is claimed. Registration is paid through NEP-145. No faucet mints after initialization.
The three initial BELIEF registrations and one tUSD registration are funded by
the deployment account; later registrations are user-funded.

Read docs/ORACLE.md before changing market logic. Math tests do not prove the
future cross-contract lifecycle: sandbox integration and failed receipt testing
remain separate acceptance gates. No deployments exist yet.

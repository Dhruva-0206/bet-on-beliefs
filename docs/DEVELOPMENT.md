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

## Market contract

The market contract now implements reservations, one active proposal, split,
merge, swaps, resolution, capped FT transfers and the 1% ritual burn. All burns
must use the ritual entry point; the general proposal entry point accepts only
payments. The 15-minute ritual cooldown starts at proposal creation, including
rejected rituals. Titles are at most 120 UTF-8 bytes and descriptions 2000 bytes.

Bootstrap reads the BELIEF balance before accepting any FT inflows or outgoing
operations. This accounts for the initial 60% allocation without trusting a
caller-provided balance. Only configured token predecessors and exact `treasury`
or `stake` messages are accepted. Stake credits go to `sender_id`, never to the
token predecessor. Invalid inflows return the full unused amount.

Vaults hold pending proposer/user stakes. Proposal collateral, available treasury,
reserved actions and pending outgoing obligations are distinct. Each outgoing
operation is debited before scheduling and assigned a monotonically increasing
ID. Only a private callback can consume that ID, restoring vault/claims/treasury
on failed receipts. An execution failure is terminal and leaves the market
outcome fixed. Another proposal remains locked out until the execution callback.
Claim restoration also works when a merge callback arrives after resolution.

Testnet state bounds: 100 proposals for the deployment lifetime, 1000 globally
registered users, 1000 registered claim holders per proposal, and 4096 concurrent
pending outgoing operations. Entries are not deleted or recycled in the MVP.
Registration and outgoing/finalize operations retain a minimum 0.01 NEAR fee;
proposal creation retains 0.1 NEAR for its bounded text and state. Fees and excess
deposits are retained, not refundable storage balances. There is no admin method
to spend FT treasury funds outside proposal settlement. Deployment keys still
allow code replacement; no immutability claim is made.

Unit gate: `cargo test --workspace --exclude integration-tests --locked`.
35 tests passed locally on 2026-11-12. The sandbox test target compiles, but its
real-receipt run and Wasm build are pending at this milestone. Unit callback tests
simulate receipt outcomes and do not prove Wasm access control.

# Reproducible local development

Linux only. Run `bash scripts/setup-dev.sh` first. Rust is pinned by
`rust-toolchain.toml`; SDK/standards are exactly 5.30.1 and resolved crates are
committed in `Cargo.lock`. Node observed in this Codespace: 24.22.2; npm 11.19.1.
SDK 5.30.1 requires Rust 1.95, verified from its published Cargo manifest.

Commands:

```sh
cargo test --workspace --exclude integration-tests --locked
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
remain separate acceptance gates. Current testnet deployment evidence is under `deployments/`.

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
35 tests passed locally on 2026-11-12. All three optimized Wasm builds and the real-receipt sandbox test now pass.
The sandbox scenario covers four proposals and verifies Wasm access control;
unit callback simulations alone are not considered that proof.


## Wasm, sandbox and deployment tooling

Build on Linux with `bash scripts/build-contracts.sh`. The verified tool is
cargo-near 0.21.0, pinned intentionally; it reports a newer 0.23.0 release is
available. The tested SDK/standards are 5.30.1 with Rust 1.95.0. The build keeps
`--cfg near` host calls and the required Wasm optimizer step. These are host
builds (`non-reproducible-wasm`), not Docker reproducibility claims.

Run `cargo test -p integration-tests --test lifecycle --locked -- --nocapture`
after building. near-workspaces 0.24.0 resolves near-sandbox 0.4.1, whose default
sandbox binary is 2.14.1. The tests check actual block timestamps against each
600-second proposal end; block counts are not treated as elapsed seconds.

Install missing Linux tools with `bash scripts/install-tools.sh`. Then run
`bash scripts/setup-dev.sh` to configure hooks and print versions. Exact build,
Vite, Playwright and deployment CLI syntax has been checked with `--help`.

`cargo run -p integration-tests --bin testnet --locked -- --help` explains the
local deployment tool. `plan PREFIX` only reads local artifacts and prints a
plan. **Obtain the human's prefix before `deploy PREFIX`.** Deployment creates
six named testnet accounts (market, belief, tusd, proposer, trader, recipient),
using OS-random keys stored in gitignored `.near-credentials/testnet` files with
mode 0600. It checks account existence, local ownership, code hashes and state;
it initializes once, and refuses to replace any different existing code. All
three constructors are self-only, preventing first-initializer front-running.
Repeated setup does not reset balances or redeploy matching code. No key removal
or mainnet path exists in the tool. Account creation/funding depends on the
official testnet helper; failures must be resolved without switching networks.

`demo PREFIX` uses only those testnet accounts. It runs or resumes one scripted
payment proposal, waits for the actual 10-minute interval, finalizes and redeems,
and prints transaction explorer links. Its progress file records the proposal
ID. If interrupted between on-chain creation and recording that ID, it refuses
to create another proposal; inspect the active proposal and recover the progress
file explicitly. An unexpected outcome or failed execution stops the demo.
Public address/hash manifests and progress live in `deployments/`; they never
contain private keys. Testnet deployment/setup has now run; human wallet signing
remains unverified.


2026-11-13 deployment note: the human selected prefix `bob-dhruva`, with
`bob-dhruva-26` authorized only if it was taken. The first prefix and all six
planned names were available. near-workspaces must enable its `rustls` feature
alongside `install`: disabling defaults without a TLS feature makes the helper
client reject HTTPS. This was fixed in the tooling manifest, not contract code.
The default public RPC then rate-limited storage setup. Tooling and frontend
reads now use the officially listed FASTNEAR testnet RPC; its live status was
verified as chain `testnet`, protocol 88. Setup resumed with existing keys and
matching code, then an additional setup run completed without transactions.
See `deployments/` for public manifests and fixed-block verification snapshots.

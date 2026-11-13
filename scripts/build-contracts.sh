#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f "$HOME/.cargo/env" ]]; then source "$HOME/.cargo/env"; fi
[[ "$(uname -s)" == Linux ]] || { echo 'Linux required' >&2; exit 1; }
cargo near --version
mkdir -p artifacts
for contract in belief-ft tusd-ft futarchy; do
  cargo near build non-reproducible-wasm --locked --no-abi \
    --manifest-path "contracts/$contract/Cargo.toml" --out-dir artifacts
done
sha256sum artifacts/*.wasm

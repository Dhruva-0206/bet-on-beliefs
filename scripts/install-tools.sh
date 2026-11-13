#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Linux ]]; then
  echo 'Use the Linux Codespace for NEAR sandbox and builds.' >&2
  exit 1
fi
sudo apt-get update
sudo apt-get install -y build-essential pkg-config clang cmake curl libssl-dev libudev-dev libusb-1.0-0-dev
if ! command -v rustup >/dev/null 2>&1 && [[ ! -x "$HOME/.cargo/bin/rustup" ]]; then
  installer=$(mktemp)
  trap 'rm -f "$installer"' EXIT
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o "$installer"
  bash "$installer" -y --profile minimal --default-toolchain 1.95.0 --no-modify-path
fi
source "$HOME/.cargo/env"
rustup show
cargo install cargo-near --version 0.21.0 --locked
cargo near --version
cargo near build non-reproducible-wasm --help

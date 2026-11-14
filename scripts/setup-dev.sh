#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f "$HOME/.cargo/env" ]]; then
  source "$HOME/.cargo/env"
fi
git config core.hooksPath .githooks
chmod +x .githooks/commit-msg
printf 'Development environment ready. Tool versions:\n'
git --version
node --version
npm --version
if command -v rustup >/dev/null 2>&1; then
  rustup show active-toolchain
else
  printf 'Rust is not installed yet. Follow docs/DEVELOPMENT.md.\n'
fi
printf 'Contract and integration builds must run on Linux.\n'

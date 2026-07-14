#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# build-firefox.sh — Reproducible Firefox extension build
#
# This script builds the Textmode Overlay Firefox extension from
# source. It is designed so an AMO reviewer can run it in a clean
# environment and get an identical copy of the submitted add-on.
#
# Usage:
#   chmod +x scripts/build-firefox.sh
#   ./scripts/build-firefox.sh
#
# Requirements:
#   • Node.js >=20.8.1  (https://nodejs.org)
#   • npm               (ships with Node.js)
#
# The script will:
#   1. Verify Node.js and npm versions.
#   2. Install dependencies from the lockfile (npm ci).
#   3. Build the Firefox MV3 extension (wxt build -b firefox --mv3).
#   4. Print the output directory path.
#
# The unsigned build is written to:  .output/firefox-mv3/
# For normal installation in release Firefox, sign the build through AMO.
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

REQUIRED_NODE_MAJOR=20

# ── helpers ──────────────────────────────────────────────────────

info()  { printf '\033[1;34m[info]\033[0m  %s\n' "$*"; }
ok()    { printf '\033[1;32m[ok]\033[0m    %s\n' "$*"; }
fail()  { printf '\033[1;31m[fail]\033[0m  %s\n' "$*" >&2; exit 1; }

# ── pre-flight checks ───────────────────────────────────────────

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install it from https://nodejs.org (>=20.8.1)."
command -v npm  >/dev/null 2>&1 || fail "npm is not installed. It ships with Node.js."

NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  fail "Node.js $NODE_VERSION is too old. This project requires Node.js >=20.8.1."
fi
info "Node.js $NODE_VERSION — ok"
info "npm $(npm --version) — ok"

# ── ensure we are in the project root ────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f "package.json" ] || [ ! -f "package-lock.json" ]; then
  fail "Cannot find package.json or package-lock.json. Run this script from the project root or via scripts/build-firefox.sh."
fi
info "Project root: $PROJECT_ROOT"

# ── install dependencies ────────────────────────────────────────

info "Installing dependencies (npm ci) …"
npm ci
ok "Dependencies installed."

# ── build ────────────────────────────────────────────────────────

info "Building Firefox extension …"
npm run build:firefox
ok "Build complete."

# ── output ───────────────────────────────────────────────────────

OUTPUT_DIR="$PROJECT_ROOT/.output/firefox-mv3"
if [ -d "$OUTPUT_DIR" ]; then
  ok "Firefox extension built at: $OUTPUT_DIR"
  echo ""
  echo "Contents:"
  ls -la "$OUTPUT_DIR"
else
  fail "Expected output directory not found: $OUTPUT_DIR"
fi

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${TELEMETRY_PORT:-4321}"
WS_URL="${RINAWARP_TELEMETRY_WS_URL:-ws://127.0.0.1:${PORT}}"

cleanup() {
  if [[ -n "${TELEMETRY_STUB_PID:-}" ]] && kill -0 "${TELEMETRY_STUB_PID}" 2>/dev/null; then
    kill "${TELEMETRY_STUB_PID}" 2>/dev/null || true
    wait "${TELEMETRY_STUB_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"
node scripts/telemetry-stub.mjs &
TELEMETRY_STUB_PID=$!

for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Telemetry stub failed to become ready on port ${PORT}" >&2
  exit 1
fi

if [[ "$#" -gt 0 ]]; then
  RINAWARP_TELEMETRY_WS_URL="${WS_URL}" bash scripts/run-electron-playwright.sh "$@"
else
  RINAWARP_TELEMETRY_WS_URL="${WS_URL}" bash scripts/run-electron-playwright.sh tests/e2e/telemetry.test.ts
fi

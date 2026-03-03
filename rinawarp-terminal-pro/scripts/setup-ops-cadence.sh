#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${LOG_DIR:-$ROOT/data/monitor}"
WATCHDOG_LOG="${WATCHDOG_LOG:-$LOG_DIR/prod-watchdog.log}"

mkdir -p "$LOG_DIR"

watchdog_cmd="cd $ROOT && nohup env FORCE_IPV4=1 RETRY_PROFILE=fast INTERVAL_SEC=300 MAX_CONSEC_FAILS=3 bash scripts/prod-watchdog.sh >> \"$WATCHDOG_LOG\" 2>&1 &"

ensure_watchdog() {
  if pgrep -f "bash scripts/prod-watchdog.sh" >/dev/null 2>&1; then
    return 0
  fi
  bash -lc "$watchdog_cmd"
}

ensure_watchdog

if ! command -v crontab >/dev/null 2>&1; then
  echo "⚠ crontab not available; watchdog started only."
  exit 0
fi

tmp="$(mktemp)"
crontab -l 2>/dev/null > "$tmp" || true

grep -v "rinawarp cadence" "$tmp" > "$tmp.new" || true
mv "$tmp.new" "$tmp"

{
  echo "*/5 * * * * cd $ROOT && pgrep -f 'bash scripts/prod-watchdog.sh' >/dev/null || (nohup env FORCE_IPV4=1 RETRY_PROFILE=fast INTERVAL_SEC=300 MAX_CONSEC_FAILS=3 bash scripts/prod-watchdog.sh >> \"$WATCHDOG_LOG\" 2>&1 &) # rinawarp cadence watchdog"
  echo "5 14 * * * cd $ROOT && HOURS=24 bash scripts/revenue-daily-report.sh >> \"$LOG_DIR/revenue-cron.log\" 2>&1 # rinawarp cadence report"
  echo "10 14 * * * cd $ROOT && HOURS=24 bash scripts/revenue-diagnose.sh >> \"$LOG_DIR/revenue-cron.log\" 2>&1 # rinawarp cadence diagnose"
} >> "$tmp"

crontab "$tmp"
rm -f "$tmp"

echo "✅ Cadence configured"
echo "  - watchdog heartbeat every 5 min"
echo "  - daily report 14:05 UTC"
echo "  - daily diagnose 14:10 UTC"

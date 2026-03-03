#!/usr/bin/env bash
set -euo pipefail

DURATION_SEC="${1:-900}"
OUT="${2:-/tmp/rina-pty-torture-$(date +%Y%m%d-%H%M%S).log}"
TARGET_HOST="${3:-localhost}"
SAMPLE_INTERVAL_SEC="${4:-1}"

if ! [[ "$DURATION_SEC" =~ ^[0-9]+$ ]]; then
  echo "duration must be integer seconds" >&2
  exit 2
fi
if ! [[ "$SAMPLE_INTERVAL_SEC" =~ ^[0-9]+$ ]] || [ "$SAMPLE_INTERVAL_SEC" -lt 1 ]; then
  echo "sample interval must be integer >= 1" >&2
  exit 2
fi

echo "[pty-torture] duration=${DURATION_SEC}s target=${TARGET_HOST} interval=${SAMPLE_INTERVAL_SEC}s" | tee -a "$OUT"
start_ts=$(date +%s)
start_iso=$(date -Iseconds)
lines_total=0
bytes_total=0
tmux_ok=0
tmux_fail=0
ssh_ok=0
ssh_fail=0

# Baseline stress in current shell
end=$((start_ts + DURATION_SEC))
i=0
while [ "$(date +%s)" -lt "$end" ]; do
  i=$((i + 1))
  line=$(printf '[%s] line=%s cjk=你好 emoji=😀 zwj=👨‍👩‍👧‍👦\n' "$(date -Iseconds)" "$i")
  printf '%s' "$line" | tee -a "$OUT"
  lines_total=$((lines_total + 1))
  bytes_total=$((bytes_total + ${#line}))

  if command -v tmux >/dev/null 2>&1; then
    if tmux -V | head -n1 >/dev/null 2>&1; then
      tmux_ok=$((tmux_ok + 1))
    else
      tmux_fail=$((tmux_fail + 1))
    fi
  fi
  if command -v ssh >/dev/null 2>&1; then
    if ssh -G "$TARGET_HOST" >/dev/null 2>&1; then
      ssh_ok=$((ssh_ok + 1))
    else
      ssh_fail=$((ssh_fail + 1))
    fi
  fi
  sleep "$SAMPLE_INTERVAL_SEC"
done

end_ts=$(date +%s)
end_iso=$(date -Iseconds)
elapsed=$((end_ts - start_ts))

summary_json="${OUT%.log}.summary.json"
cat > "$summary_json" <<JSON
{
  "startedAt": "$start_iso",
  "endedAt": "$end_iso",
  "durationSec": $elapsed,
  "targetHost": "$(printf '%s' "$TARGET_HOST" | sed 's/"/\\"/g')",
  "sampleIntervalSec": $SAMPLE_INTERVAL_SEC,
  "linesTotal": $lines_total,
  "bytesTotal": $bytes_total,
  "tmuxChecks": { "ok": $tmux_ok, "fail": $tmux_fail },
  "sshChecks": { "ok": $ssh_ok, "fail": $ssh_fail },
  "logPath": "$(printf '%s' "$OUT" | sed 's/"/\\"/g')"
}
JSON

echo "[pty-torture] completed: $OUT" | tee -a "$OUT"
echo "[pty-torture] summary: $summary_json" | tee -a "$OUT"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/tmp/deploy-proof}"
OUTPUT_FILE="$OUTPUT_DIR/cloudflare-capability-checkpoint.json"

mkdir -p "$OUTPUT_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

json_escape() {
  python3 - <<'PY' "$1"
import json, sys
print(json.dumps(sys.argv[1]))
PY
}

run_step() {
  local id="$1"
  shift
  local started_at ended_at status output
  started_at="$(timestamp)"
  if output="$("$@" 2>&1)"; then
    status="passed"
  else
    status="failed"
  fi
  ended_at="$(timestamp)"
  STEP_ID="$id" STEP_STATUS="$status" STEP_STARTED="$started_at" STEP_ENDED="$ended_at" STEP_OUTPUT="$output" python3 - <<'PY'
import json, os
print(json.dumps({
  "id": os.environ["STEP_ID"],
  "status": os.environ["STEP_STATUS"],
  "startedAt": os.environ["STEP_STARTED"],
  "endedAt": os.environ["STEP_ENDED"],
  "output": os.environ["STEP_OUTPUT"],
}))
PY
  [[ "$status" == "passed" ]]
}

steps_json=()

push_step() {
  steps_json+=("$1")
}

push_step "$(run_step workspace_signals bash -lc "cd '$ROOT_DIR' && node scripts/verify-pages-routes.mjs")"
push_step "$(run_step build_pages_site bash -lc "cd '$ROOT_DIR' && node scripts/build-pages-site.mjs")"
push_step "$(run_step cloudflare_auth bash -lc "cd '$ROOT_DIR' && wrangler whoami")"
push_step "$(run_step production_trust_smoke bash -lc "cd '$ROOT_DIR' && npm run smoke:prod")"

STEPS_BLOB="$(printf '%s\n' "${steps_json[@]}")"
STEPS_JSON="$(STEPS_BLOB="$STEPS_BLOB" python3 - <<'PY'
import json, os
blob = os.environ.get("STEPS_BLOB", "")
items = [json.loads(line) for line in blob.splitlines() if line.strip()]
print(json.dumps(items))
PY
)"

ROOT_DIR="$ROOT_DIR" OUTPUT_FILE="$OUTPUT_FILE" STEPS_JSON="$STEPS_JSON" python3 - <<'PY'
import json, os

steps = json.loads(os.environ["STEPS_JSON"])
auth_step = next((step for step in steps if step["id"] == "cloudflare_auth"), None)
smoke_step = next((step for step in steps if step["id"] == "production_trust_smoke"), None)

target_identity = "Cloudflare account"
identity_evidence = []
if auth_step:
  for line in auth_step["output"].splitlines():
    stripped = line.strip()
    if stripped:
      identity_evidence.append(stripped)
  account_line = next((line for line in identity_evidence if "│" in line and len(line.split("│")) >= 3 and any(ch.isdigit() for ch in line)), None)
  if account_line:
    target_identity = account_line
  elif identity_evidence:
    target_identity = identity_evidence[0]

verification_evidence = []
if smoke_step:
  verification_evidence = [line.strip() for line in smoke_step["output"].splitlines() if line.strip().startswith("[smoke:prod]")]

payload = {
  "provider": "cloudflare",
  "checkpoint": "capability-preflight-and-verification",
  "workspace": os.environ["ROOT_DIR"],
  "artifactPath": os.environ["OUTPUT_FILE"],
  "targetIdentity": target_identity,
  "targetIdentitySource": "provider-output" if auth_step and auth_step["status"] == "passed" else "workspace-signal",
  "targetIdentityEvidence": identity_evidence,
  "verificationEvidence": verification_evidence,
  "rollbackEvidence": ["provider deployment history should be confirmed from Cloudflare before treating rollback as automatic"],
  "steps": steps,
}

with open(os.environ["OUTPUT_FILE"], "w", encoding="utf-8") as handle:
  json.dump(payload, handle, indent=2)
  handle.write("\n")

print(json.dumps(payload, indent=2))
PY

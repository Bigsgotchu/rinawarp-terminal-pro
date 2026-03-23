#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/tmp/deploy-proof}"
OUTPUT_FILE="$OUTPUT_DIR/vercel-capability-checkpoint.json"

mkdir -p "$OUTPUT_DIR"

cd "$ROOT_DIR/website"
rm -rf .pages-dist
node ../scripts/build-pages-site.mjs >/tmp/vercel-build-proof.log

AUTH_OUTPUT="$(cd "$ROOT_DIR" && vercel whoami 2>&1)"
DEPLOY_OUTPUT="$(cd "$ROOT_DIR/website/.pages-dist" && vercel deploy --yes 2>&1)"
DEPLOYMENT_ID="$(printf '%s\n' "$DEPLOY_OUTPUT" | rg -o 'dpl_[A-Za-z0-9]+' | tail -n 1)"
PREVIEW_URL="$(printf '%s\n' "$DEPLOY_OUTPUT" | rg -o 'https://[^ ]+\.vercel\.app' | tail -n 1)"
INSPECT_OUTPUT="$(cd "$ROOT_DIR/website/.pages-dist" && vercel inspect "${DEPLOYMENT_ID:-${PREVIEW_URL}}" 2>&1)"
ALIAS_URL="$(printf '%s\n' "$INSPECT_OUTPUT" | rg -o 'https://[^ ]+\.vercel\.app' | tail -n 1)"
VERIFY_URL="${ALIAS_URL:-$PREVIEW_URL}"
VERIFY_HEADERS="$(curl -sSI "$VERIFY_URL" 2>&1 || true)"

ROOT_DIR="$ROOT_DIR" OUTPUT_FILE="$OUTPUT_FILE" AUTH_OUTPUT="$AUTH_OUTPUT" DEPLOY_OUTPUT="$DEPLOY_OUTPUT" INSPECT_OUTPUT="$INSPECT_OUTPUT" VERIFY_HEADERS="$VERIFY_HEADERS" PREVIEW_URL="$PREVIEW_URL" ALIAS_URL="$ALIAS_URL" DEPLOYMENT_ID="$DEPLOYMENT_ID" python3 - <<'PY'
import json, os

auth = os.environ["AUTH_OUTPUT"]
deploy = os.environ["DEPLOY_OUTPUT"]
inspect = os.environ["INSPECT_OUTPUT"]
headers = os.environ["VERIFY_HEADERS"]
preview = os.environ.get("PREVIEW_URL", "")
alias_url = os.environ.get("ALIAS_URL", "")
deployment_id = os.environ.get("DEPLOYMENT_ID", "")

def lines(blob: str):
  return [line for line in blob.splitlines() if line.strip()]

inspect_lines = lines(inspect)
headers_lines = lines(headers)
ready = any("Ready" in line for line in inspect_lines)
protected = any("HTTP/" in line and " 401" in line for line in headers_lines)

if not ready:
  raise SystemExit("Vercel deployment did not reach Ready state")

payload = {
  "provider": "vercel",
  "checkpoint": "preview-deploy-and-provider-verify",
  "workspace": os.environ["ROOT_DIR"],
  "artifactPath": os.environ["OUTPUT_FILE"],
  "targetIdentity": auth.strip().splitlines()[0] if auth.strip() else "unknown",
  "targetIdentitySource": "provider-output",
  "targetIdentityEvidence": lines(auth),
  "verificationEvidence": inspect_lines + headers_lines,
  "rollbackEvidence": ["Vercel deployment history and alias rollback should be confirmed from the provider before treating rollback as automatic"],
  "targetUrl": alias_url or preview,
  "previewUrl": preview,
  "deploymentId": deployment_id or None,
  "access": "protected-preview" if protected else "public-preview",
  "steps": [
    {"id": "auth", "status": "passed", "output": auth},
    {"id": "deploy_preview", "status": "passed", "output": deploy},
    {"id": "inspect_deployment", "status": "passed", "output": inspect},
    {"id": "verify_url", "status": "passed" if headers_lines else "skipped", "output": headers or "No HTTP header response captured."},
  ],
}

with open(os.environ["OUTPUT_FILE"], "w", encoding="utf-8") as handle:
  json.dump(payload, handle, indent=2)
  handle.write("\n")

print(json.dumps(payload, indent=2))
PY

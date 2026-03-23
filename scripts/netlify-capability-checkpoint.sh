#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/tmp/deploy-proof}"
OUTPUT_FILE="$OUTPUT_DIR/netlify-capability-checkpoint.json"
SITE_ID="2426365b-fc27-46e6-89a2-34f21fe5f161"

mkdir -p "$OUTPUT_DIR"

cd "$ROOT_DIR/website"
rm -rf .pages-dist
node ../scripts/build-pages-site.mjs >/tmp/netlify-build-proof.log

STATUS_OUTPUT="$(netlify status --json 2>&1)"
DEPLOY_OUTPUT="$(netlify deploy --dir .pages-dist --site "$SITE_ID" --json --no-build 2>&1)"
DEPLOY_URL="$(DEPLOY_OUTPUT="$DEPLOY_OUTPUT" python3 - <<'PY'
import json, os
print(json.loads(os.environ["DEPLOY_OUTPUT"])["deploy_url"])
PY
)"
VERIFY_HEADERS="$(curl -fsSI "$DEPLOY_URL" 2>&1)"

ROOT_DIR="$ROOT_DIR" OUTPUT_FILE="$OUTPUT_FILE" STATUS_OUTPUT="$STATUS_OUTPUT" DEPLOY_OUTPUT="$DEPLOY_OUTPUT" VERIFY_HEADERS="$VERIFY_HEADERS" DEPLOY_URL="$DEPLOY_URL" python3 - <<'PY'
import json, os

status = json.loads(os.environ["STATUS_OUTPUT"])
deploy = json.loads(os.environ["DEPLOY_OUTPUT"])
headers = os.environ["VERIFY_HEADERS"]

payload = {
  "provider": "netlify",
  "checkpoint": "draft-deploy-and-verify",
  "workspace": os.environ["ROOT_DIR"],
  "artifactPath": os.environ["OUTPUT_FILE"],
  "targetIdentity": status["siteData"]["site-name"],
  "targetIdentitySource": "provider-output",
  "targetIdentityEvidence": [
    status["siteData"]["site-name"],
    status["siteData"]["site-id"],
    status["siteData"]["site-url"],
  ],
  "verificationEvidence": [line for line in headers.splitlines() if line.strip()],
  "rollbackEvidence": ["Netlify deploy history should be confirmed from the site dashboard before treating rollback as automatic"],
  "targetUrl": deploy["deploy_url"],
  "steps": [
    {"id": "status", "status": "passed", "output": json.dumps(status)},
    {"id": "deploy_draft", "status": "passed", "output": json.dumps(deploy)},
    {"id": "verify_url", "status": "passed", "output": headers},
  ],
}

with open(os.environ["OUTPUT_FILE"], "w", encoding="utf-8") as handle:
  json.dump(payload, handle, indent=2)
  handle.write("\n")

print(json.dumps(payload, indent=2))
PY

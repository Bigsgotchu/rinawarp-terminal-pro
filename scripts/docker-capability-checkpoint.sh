#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/tmp/deploy-proof}"
OUTPUT_FILE="$OUTPUT_DIR/docker-capability-checkpoint.json"
CONTAINER_NAME="rinawarp-proof-nginx"

mkdir -p "$OUTPUT_DIR"

cd "$ROOT_DIR/website"
rm -rf .pages-dist
node ../scripts/build-pages-site.mjs >/tmp/docker-build-proof.log

INFO_OUTPUT="$(cd "$ROOT_DIR" && docker info --format '{{.ServerVersion}} {{.OperatingSystem}}' 2>&1)"
RUN_OUTPUT="$(cd "$ROOT_DIR" && (docker rm -f "$CONTAINER_NAME" 2>/dev/null || true) && docker run -d --name "$CONTAINER_NAME" -p 18080:80 -v "$ROOT_DIR/website/.pages-dist:/usr/share/nginx/html:ro" nginx:alpine 2>&1)"
VERIFY_HEADERS="$(curl -fsSI http://127.0.0.1:18080 2>&1)"
PS_OUTPUT="$(cd "$ROOT_DIR" && docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1)"

ROOT_DIR="$ROOT_DIR" OUTPUT_FILE="$OUTPUT_FILE" INFO_OUTPUT="$INFO_OUTPUT" RUN_OUTPUT="$RUN_OUTPUT" VERIFY_HEADERS="$VERIFY_HEADERS" PS_OUTPUT="$PS_OUTPUT" python3 - <<'PY'
import json, os

payload = {
  "provider": "docker",
  "checkpoint": "local-container-run-and-verify",
  "workspace": os.environ["ROOT_DIR"],
  "artifactPath": os.environ["OUTPUT_FILE"],
  "targetIdentity": "rinawarp-proof-nginx",
  "targetIdentitySource": "provider-output",
  "targetIdentityEvidence": [os.environ["INFO_OUTPUT"], os.environ["PS_OUTPUT"]],
  "verificationEvidence": [line for line in os.environ["VERIFY_HEADERS"].splitlines() if line.strip()],
  "rollbackEvidence": ["local container rollback is manual unless a previous image tag is recorded"],
  "targetUrl": "http://127.0.0.1:18080",
  "steps": [
    {"id": "docker_info", "status": "passed", "output": os.environ["INFO_OUTPUT"]},
    {"id": "run_container", "status": "passed", "output": os.environ["RUN_OUTPUT"]},
    {"id": "verify_local_url", "status": "passed", "output": os.environ["VERIFY_HEADERS"]},
    {"id": "ps", "status": "passed", "output": os.environ["PS_OUTPUT"]},
  ],
}

with open(os.environ["OUTPUT_FILE"], "w", encoding="utf-8") as handle:
  json.dump(payload, handle, indent=2)
  handle.write("\n")

print(json.dumps(payload, indent=2))
PY

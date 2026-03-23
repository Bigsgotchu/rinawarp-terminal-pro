#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/tmp/deploy-proof}"
SUMMARY_FILE="$OUTPUT_DIR/deploy-capability-proof-summary.json"

mkdir -p "$OUTPUT_DIR"

cd "$ROOT_DIR"

npm run proof:cloudflare
npm run proof:vercel
npm run proof:netlify
npm run proof:docker
npm run proof:vps

OUTPUT_DIR="$OUTPUT_DIR" SUMMARY_FILE="$SUMMARY_FILE" python3 - <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

output_dir = Path(os.environ["OUTPUT_DIR"])
summary_file = Path(os.environ["SUMMARY_FILE"])

artifacts = {
    "cloudflare": output_dir / "cloudflare-capability-checkpoint.json",
    "vercel": output_dir / "vercel-capability-checkpoint.json",
    "netlify": output_dir / "netlify-capability-checkpoint.json",
    "docker": output_dir / "docker-capability-checkpoint.json",
    "vps": output_dir / "vps-capability-checkpoint.json",
}

providers = []
overall = "passed"

for provider, path in artifacts.items():
    payload = json.loads(path.read_text(encoding="utf-8"))
    steps = payload.get("steps", [])
    failed_steps = [step["id"] for step in steps if step.get("status") == "failed"]
    verification = payload.get("verificationEvidence", [])
    access = payload.get("access")

    if failed_steps:
        status = "partial"
        if overall == "passed":
            overall = "partial"
    else:
        status = "passed"

    providers.append({
        "provider": provider,
        "status": status,
        "targetIdentity": payload.get("targetIdentity"),
        "targetUrl": payload.get("targetUrl"),
        "artifactPath": str(path),
        "failedSteps": failed_steps,
        "access": access,
        "verificationEvidenceCount": len(verification),
        "rollbackEvidence": payload.get("rollbackEvidence", []),
    })

summary = {
    "overall": overall,
    "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "workspace": str(Path.cwd()),
    "artifactPath": str(summary_file),
    "providers": providers,
    "nextActions": [
        "Cloudflare, Vercel, Netlify, and Docker have real proof artifacts and can be wired into canonical deploy receipts.",
        "Vercel previews are provider-verified but access-protected; treat 401 preview headers as protected-preview evidence, not deploy failure.",
        "VPS proof is based on the live Oracle instance at 137.131.13.65; the old 158.101.1.38 host is now treated as retired stale configuration unless OCI inventory shows it live again."
    ]
}

summary_file.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
PY

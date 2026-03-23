#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/tmp/deploy-proof}"
OUTPUT_FILE="$OUTPUT_DIR/vps-capability-checkpoint.json"
OCI_BIN="${OCI_BIN:-/home/karina/lib/oracle-cli/bin/oci}"
OCI_REGION="${OCI_REGION:-us-phoenix-1}"
OCI_COMPARTMENT_ID="${OCI_COMPARTMENT_ID:-ocid1.tenancy.oc1..aaaaaaaazruptwuezlpqcarfmk2v7fkxgnlvkpu2id5tngagpksxubbagmzq}"

mkdir -p "$OUTPUT_DIR"

check_host() {
  local label="$1"
  local command="$2"
  local output status
  if output="$(bash -lc "$command" 2>&1)"; then
    status="passed"
  else
    status="failed"
  fi
  LABEL="$label" STATUS="$status" OUTPUT="$output" python3 - <<'PY'
import json, os
print(json.dumps({
  "label": os.environ["LABEL"],
  "status": os.environ["STATUS"],
  "output": os.environ["OUTPUT"],
}))
PY
}

PRIMARY_CHECK="$(check_host "rinawarp-vps" "ssh -i ~/.ssh/oracle_rinawarp.pem -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new opc@137.131.13.65 'echo VPS_OK && hostname && pwd'")"

LEGACY_PROD_CHECK="$(
  OCI_BIN="$OCI_BIN" OCI_REGION="$OCI_REGION" OCI_COMPARTMENT_ID="$OCI_COMPARTMENT_ID" python3 - <<'PY'
import json
import os
import subprocess

legacy_ip = "158.101.1.38"
oci_bin = os.environ.get("OCI_BIN")
region = os.environ.get("OCI_REGION")
compartment = os.environ.get("OCI_COMPARTMENT_ID")

payload = {
    "label": "rinawarp-prod",
    "status": "retired",
    "output": "Legacy target 158.101.1.38 is not a live OCI instance in the current compartment; treating rinawarp-prod as stale configuration.",
}

if oci_bin and os.path.exists(oci_bin):
    try:
        raw = subprocess.check_output(
            [
                oci_bin,
                "compute",
                "instance",
                "list",
                "--compartment-id",
                compartment,
                "--region",
                region,
                "--all",
                "--output",
                "json",
            ],
            text=True,
        )
        listing = json.loads(raw)
        live_instances = []
        for instance in listing.get("data", []):
            if instance.get("lifecycle-state") != "RUNNING":
                continue
            instance_id = instance.get("id")
            attachments_raw = subprocess.check_output(
                [
                    oci_bin,
                    "compute",
                    "vnic-attachment",
                    "list",
                    "--compartment-id",
                    compartment,
                    "--instance-id",
                    instance_id,
                    "--region",
                    region,
                    "--all",
                    "--output",
                    "json",
                ],
                text=True,
            )
            attachments = json.loads(attachments_raw).get("data", [])
            public_ip = None
            if attachments:
                vnic_id = attachments[0].get("vnic-id")
                if vnic_id:
                    vnic_raw = subprocess.check_output(
                        [
                            oci_bin,
                            "network",
                            "vnic",
                            "get",
                            "--vnic-id",
                            vnic_id,
                            "--region",
                            region,
                            "--output",
                            "json",
                        ],
                        text=True,
                    )
                    public_ip = json.loads(vnic_raw).get("data", {}).get("public-ip")
            live_instances.append({
                "name": instance.get("display-name"),
                "id": instance_id,
                "publicIp": public_ip,
            })
        match = next((item for item in live_instances if item.get("publicIp") == legacy_ip), None)
        if match:
            payload["status"] = "unexpected-live-target"
            payload["output"] = f"Legacy target {legacy_ip} is still live as {match['name']} ({match['id']})."
        else:
            payload["output"] = (
                f"Legacy target {legacy_ip} is not present in live OCI inventory. "
                f"Current running instance IPs: {[item.get('publicIp') for item in live_instances if item.get('publicIp')]}"
            )
    except Exception as exc:
        payload["status"] = "unknown"
        payload["output"] = f"Could not confirm legacy target status from OCI: {exc}"

print(json.dumps(payload))
PY
)"

ROOT_DIR="$ROOT_DIR" OUTPUT_FILE="$OUTPUT_FILE" PRIMARY_CHECK="$PRIMARY_CHECK" LEGACY_PROD_CHECK="$LEGACY_PROD_CHECK" python3 - <<'PY'
import json, os

primary = json.loads(os.environ["PRIMARY_CHECK"])
legacy = json.loads(os.environ["LEGACY_PROD_CHECK"])

payload = {
  "provider": "vps",
  "checkpoint": "ssh-target-verification",
  "workspace": os.environ["ROOT_DIR"],
  "artifactPath": os.environ["OUTPUT_FILE"],
  "targetIdentity": "rinawarp-vps",
  "targetIdentitySource": "ssh-config",
  "targetIdentityEvidence": ["~/.ssh/config host aliases rinawarp-vps and rinawarp-prod", "OCI inventory checked for live instance IP ownership"],
  "verificationEvidence": [],
  "rollbackEvidence": ["manual rollback only until a deployment path and previous release marker are verified on the live VPS"],
  "steps": [
    {"id": "check_rinawarp_vps", "status": primary["status"], "output": primary["output"]},
    {"id": "legacy_rinawarp_prod", "status": legacy["status"], "output": legacy["output"]},
  ],
}

with open(os.environ["OUTPUT_FILE"], "w", encoding="utf-8") as handle:
  json.dump(payload, handle, indent=2)
  handle.write("\n")

print(json.dumps(payload, indent=2))
PY

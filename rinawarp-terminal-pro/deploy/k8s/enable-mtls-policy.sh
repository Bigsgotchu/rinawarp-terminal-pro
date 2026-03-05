#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POLICY_FILE="$ROOT_DIR/deploy/k8s/rinawarp-mtls-policy.yaml"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "missing policy file: $POLICY_FILE" >&2
  exit 1
fi

echo "==> checking Istio CRDs"
if ! kubectl get crd peerauthentications.security.istio.io >/dev/null 2>&1; then
  echo "missing CRD: peerauthentications.security.istio.io" >&2
  echo "Install Istio first, then rerun this script." >&2
  echo "Quick path:" >&2
  echo "  1) install istioctl from https://istio.io/latest/docs/setup/getting-started/" >&2
  echo "  2) istioctl install --set profile=minimal -y" >&2
  exit 2
fi
if ! kubectl get crd destinationrules.networking.istio.io >/dev/null 2>&1; then
  echo "missing CRD: destinationrules.networking.istio.io" >&2
  echo "Install Istio first, then rerun this script." >&2
  exit 2
fi

echo "==> ensuring namespace 'rinawarp'"
kubectl create namespace rinawarp --dry-run=client -o yaml | kubectl apply -f -

echo "==> applying strict mTLS policy"
kubectl apply -f "$POLICY_FILE"

echo "==> done"
kubectl -n rinawarp get peerauthentication,destinationrule

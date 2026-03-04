#!/usr/bin/env bash
set -euo pipefail

# Cross-account attestation verifier cutover.
# Requires:
# - AWS CLI v2 authenticated for both accounts via named profiles.
# - kubectl context for verifier EKS cluster.
#
# Usage:
#   source deploy/aws/scripts/cross-account-attestation.env
#   bash deploy/aws/scripts/cross-account-attestation-cutover.sh
#
# Optional:
#   DRY_RUN=1 bash deploy/aws/scripts/cross-account-attestation-cutover.sh

require() {
  local v="$1"
  if [[ -z "${!v:-}" ]]; then
    echo "missing required env: $v" >&2
    exit 1
  fi
}

for var in \
  PRODUCER_PROFILE VERIFIER_PROFILE \
  PRODUCER_ACCOUNT_ID VERIFIER_ACCOUNT_ID \
  PRODUCER_REGION VERIFIER_REGION \
  PRODUCER_BUCKET VERIFIER_BUCKET \
  REPLICATION_ROLE_NAME VERIFIER_ROLE_NAME \
  VERIFIER_CLUSTER_NAME VERIFIER_CLUSTER_REGION \
  VERIFIER_OIDC_ID VERIFIER_ALERT_WEBHOOK \
  VERIFIER_INPUT_OBJECT_KEY; do
  require "$var"
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
DRY_RUN="${DRY_RUN:-0}"
SKIP_K8S_DEPLOY="${SKIP_K8S_DEPLOY:-0}"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

preflight_aws_profile() {
  local profile="$1"
  local expected_account="$2"
  local region="$3"
  local endpoint
  endpoint="$(aws --profile "$profile" configure get endpoint_url 2>/dev/null || true)"
  if [[ -n "$endpoint" ]]; then
    echo "profile '$profile' has endpoint_url set ($endpoint). This is usually non-AWS (e.g., R2)." >&2
    echo "clear it with: aws configure set profile.${profile}.endpoint_url \"\"" >&2
    exit 1
  fi
  local account
  account="$(aws --profile "$profile" --region "$region" sts get-caller-identity --query Account --output text 2>/dev/null || true)"
  if [[ -z "$account" || "$account" == "None" ]]; then
    echo "unable to resolve AWS account for profile '$profile' in region '$region' (STS failed)." >&2
    exit 1
  fi
  if [[ "$account" != "$expected_account" ]]; then
    echo "profile '$profile' account mismatch: expected '$expected_account', got '$account'." >&2
    exit 1
  fi
}

echo "==> Preflight: validating AWS profiles"
preflight_aws_profile "$PRODUCER_PROFILE" "$PRODUCER_ACCOUNT_ID" "$PRODUCER_REGION"
preflight_aws_profile "$VERIFIER_PROFILE" "$VERIFIER_ACCOUNT_ID" "$VERIFIER_REGION"
if [[ "$SKIP_K8S_DEPLOY" != "1" ]] && [[ "$DRY_RUN" != "1" ]]; then
  if ! command -v kubectl >/dev/null 2>&1; then
    echo "kubectl is not installed or not on PATH. Install kubectl or run with SKIP_K8S_DEPLOY=1." >&2
    exit 1
  fi
fi

echo "==> Creating verifier bucket in verifier account"
# us-east-1 doesn't require LocationConstraint
if [[ "$VERIFIER_REGION" == "us-east-1" ]]; then
  run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api create-bucket \
    --bucket "$VERIFIER_BUCKET" >/dev/null 2>&1 || true
else
  run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api create-bucket \
    --bucket "$VERIFIER_BUCKET" \
    --create-bucket-configuration "LocationConstraint=$VERIFIER_REGION" >/dev/null 2>&1 || true
fi
run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api put-bucket-versioning \
  --bucket "$VERIFIER_BUCKET" \
  --versioning-configuration Status=Enabled

echo "==> Applying verifier bucket policy"
# First create the roles, then apply the policy
echo "==> Creating replication role in producer account (needed for bucket policy)"
cat > "$TMP_DIR/replication-role-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${PRODUCER_BUCKET}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::${PRODUCER_BUCKET}/attestations/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags",
        "s3:ObjectOwnerOverrideToBucketOwner"
      ],
      "Resource": "arn:aws:s3:::${VERIFIER_BUCKET}/attestations/*"
    }
  ]
}
JSON

cat > "$TMP_DIR/replication-trust-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

run aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" iam create-role \
  --role-name "$REPLICATION_ROLE_NAME" \
  --assume-role-policy-document "file://$TMP_DIR/replication-trust-policy.json" >/dev/null 2>&1 || true
run aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" iam put-role-policy \
  --role-name "$REPLICATION_ROLE_NAME" \
  --policy-name "${REPLICATION_ROLE_NAME}-policy" \
  --policy-document "file://$TMP_DIR/replication-role-policy.json"

echo "==> Creating verifier IAM role (needed for bucket policy)"
sed \
  -e "s/222222222222/${VERIFIER_ACCOUNT_ID}/g" \
  -e "s/REPLACE_VERIFIER_OIDC_ID/${VERIFIER_OIDC_ID}/g" \
  "$ROOT_DIR/deploy/aws/verifier-account/iam/rinawarp-verifier-trust-policy.json" > "$TMP_DIR/verifier-trust-policy.json"
sed \
  -e "s/rinawarp-attestation-verifier/${VERIFIER_BUCKET}/g" \
  "$ROOT_DIR/deploy/aws/verifier-account/iam/rinawarp-verifier-policy.json" > "$TMP_DIR/verifier-policy.json"

run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam create-role \
  --role-name "$VERIFIER_ROLE_NAME" \
  --assume-role-policy-document "file://$TMP_DIR/verifier-trust-policy.json" >/dev/null 2>&1 || true
run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam put-role-policy \
  --role-name "$VERIFIER_ROLE_NAME" \
  --policy-name "${VERIFIER_ROLE_NAME}-policy" \
  --policy-document "file://$TMP_DIR/verifier-policy.json"

# Now apply the bucket policy (roles now exist)
sed \
  -e "s/111111111111/${PRODUCER_ACCOUNT_ID}/g" \
  -e "s/222222222222/${VERIFIER_ACCOUNT_ID}/g" \
  "$ROOT_DIR/deploy/aws/verifier-account/s3/attestation-target-bucket-policy.json" > "$TMP_DIR/verifier-bucket-policy.json"
run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api put-bucket-policy \
  --bucket "$VERIFIER_BUCKET" \
  --policy "file://$TMP_DIR/verifier-bucket-policy.json"

echo "==> Configuring producer bucket replication"
run aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" s3api put-bucket-versioning \
  --bucket "$PRODUCER_BUCKET" \
  --versioning-configuration Status=Enabled

cat > "$TMP_DIR/replication-config.json" <<JSON
{
  "Role": "arn:aws:iam::${PRODUCER_ACCOUNT_ID}:role/${REPLICATION_ROLE_NAME}",
  "Rules": [
    {
      "ID": "attestation-cross-account-replication",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": { "Prefix": "attestations/" },
      "DeleteMarkerReplication": { "Status": "Enabled" },
      "Destination": {
        "Bucket": "arn:aws:s3:::${VERIFIER_BUCKET}",
        "Account": "${VERIFIER_ACCOUNT_ID}",
        "AccessControlTranslation": { "Owner": "Destination" }
      }
    }
  ]
}
JSON

run aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" s3api put-bucket-replication \
  --bucket "$PRODUCER_BUCKET" \
  --replication-configuration "file://$TMP_DIR/replication-config.json"

echo "==> Creating verifier IAM role (IRSA)"
sed \
  -e "s/222222222222/${VERIFIER_ACCOUNT_ID}/g" \
  -e "s/REPLACE_VERIFIER_OIDC_ID/${VERIFIER_OIDC_ID}/g" \
  "$ROOT_DIR/deploy/aws/verifier-account/iam/rinawarp-verifier-trust-policy.json" > "$TMP_DIR/verifier-trust-policy.json"
sed \
  -e "s/rinawarp-attestation-verifier/${VERIFIER_BUCKET}/g" \
  "$ROOT_DIR/deploy/aws/verifier-account/iam/rinawarp-verifier-policy.json" > "$TMP_DIR/verifier-policy.json"

if [[ "$DRY_RUN" == "1" ]]; then
  run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam put-role-policy \
    --role-name "$VERIFIER_ROLE_NAME" \
    --policy-name "${VERIFIER_ROLE_NAME}-policy" \
    --policy-document "file://$TMP_DIR/verifier-policy.json"
else
  role_exists="$(aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam get-role --role-name "$VERIFIER_ROLE_NAME" --query 'Role.RoleName' --output text 2>/dev/null || true)"
  if [[ -z "$role_exists" || "$role_exists" == "None" ]]; then
    run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam create-role \
      --role-name "$VERIFIER_ROLE_NAME" \
      --assume-role-policy-document "file://$TMP_DIR/verifier-trust-policy.json" >/dev/null
  else
    run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam update-assume-role-policy \
      --role-name "$VERIFIER_ROLE_NAME" \
      --policy-document "file://$TMP_DIR/verifier-trust-policy.json" >/dev/null
  fi
  run aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam put-role-policy \
    --role-name "$VERIFIER_ROLE_NAME" \
    --policy-name "${VERIFIER_ROLE_NAME}-policy" \
    --policy-document "file://$TMP_DIR/verifier-policy.json"
fi

echo "==> Deploying verifier cron in verifier EKS"
if [[ "$SKIP_K8S_DEPLOY" == "1" ]]; then
  echo "==> Skipping Kubernetes deployment (SKIP_K8S_DEPLOY=1)"
else
  run aws --profile "$VERIFIER_PROFILE" eks update-kubeconfig \
    --name "$VERIFIER_CLUSTER_NAME" \
    --region "$VERIFIER_CLUSTER_REGION" >/dev/null

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] kubectl create/apply namespace rinawarp-verifier"
    echo "[dry-run] kubectl create/apply secret rinawarp-verifier-secrets"
    echo "[dry-run] kubectl apply -f $ROOT_DIR/deploy/k8s/rinawarp-attestation-verifier-cronjob.yaml"
  else
    kubectl create namespace rinawarp-verifier --dry-run=client -o yaml | kubectl apply -f -
    kubectl -n rinawarp-verifier create secret generic rinawarp-verifier-secrets \
    --from-literal=alert_webhook="$VERIFIER_ALERT_WEBHOOK" \
    --from-literal=input_s3_uri="s3://${VERIFIER_BUCKET}/${VERIFIER_INPUT_OBJECT_KEY}" \
      --dry-run=client -o yaml | kubectl apply -f -
    kubectl apply -f "$ROOT_DIR/deploy/k8s/rinawarp-attestation-verifier-cronjob.yaml"
  fi
fi

echo
echo "Cutover complete."
echo "Verify:"
echo "  aws --profile $PRODUCER_PROFILE s3api get-bucket-replication --bucket $PRODUCER_BUCKET"
echo "  kubectl -n rinawarp-verifier get cronjob rinawarp-attestation-verifier"

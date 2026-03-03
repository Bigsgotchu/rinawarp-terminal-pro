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

echo "==> Creating verifier bucket in verifier account"
aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api create-bucket \
  --bucket "$VERIFIER_BUCKET" \
  --create-bucket-configuration "LocationConstraint=$VERIFIER_REGION" >/dev/null || true
aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api put-bucket-versioning \
  --bucket "$VERIFIER_BUCKET" \
  --versioning-configuration Status=Enabled

echo "==> Applying verifier bucket policy"
sed \
  -e "s/111111111111/${PRODUCER_ACCOUNT_ID}/g" \
  -e "s/222222222222/${VERIFIER_ACCOUNT_ID}/g" \
  "$ROOT_DIR/deploy/aws/verifier-account/s3/attestation-target-bucket-policy.json" > "$TMP_DIR/verifier-bucket-policy.json"
aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" s3api put-bucket-policy \
  --bucket "$VERIFIER_BUCKET" \
  --policy "file://$TMP_DIR/verifier-bucket-policy.json"

echo "==> Creating replication role policy in producer account"
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

aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" iam create-role \
  --role-name "$REPLICATION_ROLE_NAME" \
  --assume-role-policy-document "file://$TMP_DIR/replication-trust-policy.json" >/dev/null || true
aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" iam put-role-policy \
  --role-name "$REPLICATION_ROLE_NAME" \
  --policy-name "${REPLICATION_ROLE_NAME}-policy" \
  --policy-document "file://$TMP_DIR/replication-role-policy.json"

echo "==> Configuring producer bucket replication"
aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" s3api put-bucket-versioning \
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

aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" s3api put-bucket-replication \
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

aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam create-role \
  --role-name "$VERIFIER_ROLE_NAME" \
  --assume-role-policy-document "file://$TMP_DIR/verifier-trust-policy.json" >/dev/null || true
aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" iam put-role-policy \
  --role-name "$VERIFIER_ROLE_NAME" \
  --policy-name "${VERIFIER_ROLE_NAME}-policy" \
  --policy-document "file://$TMP_DIR/verifier-policy.json"

echo "==> Deploying verifier cron in verifier EKS"
aws --profile "$VERIFIER_PROFILE" eks update-kubeconfig \
  --name "$VERIFIER_CLUSTER_NAME" \
  --region "$VERIFIER_CLUSTER_REGION" >/dev/null

kubectl create namespace rinawarp-verifier --dry-run=client -o yaml | kubectl apply -f -
kubectl -n rinawarp-verifier create secret generic rinawarp-verifier-secrets \
  --from-literal=alert_webhook="$VERIFIER_ALERT_WEBHOOK" \
  --from-literal=input_s3_uri="s3://${VERIFIER_BUCKET}/${VERIFIER_INPUT_OBJECT_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f "$ROOT_DIR/deploy/k8s/rinawarp-attestation-verifier-cronjob.yaml"

echo
echo "Cutover complete."
echo "Verify:"
echo "  aws --profile $PRODUCER_PROFILE s3api get-bucket-replication --bucket $PRODUCER_BUCKET"
echo "  kubectl -n rinawarp-verifier get cronjob rinawarp-attestation-verifier"

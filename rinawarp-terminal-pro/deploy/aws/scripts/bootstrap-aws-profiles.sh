#!/usr/bin/env bash
set -euo pipefail

# Bootstrap AWS CLI profiles non-interactively.
#
# Required env vars:
#   PRODUCER_PROFILE
#   PRODUCER_AWS_ACCESS_KEY_ID
#   PRODUCER_AWS_SECRET_ACCESS_KEY
#   PRODUCER_REGION
#   VERIFIER_PROFILE
#   VERIFIER_AWS_ACCESS_KEY_ID
#   VERIFIER_AWS_SECRET_ACCESS_KEY
#   VERIFIER_REGION
#
# Optional:
#   PRODUCER_AWS_SESSION_TOKEN
#   VERIFIER_AWS_SESSION_TOKEN

need() {
  local v="$1"
  if [[ -z "${!v:-}" ]]; then
    echo "missing env: $v" >&2
    exit 1
  fi
}

for v in \
  PRODUCER_PROFILE PRODUCER_AWS_ACCESS_KEY_ID PRODUCER_AWS_SECRET_ACCESS_KEY PRODUCER_REGION \
  VERIFIER_PROFILE VERIFIER_AWS_ACCESS_KEY_ID VERIFIER_AWS_SECRET_ACCESS_KEY VERIFIER_REGION; do
  need "$v"
done

write_profile() {
  local profile="$1"
  local key_id="$2"
  local secret="$3"
  local region="$4"
  local session="${5:-}"

  aws configure set "profile.${profile}.aws_access_key_id" "$key_id"
  aws configure set "profile.${profile}.aws_secret_access_key" "$secret"
  aws configure set "profile.${profile}.region" "$region"
  aws configure set "profile.${profile}.output" "json"
  # Clear any non-AWS endpoint accidentally inherited.
  aws configure set "profile.${profile}.endpoint_url" ""
  if [[ -n "$session" ]]; then
    aws configure set "profile.${profile}.aws_session_token" "$session"
  fi
}

echo "==> Writing AWS profile: ${PRODUCER_PROFILE}"
write_profile \
  "$PRODUCER_PROFILE" \
  "$PRODUCER_AWS_ACCESS_KEY_ID" \
  "$PRODUCER_AWS_SECRET_ACCESS_KEY" \
  "$PRODUCER_REGION" \
  "${PRODUCER_AWS_SESSION_TOKEN:-}"

echo "==> Writing AWS profile: ${VERIFIER_PROFILE}"
write_profile \
  "$VERIFIER_PROFILE" \
  "$VERIFIER_AWS_ACCESS_KEY_ID" \
  "$VERIFIER_AWS_SECRET_ACCESS_KEY" \
  "$VERIFIER_REGION" \
  "${VERIFIER_AWS_SESSION_TOKEN:-}"

echo "==> Validating STS identity for both profiles"
aws --profile "$PRODUCER_PROFILE" --region "$PRODUCER_REGION" sts get-caller-identity --output table
aws --profile "$VERIFIER_PROFILE" --region "$VERIFIER_REGION" sts get-caller-identity --output table

echo "Profiles bootstrapped successfully."

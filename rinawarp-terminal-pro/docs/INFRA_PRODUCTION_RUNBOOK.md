# RinaWarp Production Infra Runbook

Date: 2026-03-03

## Scope Closed In This Pass

- JetStream cluster manifests (3-node StatefulSet): `deploy/k8s/nats-jetstream.yaml`
- Runtime controller deployment split from API process: `deploy/k8s/rinawarp-runtime-controller.yaml`
- IRSA service account template: `deploy/k8s/rinawarp-serviceaccount.yaml`
- Network policies for NATS/controller traffic: `deploy/k8s/networkpolicy-rinawarp.yaml`
- SOC2 attestation cron schedule: `deploy/k8s/rinawarp-attestation-cronjob.yaml`
- Traffic reconciliation cron schedule: `deploy/k8s/rinawarp-traffic-reconcile-cronjob.yaml`
- Health probe cron schedule: `deploy/k8s/rinawarp-health-probes-cronjob.yaml`
- External attestation verifier cron: `deploy/k8s/rinawarp-attestation-verifier-cronjob.yaml`
- Verifier namespace hardening policies: `deploy/k8s/rinawarp-verifier-hardening.yaml`
- IAM policy + trust templates for KMS/S3 object-lock path:
  - `deploy/aws/iam/rinawarp-agentd-policy.json`
  - `deploy/aws/iam/rinawarp-agentd-trust-policy.json`

## Runtime Controller Mode

- API server enqueue can now run in two modes:
  - `RINAWARP_RUNTIME_EXECUTION_MODE=inline` (default)
  - `RINAWARP_RUNTIME_EXECUTION_MODE=external` (controller picks queued tasks)
- Controller entrypoint:
  - `rinawarp-runtime-controller`
  - `npm --workspace packages/rinawarp-agentd run runtime:controller`

## Recommended Production Env

- `NODE_ENV=production`
- `RINAWARP_NATS_MODE=jetstream`
- `RINAWARP_NATS_REQUIRED=true`
- `RINAWARP_NATS_URL=nats://nats.rinawarp-system.svc.cluster.local:4222`
- `RINAWARP_RUNTIME_EXECUTION_MODE=external`
- `RINAWARP_RUNTIME_BACKEND=k8s`
- `RINAWARP_REDIS_REST_URL=<upstash_or_redis_rest_url>`
- `RINAWARP_REDIS_REST_TOKEN=<token>`
- `RINAWARP_VAULT_PROVIDER=aws-kms`
- `RINAWARP_AWS_KMS_KEY_ID=<kms_key_arn_or_id>`

## Apply Order (Kubernetes)

1. `kubectl apply -f deploy/k8s/nats-jetstream.yaml`
2. `kubectl apply -f deploy/k8s/rinawarp-serviceaccount.yaml`
3. `kubectl apply -f deploy/k8s/rinawarp-runtime-rbac.yaml`
4. `kubectl apply -f deploy/k8s/networkpolicy-rinawarp.yaml`
5. `kubectl apply -f deploy/k8s/rinawarp-runtime-controller.yaml`
6. `kubectl apply -f deploy/k8s/rinawarp-attestation-cronjob.yaml`
7. `kubectl apply -f deploy/k8s/rinawarp-traffic-reconcile-cronjob.yaml`
8. `kubectl apply -f deploy/k8s/rinawarp-health-probes-cronjob.yaml`
9. `kubectl apply -f deploy/k8s/rinawarp-attestation-verifier-cronjob.yaml`
10. `kubectl apply -f deploy/k8s/rinawarp-verifier-hardening.yaml`

## AWS IAM Notes

- Replace all placeholder account/region/OIDC values before apply.
- Attach `deploy/aws/iam/rinawarp-agentd-policy.json` to role `rinawarp-agentd`.
- Use `deploy/aws/iam/rinawarp-agentd-trust-policy.json` as role trust.
- Ensure S3 bucket has Object Lock enabled at creation.

## External Verifier Trust Boundary

- Verifier should run in a separate AWS account and namespace.
- Baseline templates:
  - `deploy/aws/verifier-account/iam/rinawarp-verifier-policy.json`
  - `deploy/aws/verifier-account/iam/rinawarp-verifier-trust-policy.json`
  - `deploy/aws/verifier-account/s3/attestation-target-bucket-policy.json`
  - `deploy/aws/producer-account/s3/attestation-replication-policy.json`
- Verifier cron reads attestation object via:
  - `RINAWARP_VERIFIER_INPUT_S3_URI=s3://rinawarp-attestation-verifier/attestations/<key>.json`

### One-Pass Cutover Script

0. Bootstrap AWS profiles (non-interactive optional path):
   - `cp deploy/aws/scripts/bootstrap-aws-profiles.env.example deploy/aws/scripts/bootstrap-aws-profiles.env`
   - fill values, then:
   - `source deploy/aws/scripts/bootstrap-aws-profiles.env`
   - `bash deploy/aws/scripts/bootstrap-aws-profiles.sh`
1. Copy env template:
   - `cp deploy/aws/scripts/cross-account-attestation.env.example deploy/aws/scripts/cross-account-attestation.env`
2. Fill real account IDs, cluster, OIDC, and independent alert webhook.
3. Run:
   - `source deploy/aws/scripts/cross-account-attestation.env`
   - `bash deploy/aws/scripts/cross-account-attestation-cutover.sh`

## Leader Election

- Enabled by default in controller manifest:
  - `RINAWARP_RUNTIME_CONTROLLER_LEADER_ELECTION=true`
- Lease object:
  - `RINAWARP_RUNTIME_LEASE_NAME=rinawarp-runtime-controller`
  - `RINAWARP_RUNTIME_LEASE_DURATION_SEC=15`
- RBAC for leases is defined in:
  - `deploy/k8s/rinawarp-runtime-rbac.yaml`

## Remaining Hard Gaps

- Multi-region active-active control/data-plane split with automated health probes (currently operator-triggered health updates).
- Formal SOC2 immutable log attestation pipeline with independent external verifier service.
- Full K8s controller/operator reconciliation with leases and optimistic locking.

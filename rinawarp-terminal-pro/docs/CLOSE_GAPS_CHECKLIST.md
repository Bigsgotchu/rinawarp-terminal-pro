# RinaWarp Close-Gaps Checklist

Date: 2026-03-04

## Latest Verification Snapshot (2026-03-04)

- `packages/rinawarp-agentd` tests: `67/67` passing.
- Cross-account S3 replication: configured (`rinawarp-audit-archive` -> `rinawarp-attestation-verifier`, `attestations/` prefix).
- Verifier cron + hardening resources: applied in `rinawarp-verifier` namespace.
- **External runtime proof: ✅ CLOSED**
  - IRSA trust policy fixed (was: `default` SA, now: `rinawarp-attestation-verifier` SA).
  - Manual verifier job `verify-now-1772602874` completed successfully.
  - S3 read access confirmed.
  - Attestation validation working against `s3://rinawarp-attestation-verifier/attestations/latest.ndjson` (`ok:true`, `invalid:0`).

## Block 1: Automated Health + Failover Policy

- [x] Region health API surface (`/v1/platform/regions/health`).
- [x] Policy-triggered failover endpoint (`/v1/platform/regions/failover`).
- [x] Health probe service + scheduler endpoints:
  - `PUT /v1/platform/health-probes/config`
  - `GET /v1/platform/health-probes/status`
  - `POST /v1/platform/health-probes/run`
- [x] Kubernetes cron surface:
  - `deploy/k8s/rinawarp-health-probes-cronjob.yaml`
- [x] Weighted probe classes + thresholds (`app/db/queue/control-plane`).
- [x] Hysteresis/cooldown failover policy state machine.
- [x] Replace static endpoint lists with service discovery-backed probe discovery (`k8s-services` mode).

## Block 2: Active-Active Data Plane

- [x] Region assignment + manual failover controls.
- [ ] Conflict-safe multi-region write protocol (version vectors/CRDT/event reconciliation policy).
- [ ] Cross-region data replication validation and replay drills.
- [x] Automated traffic reconciliation after health-driven failover decisions.

## Block 3: SOC2 External Verifier

- [x] Hash-chain SOC2 logging.
- [x] Attestation record generation + optional S3/webhook anchor.
- [x] Verification endpoint + alert webhook trigger:
  - `POST /v1/platform/attestation/verify`
- [x] Independent verifier process surface (`rinawarp-attestation-verifier`) + isolated cron template.
- [x] Separate-account IAM/S3 policy templates committed for verifier trust boundary.
- [x] Deploy verifier in separate account/trust boundary with independent credential chain.
- [x] Immutable evidence export pipeline + alert routing integration.

## Block 4: Operator Reconciliation Maturity

- [x] Runtime controller process split.
- [x] Lease-based leader election.
- [ ] Full reconcile loops per resource type (runtime, traffic, attestation, archive).
- [ ] Drift correction and stuck-resource remediation policies.

## Block 5: Security + Compliance Hardening

- [x] IRSA templates, object lock path, Redis prod requirement.
- [x] Verifier namespace baseline hardening (Pod Security labels, NetworkPolicy, ResourceQuota, LimitRange).
- [ ] End-to-end mTLS service mesh policy.
- [ ] Token lifecycle hardening (revocation windows, key custody audits).
- [ ] Continuous control evidence and runbook validation drills.

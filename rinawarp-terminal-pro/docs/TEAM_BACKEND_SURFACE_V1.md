# Team Backend Surface (Agentd v1)

Date: 2026-03-03

This is the current server-backed team surface implemented in `packages/rinawarp-agentd/src/server.ts`.

## Implemented Endpoints

- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/account/plan`
- `GET /v1/platform/regions`
- `PUT /v1/platform/archive/config`
- `GET /v1/platform/archive/status`
- `POST /v1/platform/archive/run`
- `POST /v1/workspaces`
- `GET /v1/workspaces/{workspace_id}`
- `PUT /v1/workspaces/{workspace_id}/region`
- `POST /v1/workspaces/{workspace_id}/invites`
- `GET /v1/workspaces/{workspace_id}/invites`
- `POST /v1/invites/accept`
- `POST /v1/invites/{invite_id}/revoke`
- `PUT /v1/workspaces/{workspace_id}/billing/enforce`
- `POST /v1/workspaces/{workspace_id}/lock`
- `POST /v1/workspaces/{workspace_id}/unlock`
- `GET /v1/workspaces/{workspace_id}/audit`
- `PUT /v1/admin/security/invites`
- `POST /v1/admin/security/invites/rotate-keys`
- `POST /v1/vault/store`
- `GET /v1/vault/retrieve`
- `POST /v1/vault/rotate`
- `PUT /v1/admin/email/config`
- `GET /v1/admin/email/config`
- `POST /v1/admin/email/test`
- `PUT /v1/admin/audit/retention`
- `GET /v1/admin/audit/status`
- `POST /v1/admin/audit/cleanup`
- `GET /v1/workspaces/{workspace_id}/sync/state`
- `POST /v1/workspaces/{workspace_id}/sync/pull`
- `POST /v1/workspaces/{workspace_id}/sync/push`
- `POST /v1/runtime/tasks`
- `GET /v1/runtime/tasks`
- `GET /v1/runtime/tasks/{task_id}`
- `GET /v1/ws` (HTTP response `426`; WebSocket upgrade path is active on same URL)

## Storage

- Workspace state: `workspace-state.json`
- Audit log: `workspace-audit.ndjson`
- Both files live under `RINAWARP_AGENT_HOME` (via `paths().baseDir`).

## Security/Behavior Included

- Optional signed access/refresh tokens (`RINAWARP_AGENTD_AUTH_SECRET`).
- SOC2-style append-only hash-chained logs are written to `soc2-audit.ndjson`.
- Vault service stores encrypted tokens with envelope encryption and key rotation support.
- Vault provider modes: `local` and `aws-kms` (`RINAWARP_VAULT_PROVIDER=aws-kms`, `RINAWARP_AWS_KMS_KEY_ID`).
- WebSocket gateway is active for workspace event streaming.
- NATS bridge supports `core` and `jetstream` modes (`RINAWARP_NATS_MODE=jetstream`):
  - JetStream stream auto-provision (`WORKSPACE_EVENTS`)
  - Durable consumer replay checkpoint persisted at `eventbus-jetstream-state.json`
  - Explicit ack + dead-letter publishing (`workspace.{id}.dlq`) for invalid event payloads
- Invite tokens are generated randomly and stored hashed (`sha256` with rotating salt+key version).
- Invite accept is single-use (`pending` -> `accepted`) with expiry handling.
- Brute-force protection for invite token attempts (`423 locked` after threshold).
- Workspace lock blocks invite creation and sync push mutations.
- All workspace/invite/security/billing/sync mutations append immutable audit entries.
- Invite email dispatch supports provider config with `sendmail`/`log` fallback and outbox trace (`email-outbox.ndjson`).
- Invite create/accept security can use Redis REST (`RINAWARP_REDIS_REST_URL`, `RINAWARP_REDIS_REST_TOKEN`) with local fallback.
- Redis is mandatory in `NODE_ENV=production` for invite security endpoints.
- Runtime backend can run as `local` or `k8s` (`RINAWARP_RUNTIME_BACKEND=k8s`) with Kubernetes job submission.
- K8s runtime includes:
  - Watch-based pod lifecycle tracking
  - Exponential retry policy (`max_attempts`, `initial_delay_sec`)
  - Streamed pod logs via workspace events
  - TTL retention policy controls for succeeded/failed jobs
- Archive S3 path uses native AWS SDK APIs (no shelling out) and supports:
  - Bucket provisioning with Object Lock + versioning + lifecycle + public access block
  - Upload verification fields (`upload_etag`, `upload_version_id`)

## Known Gaps To Reach Full Production Contract

- SMTP provider credentials are stored but delivery currently uses local `sendmail` path (no direct SMTP handshake client yet).
- JWT-like signed tokens exist, but no full account identity provider integration (passwordless/email-code/MFA/session revocation).
- No seat counting against paid plan from billing provider.
- NATS clustering/replica topology is external infra; agentd does not bootstrap NATS cluster nodes.
- Full Kubernetes controller reconciliation loop is not yet split into a dedicated control-plane process (current lifecycle runs in-process).
- Idempotency enforcement is active for key mutation routes, but not yet universal across all mutating endpoints.

## CLI Surface (Current)

Implemented in `packages/rinawarp-agentd/src/cli/rinawarp.ts`:

- `rinawarp login --email ... [--password ...]`
- `rinawarp account plan`
- `rinawarp workspace init --name ... [--region ...]`
- `rinawarp team invite create --email ... [--role ...] [--workspace-id ...]`
- `rinawarp team invite accept --token ...`
- `rinawarp audit query --workspace-id ... [--type ...]`
- `rinawarp sync status --workspace-id ...`

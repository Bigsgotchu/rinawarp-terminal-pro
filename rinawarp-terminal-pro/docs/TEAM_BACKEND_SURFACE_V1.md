# Team Backend Surface (Agentd v1)

Date: 2026-03-03

This is the current server-backed team surface implemented in `packages/rinawarp-agentd/src/server.ts`.

## Implemented Endpoints

- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/account/plan`
- `POST /v1/workspaces`
- `GET /v1/workspaces/{workspace_id}`
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
- `PUT /v1/admin/email/config`
- `GET /v1/admin/email/config`
- `POST /v1/admin/email/test`
- `PUT /v1/admin/audit/retention`
- `GET /v1/admin/audit/status`
- `POST /v1/admin/audit/cleanup`
- `GET /v1/workspaces/{workspace_id}/sync/state`
- `POST /v1/workspaces/{workspace_id}/sync/pull`
- `POST /v1/workspaces/{workspace_id}/sync/push`

## Storage

- Workspace state: `workspace-state.json`
- Audit log: `workspace-audit.ndjson`
- Both files live under `RINAWARP_AGENT_HOME` (via `paths().baseDir`).

## Security/Behavior Included

- Optional signed access/refresh tokens (`RINAWARP_AGENTD_AUTH_SECRET`).
- Invite tokens are generated randomly and stored hashed (`sha256` with rotating salt+key version).
- Invite accept is single-use (`pending` -> `accepted`) with expiry handling.
- Brute-force protection for invite token attempts (`423 locked` after threshold).
- Workspace lock blocks invite creation and sync push mutations.
- All workspace/invite/security/billing/sync mutations append immutable audit entries.
- Invite email dispatch supports provider config with `sendmail`/`log` fallback and outbox trace (`email-outbox.ndjson`).

## Known Gaps To Reach Full Production Contract

- SMTP provider credentials are stored but delivery currently uses local `sendmail` path (no direct SMTP handshake client yet).
- JWT-like signed tokens exist, but no full account identity provider integration (passwordless/email-code/MFA/session revocation).
- No seat counting against paid plan from billing provider.
- No Redis-backed distributed rate limiting/counters.
- No S3 archive writer (retention config is stored; cleanup is local).
- No NATS/WebSocket live fan-out for realtime sync stream.
- No idempotency key enforcement headers on POST routes yet.

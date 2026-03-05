# Top 6 Competitive Gap Execution Board (30 Days)

Date: 2026-03-05
Owner: RinaWarp Core
Status: In Progress

## Scope
This board tracks the six capability gaps identified against Cursor/Warp/Windsurf-class products:

1. Remote background agent lifecycle
2. Team-shared workspace objects (Drive-style)
3. Workflow templates + org reuse
4. Fast large-repo context retrieval
5. Built-in web/docs grounding for agents
6. Desktop trust/update polish (signed + auto-update)

## Current Baseline
- Live download + entitlement path: working (`e2e:revenue` pass).
- API + worker routes: live and healthy.
- Control plane: deployed (`rinawarp-agentd`, runtime controller, NATS).

## Workstream 1: Remote Background Agent Lifecycle
Goal: start/stop/observe long-running remote tasks with takeover.

Definition of done:
- API supports create/list/cancel/resume remote runs.
- Each run has persisted status + logs stream pointer.
- UI can attach to an existing run after restart.

72h tasks:
- Add explicit `remote_run` model and persistence.
- Add API surface under `/v1/remote-runs/*`.
- Add CLI wrappers (`rinawarp remote-run ...`).

## Workstream 2: Team Shared Workspace Objects
Goal: shared prompts/workflows/env snippets with RBAC + audit.

Definition of done:
- CRUD for shared objects (prompt, workflow, snippet).
- Workspace-scoped permissions + immutable audit trail.
- Cross-device sync of object changes.

72h tasks:
- Introduce `workspace_objects` state model.
- Add API under `/v1/workspace/objects/*`.
- Add sync events + audit records.

## Workstream 3: Workflow Templates + Org Reuse
Goal: reusable parameterized workflows with versioning.

Definition of done:
- Create from run -> template.
- Parameter schema + validation.
- Execute template with parameter set.

72h tasks:
- Add template schema + version field.
- Add endpoints `/v1/workflows/templates/*`.
- Add “run from template” API.

## Workstream 4: Fast Context Retrieval
Goal: low-latency code retrieval for large repos.

Definition of done:
- Hybrid index (symbol + path + lexical).
- P95 retrieval latency target documented and measured.
- Agent planner uses indexed retrieval path by default.

72h tasks:
- Add retrieval benchmark script.
- Add retrieval mode flags (index vs fallback grep).
- Store retrieval metrics per run.

## Workstream 5: Web/Docs Grounding
Goal: first-class web/docs fetch and evidence capture in agent flows.

Definition of done:
- Agent can fetch docs/web pages from allowlisted domains.
- Captured citations attached to run report.
- Safety controls (domain allowlist + size/time limits).

72h tasks:
- Add `research_fetch` tool contract.
- Add source-citation bundle format to reports.
- Add policy controls for allowed domains.

## Workstream 6: Desktop Trust + Auto-Update
Goal: production trust posture for installer/update.

Definition of done:
- Signed installers by platform policy.
- Auto-update channel running in production.
- Public release verification page + process documented.

72h tasks:
- Finalize update feed contract.
- Add release signing pipeline checks.
- Publish trust docs for users/admins.

## Milestones
- M1 (Day 7): Workstreams 1/2 API contracts live, behind flags.
- M2 (Day 14): Workstreams 3/4 integrated in agent execution path.
- M3 (Day 21): Workstreams 5/6 beta complete in staging.
- M4 (Day 30): GA readiness review + launch gating report.

## Weekly Go/No-Go Gates
- Gate A: regression tests pass (`agentd`, API smokes, revenue path).
- Gate B: no open P0/P1 security issues.
- Gate C: user-facing docs updated for shipped surfaces.

## Immediate Next Actions
1. Implement Workstream 1 API skeleton + persistence.
2. Implement Workstream 2 object store + RBAC checks.
3. Add benchmark harness for Workstream 4 retrieval latency.

## Progress Update (2026-03-05)
- Workstream 1 skeleton shipped:
  - Added persisted remote runs store and APIs:
    - `POST /v1/remote-runs`
    - `GET /v1/remote-runs`
    - `GET /v1/remote-runs/:id`
    - `POST /v1/remote-runs/:id/cancel`
    - `POST /v1/remote-runs/:id/resume`
    - `POST /v1/remote-runs/:id/logs`
- Workstream 2 skeleton shipped:
  - Added workspace object store + RBAC-backed APIs:
    - `POST /v1/workspace/objects`
    - `GET /v1/workspace/objects`
    - `GET /v1/workspace/objects/:id`
    - `PUT /v1/workspace/objects/:id`
- Validation:
  - `packages/rinawarp-agentd` test suite passes (`74/74`).
- Workstream 3 skeleton shipped:
  - Added versioned workflow template store and run surface:
    - `POST /v1/workflows/templates`
    - `GET /v1/workflows/templates`
    - `GET /v1/workflows/templates/:id`
    - `PUT /v1/workflows/templates/:id`
    - `POST /v1/workflows/templates/:id/run`
  - Template run performs parameter validation/interpolation and enqueues a remote run payload.
- Workstream 4 skeleton shipped:
  - Added retrieval config/status/benchmark API:
    - `PUT /v1/platform/retrieval/config`
    - `GET /v1/platform/retrieval/status`
    - `POST /v1/platform/retrieval/benchmark`
- Workstream 5 skeleton shipped:
  - Added research policy + fetch API with allowlist/time/size guardrails and citation bundle output:
    - `PUT /v1/platform/research/config`
    - `GET /v1/platform/research/status`
    - `POST /v1/platform/research/fetch`

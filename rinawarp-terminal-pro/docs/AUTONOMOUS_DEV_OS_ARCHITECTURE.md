# RinaWarp Autonomous Dev OS Architecture (v1)

Date: 2026-03-03  
Status: Proposed baseline for implementation

## 1) Product Positioning (Locked)

RinaWarp is an **Autonomous Dev OS that lives inside a terminal UI**.

This means:
- UI is a control plane, not the execution engine.
- All autonomous behavior runs in process-separated runtime services.
- Every action is replayable, auditable, and policy-gated.

## 2) Top-Level System

```text
RinaWarp UI (Terminal Pro)
  -> Typed IPC Bus
Orchestrator Service
  -> Event Bus
Background Agent Daemon
  -> Adapter Layer (Git/GitHub/CI/LLM/FS/Package/MCP)
State Stores (SQLite local, Postgres team)
```

## 3) Core Components

### 3.1 UI (apps/terminal-pro)
- Runs terminal, dashboard, logs, PR monitor.
- Sends typed commands only.
- Never executes autonomous workflows directly.

### 3.2 Orchestrator (new package: `packages/rinawarp-orchestrator`)
- Converts intent (`/fix issue 143`) into executable workflow state machine.
- Owns workflow lifecycle and reconciliation.
- Writes all transitions to event store.

### 3.3 Agent Daemon (new binary: `rinawarp-agent`)
- Long-running headless worker runtime.
- Owns worker pool, retries, sandbox, and task execution.
- Recovers from crash/restart by replaying state.

### 3.4 Workspace Graph (new package: `packages/rinawarp-graph`)
- Source of truth for: issue, branch, commit, PR, task, CI run, agent.
- Supports deterministic replay + audit timeline.

## 4) IPC + Event Contracts (Non-Negotiable)

### Contract requirements
- Every message includes:
  - `trace_id`
  - `workspace_id`
  - `schema_version`
- Contracts are versioned.
- CI fails on incompatible contract drift.

### Transport decision
- **Near-term (v1 in current stack):** typed JSON schemas (Zod/TypeBox) over existing IPC.
- **Scale path (v2):** NATS + Protobuf event bus.

Reason: this repo is TypeScript/Electron-first today; shipping JSON-schema contracts now is lower risk and faster than introducing Go/NATS immediately.

## 5) Workflow Engine Model

All autonomous flows are persisted state machines.

Example:
`PENDING -> BRANCH_CREATED -> CODING -> TESTING -> PUSHED -> PR_OPEN -> CI_RUNNING -> COMPLETED`

Rules:
- Persist every transition.
- Transitions are idempotent.
- Resume is deterministic after crash.

## 6) PR-Native Loop (Primary Moat)

Required flow:
1. Create branch from issue context.
2. Generate patch.
3. Run tests/lint.
4. Commit and push.
5. Open PR and link issue.
6. Watch CI + reviews.
7. Auto-revise when policy allows.

Guardrail:
- Agents never call raw git commands directly.
- All repo operations go through a Git service abstraction.

## 7) Adapter Layer

Define provider interfaces only once in orchestrator domain:
- `RepoProvider`
- `CIProvider`
- `IssueProvider`
- `LLMProvider`

Implementations:
- v1: GitHub first.
- v1.1: GitLab.
- v1.2: additional providers.

Business logic remains in orchestrator, not adapters.

## 8) Runtime Modes

### Local Mode (v1 target)
- Single machine.
- SQLite event store.
- Local daemon.

### Team Mode (v2 target)
- Central orchestrator.
- Postgres event store.
- Remote/pooled agents.

Design now so local mode entities map 1:1 to team mode entities.

## 9) Observability + Trust Surface

Must ship with:
- Structured logs (JSON).
- Per-task trace timeline.
- State-transition timeline.
- Agent decision log and evidence links.
- Replay endpoint/tooling for failed runs.

UI must show:
- What is running now.
- Why a decision was made.
- What will happen next.

## 10) Security Model

- Workspace-scoped isolation boundary.
- Sandboxed task execution.
- Token vault abstraction (no plaintext tokens in logs/state).
- Provider tokens with least-privilege scopes.
- Policy enforcement before any high-impact action.

## 11) CI Enforcement Gates

Add mandatory CI jobs:
1. IPC/contract compatibility validation.
2. State-machine transition coverage tests.
3. Adapter contract tests (mock providers).
4. Agent simulation tests (failure/retry/recovery).
5. Policy guard tests (never-do scenarios).

Release blocked on any gate failure.

## 12) Tech Decisions (Locked for v1)

- Language/runtime: **TypeScript/Node** (aligns with current repo and shipping speed).
- Contract layer: **Typed JSON schema** now, Protobuf planned.
- Store: **SQLite first**.
- Architecture style: **Event-sourced state transitions**.
- Deployment: **Local-first daemon**, cloud optional later.

## 13) Immediate Build Order (Next 30 Days)

1. Agent daemon skeleton + start/stop/status CLI.
2. Orchestrator state machine core + persisted transitions.
3. GitHub adapter + PR-native happy path.
4. IPC contract schemas + CI contract gate.
5. UI status/timeline panels wired to trace stream.
6. Workspace graph materialized view for issue->branch->PR->CI.

## 14) Open Decisions (Must Resolve Before Team Mode)

1. Event log schema finalization (transition payload shape).
2. Cloud deployment topology for orchestrator + agents.
3. NATS migration criteria and trigger point.
4. Multi-tenant RBAC boundary model.

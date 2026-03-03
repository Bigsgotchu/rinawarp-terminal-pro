# Competitive Gap Execution Plan (Steps 1-6)

Date: 2026-03-03

This is the execution plan for the six competitive gaps vs Cursor, Warp, GitHub Copilot coding agent, and Windsurf.

## Step 1 - Background Agent Execution

Status: Not shipped

Current repo evidence:
- `docs/PRODUCT_SPEC_V1.md` excludes "Autonomous background execution".
- `docs/RINA_PRODUCT_CONTRACT.md` states "No autonomous background agents".

Target:
- Add async job execution with explicit user opt-in and audit logs.
- Jobs run in isolated worker process with persisted state.
- Job lifecycle UI: `queued -> running -> succeeded|failed|canceled`.

Acceptance:
- User can start a background task and close the app.
- On reopen, task status and artifacts are visible.
- High-risk actions still require policy confirmation.

## Step 2 - Team Collaboration Surface

Status: Partially present (share/team IPC exists), product workflow incomplete

Current repo evidence:
- Team/share channels exist in `docs/IPC_EXTRACTION_ROADMAP.md`.
- Product contract still lists "No social layer".

Target:
- Shared runbooks/checklists/prompts for team workspace.
- Permission model: `owner|member` in desktop + account surface.
- Shared artifact links with revocation and access logs.

Acceptance:
- Owner can invite/remove member.
- Member can consume shared assets but cannot manage billing/admin.
- Audit export includes sharing and member management events.

## Step 3 - Integration Depth (MCP + External Systems)

Status: Not complete

Target:
- Ship MCP-first integrations: GitHub, Slack, Stripe/read-only analytics.
- Add integration diagnostics and connection health checks.
- Add per-integration permission scopes and redaction policy.

Acceptance:
- GitHub action end-to-end (create branch/PR comment).
- Slack action end-to-end (post run summary to channel/thread).
- Integration failures produce actionable error messages.

## Step 4 - PR-Native Agent Workflow

Status: Not complete

Target:
- One-click "Create PR from plan execution" flow.
- Structured PR payload: plan summary, diffs, verification evidence.
- Iteration loop from review comments back into plan edits.

Acceptance:
- User can execute from issue/task -> branch -> PR.
- PR contains traceable execution metadata.
- Retry/iterate path exists without restarting from zero.

Incremental progress shipped:
- Agentd now exposes orchestrator MVP endpoints:
  - `POST /v1/orchestrator/issue-to-pr`
  - `GET /v1/orchestrator/workspace-graph`
- These create a workflow record, graph nodes/edges, and queue an execution task.
- Added git and PR prep endpoints:
  - `POST /v1/orchestrator/git/prepare-branch`
  - `POST /v1/orchestrator/github/create-pr` (dry-run/live mode)
- Added workflow execution mode in daemon:
  - `run_command` with `mode: issue_to_pr` now performs branch creation, command run, stage/commit, optional push, optional PR create.

## Step 5 - UX Clarity and Onboarding

Status: In progress

Current repo evidence:
- `docs/FAST_10_DAY_EXECUTION.md` includes 2-minute activation flow and onboarding hardening.

Target:
- Single primary action in composer/input state (remove conflicting command affordances).
- Hide internal labels from normal users (`engine`, policy/debug metadata).
- Guided first-run with 3 quick wins and success marker.

Acceptance:
- New user reaches first successful run in <= 2 minutes.
- Confusion points removed from default UI.
- Activation path has deterministic E2E smoke test.

## Step 6 - Architecture Velocity (IPC Extraction)

Status: In progress, large remaining work

Current repo evidence:
- `docs/IPC_EXTRACTION_ROADMAP.md` still shows many modules as pending.

Target:
- Complete extraction of remaining IPC handlers from `main.ts`.
- Enable CI guard `check-no-ipc-in-main.sh` after extraction.
- Add per-module tests and duplicate-registration guard coverage.

Acceptance:
- No new `ipcMain.handle/on` calls in `main.ts`.
- CI fails on IPC regressions.
- Main-process features organized by domain module.

## Execution Order (Fastest Path)

1. Step 5 (UX clarity) and Step 6 (IPC extraction) in parallel.
2. Step 1 (background execution foundation).
3. Step 3 (integrations), then Step 4 (PR workflow).
4. Step 2 (team sharing/admin polish) layered on top.

## 30-Day Cutline

Must-ship by day 30:
- Step 1 MVP
- Step 3 GitHub+Slack minimum path
- Step 4 PR-native loop
- Step 5 onboarding/clarity complete
- Step 6 IPC extraction CI gate enabled

Can defer after day 30:
- Advanced team analytics and admin reporting beyond basic owner/member and audit export.

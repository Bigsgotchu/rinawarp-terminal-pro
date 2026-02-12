# Rina 90-Day Plan

## Phase 1 (Days 1-30): Trust Core

Goal: users trust Rina to touch their system safely.

Ship:
- System Doctor playbook engine
- Outcome cards (`root cause -> change -> result`)
- Verification after every fix
- Exportable audit reports
- Command normalization + safety caps

Exit criteria:
- All Phase 1 playbooks produce deterministic reports
- High-risk actions require typed confirmation
- Verification evidence present in 100% of fix runs

## Phase 2 (Days 31-60): Daily Dev Wins

Goal: become default unblocking layer for developers.

Ship:
- Dev Fixer playbooks
- Build log parsing and triage
- Confirmation-gated auto-fix suggestions
- Environment repair workflows
- Local operational memory

Exit criteria:
- Broken environment scenarios can be resolved end-to-end
- Fixes are validated by rerunning real build/test commands
- User can inspect full action history and outcomes

## Phase 3 (Days 61-90): Controlled Creation

Goal: build real projects safely, not opaquely.

Ship:
- Project Builder runbooks
- File diff previews
- Rollback support
- Verification checks
- Re-runnable plans

Exit criteria:
- User can approve/reject plan before execution
- Every generated project passes baseline verification
- Rollback path documented per critical step

## Non-Negotiables Across All Phases

- No silent execution
- No ungated high-risk actions
- No unverifiable “done” state
- No permission changes via tone adaptation

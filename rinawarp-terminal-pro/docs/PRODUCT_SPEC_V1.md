# RinaWarp Terminal Pro v1 Product Spec

## 1) Product Definition
RinaWarp Terminal Pro is a local-first, AI-assisted terminal where users express goals in plain language and the system safely executes technical steps with user control.

## 2) v1 Scope
Included:
- Terminal foundation (stable, fast, inspectable execution)
- Intent -> plan proposal
- User-approved execution
- Step-by-step verification and run report
- License-gated capability access

Excluded:
- Autonomous background execution
- Team SaaS/dashboard workflows
- Plugin marketplace
- Cloud-required operation
- Voice-first UX

## 3) User Modes (One Engine, Three Lenses)
- System Doctor: diagnose, prove, fix safely, verify
- Dev Fixer: unblock builds/environments quickly
- Project Builder: plan-first, gated creation from intent

## 4) Runtime Requirements
- Local-first by default; cloud calls are explicit and auditable
- No hidden execution or silent mutation
- Every run produces a machine-readable report
- Execution is deterministic for same inputs and environment

## 5) v1 Acceptance Criteria
### Stability & Trust
- Crash-free sessions: >= 99.5% over rolling 7-day window
- Unhandled runtime exceptions in core execution path: 0 in CI and release build
- Every applied step includes post-verification result (`pass|partial|fail`)

### Intent -> Plan
- For canonical v1 workflows, intent classifier maps to correct lens >= 90%
- Plan generation emits required safety metadata for 100% of executable steps
- Ambiguous intent produces clarification question before execution (100%)

### Plan -> Execution
- High-impact actions require explicit confirmation token (100%)
- Cancellation halts future steps and marks run as canceled (100%)
- Report includes: plan, actions, confirmations, outputs, verification, residual risk (100%)

### License & Boundary Enforcement
- Tool call denied when license disallows it (100%)
- Tool call denied when tool not in v1 registry (100%)

## 6) Evaluation Harness
Required suites:
- Contract tests: shape and required fields for plan/step payloads
- Never-do tests: no silent exec, no out-of-bound tool calls, no unconfirmed high-impact actions
- Scenario tests: canonical doctor/fixer/builder workflows
- Regression corpus: known failures replayed each release

Pass gate for release:
- All contract + never-do tests pass
- Scenario suite pass rate >= 95%
- No P0 security/safety defects open

## 7) Failure & Recovery Contract
On any failed run:
- Capture failing step and error class (`permission|tool|timeout|partial|unknown`)
- Stop dependent steps by default
- Emit recovery options:
  1. Retry from failed step
  2. Roll back last applied reversible step
  3. Export report and halt
- If partial write happened, mark run `partial` and include explicit remediation

## 8) Data & Privacy Policy (v1)
- Local storage by default for run history and operational memory
- Secrets never logged in plaintext in reports
- PII/session data redacted in exported reports
- User can clear local memory/history from UI/command
- Cloud telemetry, if enabled, is opt-in and minimal (health + crash metadata)

## 9) Versioning & Release Policy
- Semantic versioning (`MAJOR.MINOR.PATCH`)
- Every release must include:
  - checksums (`SHASUMS256.txt`)
  - detached signature (`SHASUMS256.txt.asc`)
  - public key artifact
- Release blocker if signature verification fails
- Rollback path documented for last known good release

## 10) Operational Metrics (v1)
Track weekly:
- Task completion rate
- Human intervention rate per run
- Mean time to unblock (dev fixer scenarios)
- Confirmation denial rate on high-impact actions
- Exported report rate (trust signal)

## 11) Support & Incident Workflow
- Severity classes: P0/P1/P2
- P0: disable affected high-impact tool path via config guard and publish advisory
- Incident report must include reproduction, impact scope, mitigation, and prevention test

## 12) v1 Done Definition
v1 is shippable when:
- Acceptance criteria in Section 5 are met
- Section 6 release gate is green
- Signature-enforced release flow is live
- Production smoke/audit scripts pass on pages.dev and custom domain

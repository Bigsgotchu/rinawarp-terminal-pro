# RinaWarp Terminal Pro v1 Implementation Backlog

## Goal
Ship a revenue-ready v1 that satisfies `docs/PRODUCT_SPEC_V1.md` and `docs/SAFETY_SPEC_V1.md` with one canonical execution path.

## Stage 1 - Contract Enforcement (Must Pass First)
- [x] Enforce required step fields: `risk_level`, `requires_confirmation`, `verification_plan`, `tool`, `description`
- [x] Block execution when plan validation fails
- [x] Implement confirmation token checks for all high-impact steps
- [x] Add graceful refusal path for license-blocked tools
- [x] Add/finish never-do tests: silent execution, out-of-registry tools, unconfirmed high-impact actions

Exit criteria:
- [x] Contract and never-do suites are green in CI

## Stage 2 - Tool Boundary Runtime
- [x] Finalize v1 tool registry in runtime (read, safe-write, high-impact, planning)
- [x] Deny unknown tools at invocation boundary
- [x] Add structured step logs (tool, input redaction, timestamps, outcome)
- [x] Add failure class mapping (`permission_denied`, `tool_unavailable`, `command_error`, `timeout`, `partial_execution`)

Exit criteria:
- [x] Boundary tests and failure classification tests pass

## Stage 3 - Core User Flows (Doctor, Dev Fixer, Builder)
- [x] Implement canonical System Doctor playbooks (diagnose -> prove -> fix -> verify)
- [x] Implement canonical Dev Fixer playbooks (build fail, dependency mismatch, port/process, permissions)
- [x] Implement canonical Project Builder playbooks (plan preview, gated execution, rollback path)
- [x] Ensure every flow exports a machine-readable run report

Exit criteria:
- [x] Scenario suite pass rate >= 95%

## Stage 4 - Desktop Production Readiness
- [x] Verify Electron app startup/runtime checks for Linux and Windows installers
- [x] Validate download/install links on `https://www.rinawarptech.com/download/`
- [x] Keep checksum/signature release process mandatory
- [x] Add installer smoke checks to release runner output

Exit criteria:
- [ ] Signed artifacts + install smoke checks pass in release pipeline

## Stage 5 - Revenue & Operations Guardrails
- [x] Enforce tier gating at runtime (Starter/Creator/Pro/Pioneer/Founder/Enterprise)
- [x] Confirm production flows for subscription/license checks fail safely
- [x] Track v1 operating metrics: completion rate, intervention rate, MTTR unblock, confirmation denial rate
- [x] Add incident runbook (P0/P1/P2) and emergency kill switches for high-impact tools

Exit criteria:
- [ ] Production smoke/audit + metrics collection running on live release

## Weekly Execution Loop
1. Pick top 3 backlog items from current stage.
2. Implement with tests first for safety boundaries.
3. Run `npm run pretest` and scenario/contract suites.
4. Run release smoke (`smoke:pages`, `smoke:prod`, installer smoke when applicable).
5. Mark done only when exit criteria are met.

## Definition of Done (Program Level)
- [ ] Product acceptance criteria met
- [ ] Safety invariants enforced in runtime checks
- [ ] Release signatures and checksums verified
- [ ] Pages + custom domain fingerprints match
- [ ] Desktop installers download and install successfully from production site

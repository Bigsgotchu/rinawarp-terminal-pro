# RinaWarp Terminal Pro v1 Implementation Backlog

## Goal
Ship a revenue-ready v1 that satisfies `docs/PRODUCT_SPEC_V1.md` and `docs/SAFETY_SPEC_V1.md` with one canonical execution path.

## Stage 1 - Contract Enforcement (Must Pass First)
- [ ] Enforce required step fields: `risk_level`, `requires_confirmation`, `verification_plan`, `tool`, `description`
- [ ] Block execution when plan validation fails
- [ ] Implement confirmation token checks for all high-impact steps
- [ ] Add graceful refusal path for license-blocked tools
- [ ] Add/finish never-do tests: silent execution, out-of-registry tools, unconfirmed high-impact actions

Exit criteria:
- [ ] Contract and never-do suites are green in CI

## Stage 2 - Tool Boundary Runtime
- [ ] Finalize v1 tool registry in runtime (read, safe-write, high-impact, planning)
- [ ] Deny unknown tools at invocation boundary
- [ ] Add structured step logs (tool, input redaction, timestamps, outcome)
- [ ] Add failure class mapping (`permission_denied`, `tool_unavailable`, `command_error`, `timeout`, `partial_execution`)

Exit criteria:
- [ ] Boundary tests and failure classification tests pass

## Stage 3 - Core User Flows (Doctor, Dev Fixer, Builder)
- [ ] Implement canonical System Doctor playbooks (diagnose -> prove -> fix -> verify)
- [ ] Implement canonical Dev Fixer playbooks (build fail, dependency mismatch, port/process, permissions)
- [ ] Implement canonical Project Builder playbooks (plan preview, gated execution, rollback path)
- [ ] Ensure every flow exports a machine-readable run report

Exit criteria:
- [ ] Scenario suite pass rate >= 95%

## Stage 4 - Desktop Production Readiness
- [ ] Verify Electron app startup/runtime checks for Linux and Windows installers
- [ ] Validate download/install links on `https://www.rinawarptech.com/download/`
- [ ] Keep checksum/signature release process mandatory
- [ ] Add installer smoke checks to release runner output

Exit criteria:
- [ ] Signed artifacts + install smoke checks pass in release pipeline

## Stage 5 - Revenue & Operations Guardrails
- [ ] Enforce tier gating at runtime (Starter/Creator/Pro/Pioneer/Founder/Enterprise)
- [ ] Confirm production flows for subscription/license checks fail safely
- [ ] Track v1 operating metrics: completion rate, intervention rate, MTTR unblock, confirmation denial rate
- [ ] Add incident runbook (P0/P1/P2) and emergency kill switches for high-impact tools

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

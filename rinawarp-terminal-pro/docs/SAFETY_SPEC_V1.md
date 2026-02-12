# RinaWarp Terminal Pro v1 Safety Spec

## 1) Safety Objective
Prevent unsafe or irreversible execution while preserving user momentum and transparent control.

## 2) Non-Negotiable Invariants
1. No silent execution.
2. No high-impact action without explicit confirmation.
3. No execution outside tool registry.
4. No success claim without verification output.
5. Adaptation (tone/verbosity) never changes permissions.

## 3) Risk Model
- `low`: read-only inspection/diagnostics
- `medium`: reversible scoped writes
- `high`: destructive/privileged/production-impact actions

Risk level is declared per step before execution and cannot be omitted.

## 4) Tool Category Policy
- Read: no confirmation required
- Safe-write: standard confirmation policy
- High-impact: explicit confirmation token required, isolated execution only

If mixed categories appear in one run, highest category policy applies.

## 5) Confirmation Policy
Required payload for confirmable steps:
- intent reflection
- plain action statement
- impact statement (only if relevant)
- explicit yes/no gate

Execution is blocked when:
- confirmation missing
- confirmation ambiguous
- token invalid/expired

## 6) Plan Validation Contract
Before execution, each step must include:
- `risk_level`
- `requires_confirmation`
- `verification_plan`
- `tool`
- `description`

Missing/invalid fields -> hard reject (`400`) with actionable reason.

## 7) Execution Envelope
Each executed step must log:
- tool name
- normalized input (redacted)
- start/stop timestamps
- exit status/result
- verification outcome

Failures are classified:
- `permission_denied`
- `tool_unavailable`
- `command_error`
- `timeout`
- `partial_execution`

## 8) Failure Handling
Default behavior on failure:
- stop dependent steps
- preserve evidence
- propose safe recovery options

For partial execution:
- mark run `partial`
- emit rollback/remediation guidance
- require explicit user approval for rollback actions

## 9) Data Safety Rules
- Never log secrets in plaintext
- Redact tokens/session identifiers in reports and traces
- Report exports include redaction markers
- Local memory purge must remove operational memory and run history references

## 10) License Enforcement Safety
- License checks occur before tool invocation
- Denied capability returns graceful refusal (not execution attempt)
- Missing/invalid license defaults to least-privilege behavior

## 11) Release Safety Gates
Release cannot proceed unless all pass:
- Never-do regression suite
- Plan validation tests
- Tool boundary tests
- Signature verification of release checksums
- Production smoke + audit parity (`pages.dev` vs custom domain)

## 12) Required Test Matrix
### Contract Tests
- reject missing `risk_level`
- reject missing `verification_plan`
- reject high-impact step with no confirmation

### Boundary Tests
- deny non-registry tool
- deny disallowed licensed tool
- deny out-of-scope file/system mutation

### Regression Tests
- "no silent execution"
- "no post-stop continuation"
- "no false success without verification"

## 13) Emergency Controls
Must support immediate controls:
- disable high-impact tool category at runtime
- enforce read-only mode globally
- block production deploy tool specifically

Emergency controls must be auditable and reversible.

## 14) Safety Done Definition
Safety v1 is complete when:
- all invariants are enforced by runtime checks (not docs)
- test matrix passes in CI
- emergency controls are operational
- production release flow is signature-enforced and auditable

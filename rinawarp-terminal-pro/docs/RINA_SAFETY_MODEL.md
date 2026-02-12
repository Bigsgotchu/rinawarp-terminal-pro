# Rina Safety Model

## Safety Invariants

1. No silent execution.
2. No high-risk action without explicit confirmation.
3. Every fix path must include post-action verification.
4. Every run must produce an audit report.
5. Tone adaptation never changes permissions.

## Risk Tiers

- `low`: read-only checks, diagnostics, non-destructive metadata reads
- `medium`: reversible local changes, scoped file edits, restart-safe actions
- `high`: destructive or security-sensitive operations (deletes, privilege changes, system-wide mutation)

## Confirmation Policy

- `low`: optional confirmation
- `medium`: standard confirmation
- `high`: explicit typed confirmation (`YES`)

## Execution Envelope

Each executable action must declare:
- `risk_level`
- `intent`
- `expected_effect`
- `rollback_plan`
- `verification_plan`

## Verification Contract

After each applied fix:
- rerun relevant checks
- compare before/after signals
- emit `verification_result` (`pass`, `partial`, `fail`)
- include concrete evidence in report

## Reporting Contract

Each run outputs:
- plan steps
- commands/actions executed
- confirmations received
- changed artifacts
- verification outcomes
- residual risk / next actions

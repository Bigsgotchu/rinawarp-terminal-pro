# RinaWarp v1 Incident Runbook

## Severity
- `P0`: safety/security risk, destructive path, silent execution, or production outage
- `P1`: core flow degraded, payments/license unavailable, major deploy failure
- `P2`: non-blocking regressions, degraded UX, partial automation failure

## Immediate Controls
Use runtime kill switches before any code rollout:
- `RINAWARP_EMERGENCY_READ_ONLY=1` -> blocks all non-read tools
- `RINAWARP_DISABLE_HIGH_IMPACT=1` -> blocks high-impact tools
- `RINAWARP_BLOCK_TOOLS=<csv>` -> blocks specific tools (for example `deploy.prod`)

## P0 Procedure
1. Activate one or more immediate controls above.
2. Confirm block is active via a failing high-impact test run.
3. Publish incident advisory and current impact.
4. Capture evidence: run report JSON + metrics event trail + failing request.
5. Patch and add a regression test before unblocking.
6. Roll back controls only after smoke + safety suites pass.

## P1 Procedure
1. Isolate affected flow (Doctor, Dev Fixer, Builder, download, or license path).
2. Mitigate via targeted tool block (`RINAWARP_BLOCK_TOOLS`).
3. Validate with scenario tests and focused smoke checks.
4. Ship fix and monitor `/v1/metrics` for recovery trend.

## P2 Procedure
1. Log defect with reproduction and affected contract.
2. Queue fix in next patch train.
3. Add test coverage if missing.

## Required Incident Record
- Incident ID
- Severity and start/end timestamps (UTC)
- User impact scope
- Trigger and root cause
- Mitigation controls used
- Verification evidence
- Regression test added
- Follow-up owner and due date

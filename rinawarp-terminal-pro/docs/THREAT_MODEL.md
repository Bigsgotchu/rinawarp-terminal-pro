# RinaWarp Threat Model (v1)

## Scope
- Desktop runtime (`apps/terminal-pro`)
- Execution control and policy enforcement
- Structured session persistence and sharing

## Primary Risks
1. Prompt/output induced dangerous command execution.
2. Secret leakage through persistence/export/share.
3. Unauthorized team access to shared artifacts.
4. Runtime crashes that hide execution status.

## Controls Implemented
- Policy gates for step/plan execution and PTY command submit boundary.
- Redaction before export/share/audit payload creation.
- Share controls: role minimum + expiry + revoke.
- Runtime error capture in renderer + persisted error telemetry.

## Remaining Risks
- IME/unicode rendering edge-case regressions.
- Complex shell prompt boundary misclassification.
- Human approval fatigue for repeated risky operations.

## Mitigations in Progress
- Corpus expansion for boundary detection.
- UI-side policy explain/preflight for all actions.
- Search and audit instrumentation for abnormal behavior.

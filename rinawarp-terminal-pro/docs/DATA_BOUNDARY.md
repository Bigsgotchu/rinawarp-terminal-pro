# Data Boundary (v1)

## Local by Default
- PTY transcript, structured sessions, and shares are stored under app userData.
- Policy and team metadata are local JSON state.

## Data That Can Leave Device
- Explicit share content (after redaction).
- Explicit audit export payloads (after redaction).
- Optional network calls from agent endpoints when execution is requested.

## Redaction
- Redaction is applied to runbook export/share/audit outputs.
- Redaction preview is available in UI before publish/export.

## User Controls
- Revoke shared artifacts.
- Set share expiry.
- Set minimum role for shared artifacts.

## Non-Goals (v1)
- Cloud multi-tenant persistence by default.
- Background upload/sync without explicit user action.

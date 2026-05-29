# RinaWarp Telemetry

RinaWarp uses minimal anonymous operational telemetry for product reliability, not behavioral surveillance.

## Endpoints

The desktop app sends HTTPS POST requests to the configured telemetry base URL:

- `POST /v1/telemetry/install`
- `POST /v1/telemetry/active`
- `POST /v1/telemetry/event`

The default base URL is `https://rinawarptech.com`. Development builds can override it with `RINAWARP_TELEMETRY_BASE_URL`.

## Install Payload

```json
{
  "installId": "anonymous-uuid",
  "version": "1.7.2-beta",
  "platform": "linux",
  "arch": "x64"
}
```

## Operational Event Payload

```json
{
  "installId": "anonymous-uuid",
  "version": "1.7.2-beta",
  "platform": "linux",
  "arch": "x64",
  "event": "task_completed",
  "count": 1
}
```

Allowed event counters:

- `task_started`
- `task_completed`
- `task_failed`
- `rollback_triggered`
- `approval_denied`

## Privacy Contract

Telemetry must never include prompts, source code, repository contents, terminal output, shell history, file contents, secrets, tokens, or credentials.

Telemetry is optional, anonymous, and non-blocking. If the user opts out or the network is offline, runtime execution continues normally.

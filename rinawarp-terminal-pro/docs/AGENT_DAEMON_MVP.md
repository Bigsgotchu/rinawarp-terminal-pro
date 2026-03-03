# Agent Daemon MVP (Step 1)

Date: 2026-03-03

This documents the currently shipped daemon scaffold for background execution.

## Commands

From repo root:

```bash
npm run agent:daemon:start
npm run agent:daemon:status
npm run agent:daemon:tasks
npm run agent:daemon:dlq
npm run agent:daemon:stop
```

Direct task registration:

```bash
node packages/rinawarp-agentd/dist/daemon/cli.js task add run_command '{"command":"echo hello"}'
```

## Persistence

Daemon state is stored in:

- `$RINAWARP_AGENT_HOME` if set
- else `~/.rinawarp/agent`
- fallback: `/tmp/rinawarp-agent`

Files:
- `daemon-state.json`
- `daemon.pid`
- `tasks.json`

## Current Task Types

- `run_command`
  - payload: `{ "command": "npm test", "cwd": "/path/optional" }`
- `repo_watch`
  - payload: `{ "repo": "/path/to/repo" }`
  - starts persistent filesystem watch and writes events to ndjson log.

## Retry / Dead-Letter Behavior

- Tasks are validated against task contracts before execution.
- Failed tasks retry with exponential backoff.
- Default max attempts: `3` (override with `--max-attempts` on `task add`).
- When retries are exhausted, task is marked `deadLetter: true`.
- Dead-letter queue view:

```bash
node packages/rinawarp-agentd/dist/daemon/cli.js task dlq
```

## Runtime Controls

- Worker concurrency:
  - `RINAWARP_AGENT_CONCURRENCY` (default `1`, max `8`)
- Watch event output:
  - `RINAWARP_AGENT_WATCH_EVENTS` (default `/tmp/rinawarp-agent-watch-events.ndjson`)

## Agentd API Surface (for UI wiring)

- `GET /v1/daemon/status`
  - Returns daemon running state + task counters.
- `POST /v1/daemon/start`
  - Starts background daemon runner.
- `POST /v1/daemon/stop`
  - Stops background daemon runner.
- `GET /v1/daemon/tasks?status=queued|running|failed|completed&deadLetter=1`
  - Returns filtered task list.
- `POST /v1/daemon/tasks`
  - Body: `{ "type": "run_command|repo_watch", "payload": {...}, "maxAttempts": 3 }`
  - Registers background task.

## Current Limitations

- Single-process sequential worker loop (no concurrency controls yet).
- Single process runtime (no multi-process worker pool yet).
- UI integration currently limited to diagnostics panel controls/status.
- No remote team-mode daemon orchestration yet.

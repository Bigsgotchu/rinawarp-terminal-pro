# Runtime E2E Loop

This harness makes Terminal Pro visible and repeatable while the runtime UX is stabilized.
It currently drives the Vite renderer with a deterministic browser-side Rina bridge mock;
Electron IPC and real filesystem mutation remain separate verification work.

## Run

From the workspace root, start the renderer in one terminal:

```bash
pnpm dev
```

Run the headed smoke suite in a second terminal:

```bash
pnpm test:e2e
```

Open Playwright UI mode when watching or debugging the flow:

```bash
pnpm test:e2e:ui
```

## Evidence

- Screenshots: `apps/terminal-pro/e2e/screenshots/`
- Videos: `apps/terminal-pro/e2e/videos/**/video.webm`
- Traces: `apps/terminal-pro/e2e/videos/**/trace.zip`

Replay a trace:

```bash
pnpm exec playwright show-trace apps/terminal-pro/e2e/videos/<test-run>/trace.zip
```

## Deterministic Rules

- Keep the dev server on `http://localhost:3000`; startup fails if that port is already occupied.
- Run one worker with parallel execution disabled while runtime flows stabilize.
- Use `data-testid` for durable controls and states, not visible copy alone.
- Treat browser `pageerror` and console errors as failed runs.
- Capture screenshot, video, and trace evidence for every meaningful trust flow.

## Startup Failures

- `Port 3000 is already in use`: use the existing Terminal Pro server or stop that process before launching a new one.
- Browser executable missing: run `pnpm exec playwright install`.
- Display unavailable in a remote/sandboxed session: run `pnpm test:e2e:ui` from the local desktop Linux session.
- Mixed Playwright versions: run `pnpm install` and confirm `pnpm exec playwright --version` resolves one installed version.

## Trust Flow Coverage

- `app-launch.spec.ts`: renderer boot, Rina visibility, terminal visibility, first prompt response.
- `mutation-approval.spec.ts`: patch proposal, visible diff and rollback disclosure, deny boundary, and explicit approval acknowledgement.
- `agent-lifecycle-trace.spec.ts`: visible `intent -> transaction -> execution -> rollback` timeline with screenshot, video, and trace evidence.

The mutation approval test proves the user-facing gate against deterministic fixture data. It
does not yet prove a real filesystem transaction or an executable rollback control.
The lifecycle trace test proves the renderer/ingress event contract and rollback visibility using
deterministic fixture data; real Electron IPC and filesystem rollback are covered separately below.

## Real Execution Boundary

The browser fixture suite is presentation-contract coverage only. Real approved mutation and
rollback are verified through the Electron preload/IPC boundary against a temporary workspace:

```bash
bash apps/terminal-pro/scripts/run-electron-playwright.sh runtime-ingress-filesystem.spec.ts
bash apps/terminal-pro/scripts/run-electron-playwright.sh runtime-ingress-filesystem.spec.ts --trace=on
```

- `apps/terminal-pro/tests/e2e/runtime-ingress-filesystem.spec.ts`: invokes the real
  `rina:agent:approvePatch` IPC path, forces failed verification, and asserts that the sandbox
  restores original file content while retaining a rollback snapshot.
- Traces from the real boundary spec are written under `apps/terminal-pro/test-results/**/trace.zip`.

# RinaWarp Terminal Pro Architecture

This document describes the modular architecture pattern for the Electron main process.

## Directory Structure

```
apps/terminal-pro/src/
├── main.ts                    # Entry point: lifecycle + window creation + calls registerAllIpc()
├── main/
│   ├── context.ts             # AppContext type definition (shared runtime state)
│   ├── resources.ts           # Resource path resolution, file hashing (pure)
│   ├── diagnostics.ts         # Diagnostics payload builder + IPC registration
│   └── ipc/
│       └── registerAllIpc.ts  # Composes all IPC module registrations
├── security/
│   └── projectRoot.ts         # Path canonicalization, root validation (pure)
└── ... (other modules)
```

---

## Core Rules

### 1) Never add new IPC handlers directly in `main.ts`
`main.ts` is bootstrap glue only. All IPC must be registered via `registerXxxIpc()` modules.

### 2) Keep side-effects contained
**Pure modules** (no Electron imports, no direct IO unless explicitly intended):
- `src/security/**`
- `src/main/**` helpers like `resources.ts` and `.../logic.ts`

**Side-effect modules** (Electron + IO allowed):
- `src/main/ipc/**`
- `main.ts` bootstrap lifecycle

---

## Where to Add New IPC Handlers

**Do not add IPC in `main.ts`.** Follow the pattern:

1) Create a feature IPC module:

```ts
// src/main/ipc/myFeature.ipc.ts
import type { IpcMain } from "electron";
import type { AppContext } from "../context";

export function registerMyFeatureIpc(deps: { ipcMain: IpcMain; ctx: AppContext }): void {
  const { ipcMain, ctx } = deps;

  ipcMain.handle("my-feature:action", async (_event, payload) => {
    // Thin adapter: validate args, call service/logic
    return { ok: true };
  });
}
```

2) Register in `registerAllIpc.ts`:

```ts
// src/main/ipc/registerAllIpc.ts
import type { IpcMain } from "electron";
import type { AppContext } from "../context";
import { registerMyFeatureIpc } from "./myFeature.ipc";

export function registerAllIpc(deps: { ipcMain: IpcMain; ctx: AppContext }): void {
  registerMyFeatureIpc(deps);
}
```

3) Call once from `main.ts` in `app.whenReady()`:

```ts
registerAllIpc({ ipcMain, ctx });
```

---

## Where Business Logic Lives

| Logic Type | Location | Notes |
|------------|----------|-------|
| IPC adapters | `src/main/ipc/*.ipc.ts` | Thin: validate + call services |
| Services | `src/main/<feature>/*.service.ts` | Side-effects allowed if needed |
| Pure logic/helpers | `src/main/<feature>/*.logic.ts` | Prefer pure functions |
| Path/security | `src/security/*.ts` | Must remain pure |
| Resource loading | `src/main/resources.ts` | Prefer pure; IO limited to file hashing/info |
| Chat routing | `src/chat-router.ts` | Keep orchestration here; call smaller helpers |
| Session management | `src/structured-session.ts` | Persistence boundaries explicit |

---

## AppContext Pattern

`AppContext` is shared runtime state passed to modules.

**Important:** `structuredSessionStore` is nullable because it is gated by feature flags and init can fail.

```ts
// src/main/context.ts
export interface AppContext {
  structuredSessionStore: StructuredSessionStore | null;
  lastLoadedThemePath: string | null;
  lastLoadedPolicyPath: string | null;
}
```

Create once in `main.ts`:

```ts
const ctx: AppContext = {
  structuredSessionStore: null,
  lastLoadedThemePath: null,
  lastLoadedPolicyPath: null,
};
```

When enabled:

```ts
ctx.structuredSessionStore = new StructuredSessionStore(...);
ctx.structuredSessionStore?.init?.();
```

---

## Naming Conventions

- **IPC modules:** `src/main/ipc/<feature>.ipc.ts`
  - export: `register<Feature>Ipc()`
- **Services:** `src/main/<feature>/<feature>.service.ts`
  - export: `create<Feature>Service(ctx)` or `do<Feature>(ctx, args)`
- **Pure helpers:** `src/main/<feature>/<feature>.logic.ts`
  - export: pure functions only
- **Types:** `src/main/<feature>/<feature>.types.ts`
  - shared types/interfaces for that feature

---

## File Size Guidelines

### ESLint Thresholds

| Pattern | Max Lines | Max Complexity | Max Cognitive |
|---------|-----------|----------------|---------------|
| Legacy hotspots (`main.ts`, `structured-session.ts`) | 4000 | 45 | 70 |
| New modular code (`src/main/**/*.ts`, `src/security/**/*.ts`) | 500 | 15 | 20 |
| Default | 600 | 15 | 20 |

### When to Extract

Extract when **any** is true:

- Function exceeds 15 cyclomatic complexity
- New module exceeds 500 lines
- Code has 3+ nested conditionals
- You see a clear structure: parse → gate → execute → format

### Extraction Pattern

```ts
function parseInput(input: string): ParsedInput { ... }
function validateInput(parsed: ParsedInput): ValidationResult { ... }
async function executeRequest(validated: ValidatedInput): Promise<RawResult> { ... }
function formatResult(raw: RawResult): Result { ... }

export async function handleRequest(input: string): Promise<Result> {
  const parsed = parseInput(input);
  const validated = validateInput(parsed);
  if (!validated.ok) throw new Error(validated.error);
  const raw = await executeRequest(validated);
  return formatResult(raw);
}
```

---

## Security Invariants (Non-Negotiable)

- **Execution:** all command execution must go through the enforcement engine/tooling layer.
- **Filesystem reads:** any user-supplied path must be normalized + checked with `normalizeProjectRoot()` and `isWithinRoot()`.
- **Redaction:** redact before persistence and before model calls (if enabled).
- **Sandbox:** packaged builds must never run with sandbox disabled; ignore/remove `ELECTRON_DISABLE_SANDBOX=1` in packaged mode.
- **Support bundles:** must redact sensitive data before saving/sharing.

---

## Testing Guide

| What | Command | Notes |
|------|---------|-------|
| Lint | `pnpm -C apps/terminal-pro run lint` | must be 0 warnings |
| Build | `pnpm -C apps/terminal-pro run build:electron` | must succeed |
| E2E smokes | `pnpm -C apps/terminal-pro run e2e:smoke` | uses `_launch.ts` |
| Debug paths | App → Settings → Diagnostics | copy JSON / bundle |

---

## CI Enforcement

CI enforces:

1. **Warning budget:** `scripts/eslint-warning-budget.js --max 0`
2. **Build:** `build:electron` must succeed
3. **E2E smokes:** Playwright under Xvfb with CI sandbox strategy
4. **Artifacts:** CI failure bundle uploaded on Playwright failure

---

## Quick Reference

| Task | Do This |
|------|---------|
| Add IPC handler | `src/main/ipc/<feature>.ipc.ts` + register in `registerAllIpc.ts` |
| Add path validation | `src/security/projectRoot.ts` |
| Add resource loading | `src/main/resources.ts` |
| Reduce complexity | extract parse/gate/execute/format helpers |
| Share runtime state | extend `AppContext` |

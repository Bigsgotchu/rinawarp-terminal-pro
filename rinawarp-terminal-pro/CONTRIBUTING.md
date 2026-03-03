# Contributing to RinaWarp Terminal Pro

## One Rule to Remember
**Do not add IPC handlers to `apps/terminal-pro/src/main.ts`.** Use `registerXxxIpc()` modules.

---

## Development Commands

From repo root:

- **Lint:**
  - `pnpm -C apps/terminal-pro run lint`

- **Build Electron:**
  - `pnpm -C apps/terminal-pro run build:electron`

- **E2E smokes:**
  - `pnpm -C apps/terminal-pro run e2e:smoke`

---

## Architecture Rules

### IPC Pattern
- IPC must live in: `apps/terminal-pro/src/main/ipc/*.ipc.ts`
- Each module exports:
  - `register<Feature>Ipc({ ipcMain, ctx })`

- `registerAllIpc.ts` is the single aggregator.
- `main.ts` calls `registerAllIpc()` exactly once.

### Side-effects vs Pure Code
Prefer pure code for logic:
- `src/security/**` must remain pure
- `src/main/**.logic.ts` should be pure

IPC modules should be thin adapters.

### File Size + Complexity
- New modular files must stay under:
  - 500 lines
  - complexity 15
  - cognitive complexity 20

Legacy hotspots are allowed higher limits temporarily, but do not expand them.

---

## Security Rules (Non-Negotiable)

- All command execution goes through enforcement/tooling (no ad-hoc spawn).
- Any user path must be normalized and checked with root validation helpers.
- Redact sensitive data before persistence and before model calls when enabled.
- Packaged builds must never run with sandbox disabled.

---

## Testing Rules

- If you add IPC, add:
  - a unit test for pure logic (if applicable)
  - an E2E smoke if it's user-visible/safety-related (policy, PTY, themes, diagnostics)

- All PRs must keep:
  - lint at 0 warnings
  - build passing
  - smoke suite green (or justified skip with maintainer approval)

---

## CI Budget Enforcement

CI runs:
- ESLint warning budget: `scripts/eslint-warning-budget.js --max 0`
- Electron build
- Playwright smokes

If Playwright fails, CI uploads a failure bundle artifact.

---

## How to Add a New Feature (Quick Steps)

1) Create logic/service code:
   - `src/main/<feature>/<feature>.logic.ts` (pure)
   - `src/main/<feature>/<feature>.service.ts` (side-effects if needed)

2) Create IPC adapter:
   - `src/main/ipc/<feature>.ipc.ts`

3) Register:
   - add to `src/main/ipc/registerAllIpc.ts`

4) Tests:
   - add or update relevant tests (unit and/or e2e)

---

## Code Review Checklist

- [ ] No new IPC handlers in `main.ts`
- [ ] New modules follow naming conventions
- [ ] New code stays under size/complexity thresholds
- [ ] Security invariants upheld
- [ ] Lint/build/tests pass

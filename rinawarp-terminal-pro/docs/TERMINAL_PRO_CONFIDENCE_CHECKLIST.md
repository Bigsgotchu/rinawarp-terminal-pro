# Terminal Pro Confidence Checklist

Run this before trusting a build for real usage feedback.

## Daily Loop

Run these in Workspace:

```text
pwd
git status
why did this fail?
build app
ls /bad/path
```

Pass criteria:

- Commands execute immediately.
- Rina responds to natural language.
- Ambiguous input shows an explicit choice.
- Failures produce visible help affordances.
- No action silently disappears.

## No Dead Actions

Every submitted action must produce exactly one of:

- terminal execution
- Rina response
- explicit choice
- visible failure

Never ship a state where the stream shows `You -> ...` and nothing else happens.

## Session Continuity

Run:

```text
cd ..
pwd
```

Then approve a suggested command and run another command.

Pass criteria:

- `pwd` reflects the changed directory.
- Approved command executes in the same PTY.
- Follow-up command still uses that same session.

## Stream Clarity

Check that the unified activity stream clearly distinguishes:

- shell command entries
- Rina explanations
- approval states
- terminal execution results
- failure affordances

One user action should create one coherent visible result.

## Release Gate

- [ ] Commands execute immediately
- [ ] Rina responds to natural language
- [ ] Ambiguous input never auto-routes
- [ ] Approve executes in same PTY
- [ ] Failures produce visible help
- [ ] No silent actions
- [ ] Session state persists correctly

## E2E Launch Follow-Up

- Fixed `tests/e2e/_launch.ts` E2E env/flag propagation so direct runs apply Electron launch flags correctly.
- Added build-artifact preflight checks in `tests/e2e/_launch.ts`.
- Kept E2E-only renderer sandbox opt-out in `main.ts`.
- Added settings-layout acceptance guardrail in `rina-acceptance.electron.spec.ts`.
- Verified build outputs and test logic are not the blocker.
- Remaining Electron launch failure occurs before app bootstrap in the current Codex sandbox/runtime.
- No alternate launcher path was introduced.
- Host-runtime rerun required to validate deterministic Electron startup.

Run on host runtime:

```bash
pnpm -C apps/terminal-pro exec playwright test tests/e2e/rina-acceptance.electron.spec.ts --grep "settings views keep consistent empty-state voice and list layout"
pnpm -C apps/terminal-pro exec playwright test tests/e2e/rina-acceptance.electron.spec.ts
```

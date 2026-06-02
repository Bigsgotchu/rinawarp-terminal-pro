# Receipt And Recovery QA Checklist

This checklist is for the current trust pass on:

- receipt presentation
- smarter recovery cards
- first-class rerun/fix/inspect actions
- failure summary quality

Use it after the helper-backed Electron suite runs in CI, or during a manual Electron validation pass.

## Automated Gate

Run the focused suite first:

```bash
npm --workspace apps/terminal-pro run test:unit -- run-intelligence.test.ts
npm --workspace apps/terminal-pro run test:e2e:core
npm --workspace apps/terminal-pro run qa:receipt-recovery:visual
```

Expected outcome:

- unit tests stay green
- Electron proof, conversation, and trust-smoke specs run through the shared launch helper
- receipt and recovery screenshots land in `apps/terminal-pro/test-results/receipt-recovery-visual/`
- any failure is treated as a real regression until explained

## Manual Pass

Run the app:

```bash
npm --workspace apps/terminal-pro run build
cd apps/terminal-pro
npm run dev
```

Validate these four scenarios:

### 1. Failed Build

Trigger a build failure with a clear first error.

Confirm:

- the thread run block shows a concise failure summary
- `Best next action` appears before the confidence explanation
- `Rerun`, `Fix & retry`, `Inspect output`, `Open receipt`, `Show diff`, and `Copy command` are all available
- the recommended action feels visually primary
- the receipt reads like proof, not a raw log dump

### 2. Interrupted Test Run

Interrupt a running test command or restore a session with an interrupted test run.

Confirm:

- recovery copy explains what was interrupted
- recovery copy explains whether resume is safe
- recovery copy explains whether rerun is idempotent
- the primary action is the safest recommendation
- the receipt is easy to open from both the thread and the Runs inspector

### 3. Failed Deploy

Trigger a deploy failure or interrupted deploy.

Confirm:

- the summary stays cautious and does not overclaim root cause
- deploy recovery prefers receipt and target-state inspection over blind rerun
- the UI makes `Open failed deploy receipt` easy to find
- action ordering still feels deliberate under higher-risk conditions

### 4. Restored Session

Relaunch with restored runs present.

Confirm:

- the recovery strip and restored-session card say the same thing in the same voice
- the restored-session card keeps the safest next move visible
- `Open Runs` and `Inspect run` are still available without competing with the primary action
- the user can understand the situation from the Agent thread alone

## Pass Bar

This pass is ready when:

- receipts foreground intent, command, cwd, timestamps, exit path, artifacts, clues, and safest next move
- recovery language is consistent across thread, Runs inspector, and restored-session card
- primary and cautionary actions are obvious without feeling noisy
- failure summaries feel grounded in evidence, not generic assistant language

## If Something Fails

Record:

- scenario
- screen or panel where the wording/action felt wrong
- exact summary text shown
- expected safer wording or action order

Then fix the renderer copy or action ordering before moving on to capability packs.

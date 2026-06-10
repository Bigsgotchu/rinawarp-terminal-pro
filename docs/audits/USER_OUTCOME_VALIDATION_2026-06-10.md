# User Outcome Validation - 2026-06-10

## Goal

Validate the primary RinaWarp Terminal Pro user outcome through existing systems:

Observe -> Plan -> Approve -> Execute -> Verify -> Proof -> Remember

## Acceptance Scenario

Implemented in `apps/terminal-pro/tests/unit/user-outcome-validation.test.ts`.

The test uses a real temporary project on disk with:

- `package.json`
- `package-lock.json`
- `vercel.json`
- a runnable `npm run build` script
- observed React, Vite, Clerk, and SQLite dependency signals

Flow validated:

1. Observe workspace with `inspectProjectWorkspace(...)`.
2. Build WorkspaceContext with `hydrateWorkspaceKnowledge(...)` and `buildWorkspaceContext(...)`.
3. Ask "What do you know about this project?"
4. Verify the answer comes from WorkspaceKnowledge built from observed WorkspaceContext.
5. Ask "Plan a safe change."
6. Verify the turn requires approval and the planner uses observed project facts.
7. Approve by recording explicit approval metadata.
8. Execute a real `npm run build` command in the temp project.
9. Record command, exit code, runtime id, proof id, and evidence rows in `StructuredSessionStore`.
10. Verify Proof with `verifyProof(...)`.
11. Ask "Why did this change?"
12. Verify the answer uses runtime/Proof metadata, including the latest command and Proof reference.
13. Re-open the same SQLite WorkspaceFact store to simulate restart.
14. Ask "What do you remember?"
15. Verify the answer comes from hydrated WorkspaceKnowledge containing verified Proof-derived facts.

## Seam Fixes

- `conversationRouter` now treats "Plan a safe change" as an approval-plan action.
- `buildPlan` now handles safe-change prompts by using the existing observed project context and safest build verification path before mutation.
- `conversationResponder` includes the latest runtime command in Proof-backed "why" answers.
- `conversationResponder` treats "What do you remember?" as a WorkspaceKnowledge inspection request.

## Guardrails

- No mocked execution.
- No fake Proof.
- No AI-inferred memory.
- No new product surface.
- No new architecture layer.
- Changed-file Proof remains conditional on actual file-change evidence.

## Validation

Passing:

```sh
npm --workspace apps/terminal-pro exec vitest -- run --root . tests/unit/user-outcome-validation.test.ts
```

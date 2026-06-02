# Adaptive Trusted Workbench Gap Map

> Maps the live codebase to [ADAPTIVE_TRUSTED_WORKBENCH_SPEC.md](/home/karina/Documents/rinawarp-terminal-pro/docs/ADAPTIVE_TRUSTED_WORKBENCH_SPEC.md).
> Status is based on the current `apps/terminal-pro` implementation and validation suite as of 2026-03-20.

## Milestone Status

### Milestone 1 — Proof path locked

Status: `Done`

Evidence:

- [agent-runproof.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/agent-runproof.spec.ts) exists
- `test:e2e:proof` exists in [package.json](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/package.json)
- `Proof: full` exists in [.vscode/tasks.json](/home/karina/Documents/rinawarp-terminal-pro/.vscode/tasks.json)
- canonical proof execution and receipts are exercised in current suites

### Milestone 2 — Runs inspector becomes signal-first

Status: `Done`

Evidence:

- runs are scoped/filterable from canonical workbench UI state in [store.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/store.ts)
- signal-first filtering/rendering exists in [runsPanel.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/renderers/runsPanel.ts)
- `Current workspace only` and visibility toggles are live

### Milestone 3 — Rina cards replace raw result blobs

Status: `Done`

Evidence:

- typed thread blocks and reply cards already exist in:
  - [renderRinaReply.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/replies/renderRinaReply.ts)
  - [renderPlanReplies.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/replies/renderPlanReplies.ts)
  - [renderCommandReplies.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/replies/renderCommandReplies.ts)
  - [renderExecutionReplies.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/replies/renderExecutionReplies.ts)
- explicit reply-card kinds now exist for:
  - build result
  - test result
  - deploy result
  - fix result
  - recovery
  - execution halt
  - plan
  - capability
- these card kinds render through the canonical structured thread model in:
  - [types.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/types.ts)
  - [messageBlocks.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/renderers/messageBlocks.ts)
- proof-focused acceptance remains green:
  - `npx playwright test tests/e2e/agent-runproof.spec.ts tests/e2e/killer-intents.spec.ts -c tests/playwright.config.ts --reporter=line`

### Milestone 4 — Explicit owner memory foundation

Status: `Done`

Evidence:

- dedicated owner memory store exists in [memoryStore.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/memory/memoryStore.ts)
- storage is independent from proof/session storage and persists in `rina-memory-v1.json`
- explicit owner profile + workspace preference writes are exposed through [registerMemoryIpc.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/ipc/registerMemoryIpc.ts)
- unit coverage exists in [memory-store.test.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/unit/memory-store.test.ts)

### Milestone 5 — Owner-only memory controls

Status: `Done`

Evidence:

- owner identity resolves in main process from license customer ID first, local-device fallback second in [memoryStore.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/memory/memoryStore.ts)
- owner memory controls are live in the Settings overlay via [memory.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/settings/panels/memory.ts)
- the Settings rail now includes the Memory panel through [bootstrap.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/settings/bootstrap.ts)
- product-path persistence is covered in [settings.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/settings.spec.ts)

### Milestone 6 — Response composer integration

Status: `Done`

Evidence:

- explicit response composer exists in [responseComposer.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/services/responseComposer.ts)
- the agent execution flow now composes lead reply framing from proof state plus owner memory before rendering in [agentExecutionFlow.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/services/agentExecutionFlow.ts)
- structured reply rendering consumes that composer output in [renderRinaReply.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/replies/renderRinaReply.ts)
- unit coverage exists in [response-composer.test.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/unit/response-composer.test.ts)

### Milestone 7 — Inferred memory (post-MVP gate)

Status: `Partially implemented behind owner review`

Evidence:

- inferred memory suggestions are now generated from repeated run history in [memoryStore.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/memory/memoryStore.ts)
- suggestions stay explicit and reviewable in the Memory settings panel in [memory.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/settings/panels/memory.ts)
- owner approval and dismissal are enforced through the main-process IPC bridge in [registerMemoryIpc.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/ipc/registerMemoryIpc.ts)
- unit coverage exists in [memory-store.test.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/unit/memory-store.test.ts)

Remaining gap:

- inferred memories are still generated from bounded run-history heuristics only
- they are not yet broadly consumed by the response composer
- they remain intentionally guarded by owner review before they can shape behavior

### Milestone 8 — Agent presence feels alive on first glance

Status: `Done`

Evidence:

- the Agent surface now renders an explicit welcome/state card, suggested actions, recent proof summary, and recovery summary in:
  - [agentThread.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/renderers/agentThread.ts)
- the welcome/state card collapses once real thread activity exists, so the empty-state scaffolding yields to live conversation/proof
- product trust/status pills are split from quieter dev/debug pills in:
  - [agentThread.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/renderers/agentThread.ts)
  - [renderer-agent-proof-status.css](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/styles/renderer-agent-proof-status.css)
- empty-state styling and welcome-card styling are live in:
  - [renderer-agent-layout.css](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/styles/renderer-agent-layout.css)
- focused Playwright coverage exists in:
  - [agent-empty-state.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/agent-empty-state.spec.ts)

### Milestone 9 — Conversational robustness holds under messy input

Status: `Done`

Evidence:

- main-layer turn routing now exists in [conversationRouter.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/orchestration/conversationRouter.ts)
- active `runAgent` behavior now routes conversational turns through main orchestration before execution eligibility in [windowLifecycle.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/window/windowLifecycle.ts)
- renderer-side execution gating now consults the main-layer route before using build/test/deploy/fix prompt heuristics in [agentExecutionFlow.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/services/agentExecutionFlow.ts)
- focused Playwright coverage exists in:
  - [rina-conversation-resilience.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/rina-conversation-resilience.spec.ts)

What it covers:

- vague messy asks reframe into inspect-first replies
- proof-aware questions do not accidentally execute
- frustrated input gets grounded responses
- casual turns preserve workspace context without triggering execution
- ambiguous follow-ups resolve against recent run context
- explicit preference statements are recognized without hidden memory writes

## Immediate Next Build Order

1. Broaden inferred memory consumption carefully so only approved entries can influence more composer paths
2. Add richer receipt/artifact proof surfaces if we want an even stronger post-MVP proof UX
3. Use the new renderer boot/proof latency instrumentation to guide any targeted performance work
4. Consider deeper first-run/project-summary personalization only after the current empty-state and conversation-routing contracts prove stable

## Current Validation Baseline

The current repo is already green on:

- `npm run build:electron`
- `npm exec tsc -- --noEmit --pretty false --noUnusedLocals --noUnusedParameters -p tsconfig.json`
- `npm run test:unit`
- `npm run test:e2e:proof`
- `npm run test:trust-smoke`
- `npm run test:playwright`
- `npx playwright test tests/e2e/settings.spec.ts -c tests/playwright.config.ts --reporter=line`
- `npx playwright test tests/e2e/marketplace.spec.ts -c tests/playwright.config.ts --reporter=line`

This means Milestones 1 through 6 and Milestone 8 are implemented on the live product surface, and Milestone 7 now exists in a guarded owner-review form rather than being purely deferred.

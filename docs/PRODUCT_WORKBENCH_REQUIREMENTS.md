# RinaWarp Product Workbench Requirements

> Last Updated: 2026-03-20

## Product Definition

RinaWarp should be the place where a user asks for work, watches verified execution happen, and stays in flow from idea to proof to recovery.

The adaptive next-phase product spec lives in [ADAPTIVE_TRUSTED_WORKBENCH_SPEC.md](/home/karina/Documents/rinawarp-terminal-pro/docs/ADAPTIVE_TRUSTED_WORKBENCH_SPEC.md), and the current implementation status against that spec lives in [ADAPTIVE_TRUSTED_WORKBENCH_GAP_MAP.md](/home/karina/Documents/rinawarp-terminal-pro/docs/ADAPTIVE_TRUSTED_WORKBENCH_GAP_MAP.md).

The core loop is:

`ask -> act -> prove -> recover`

This product is not trying to be:

- the best terminal
- the best chat UI
- the tool with the most features

It is trying to be unbeatable at one thing:

turning intent into verified action, in one calm place.

## Product Priorities

1. Trust is the product.
Rina should never feel like she is pretending. No success state without a real run, exit code, and proof artifact.

2. The Agent thread is the home screen.
The user should not need to jump between primary surfaces to understand what is happening.

3. Build, test, and deploy are the first magical jobs.
These three intents should feel more reliable than any other workflow before the product broadens.

4. One execution spine only.
One runner, one runs model, one receipts model, one workspace-root authority, one renderer store.

5. Calm beats busy.
The UI should reduce cognitive load, not advertise every subsystem at once.

6. Context must be durable.
Goals, recent runs, failures, recoveries, workspace facts, and capability state should persist clearly enough to continue work without drift.

7. Capabilities should stay modular.
Core Rina should stay simple; capability packs can extend her safely.

8. Recovery is first-class.
When things fail, the product should become more useful, not less trustworthy.

## MoSCoW Requirements

### Must Have

- Agent thread is the default and dominant home screen.
- `Ask Rina` is the main CTA.
- Every meaningful execution creates an inline run block under the related thread message.
- No claim is shown as complete without a linked run, exit code, and receipt/proof artifact.
- Workspace root comes from one main-process authority only.
- All user-facing execution flows go through one canonical runner path.
- Terminal, Runs, Code, and Diagnostics behave as inspectors, not competing primary surfaces.
- The thread shows enough proof to answer:
  - what is Rina doing?
  - where is it running?
  - what changed?
  - did it work?
  - can I inspect it?
- Failure states surface proof, likely cause, and safest next actions.
- Build this project, Run/fix the tests, and Deploy all complete the full loop:
  - intent understanding
  - short plan
  - canonical execution
  - inline progress
  - receipt/proof
  - concise outcome
  - suggested next action
- Renderer UI truth flows through the canonical workbench store.

### Should Have

- A compact truth HUD is always visible in the Agent workbench showing:
  - workspace
  - mode
  - last run
  - IPC/runner state
  - renderer/store state
- Capability packs are local-first, permissioned, allowlisted, and proof-producing.
- Recovery cards and retry/fix actions appear inline in the thread after failures.
- Runs remain recoverable across sessions with clear restored-state labeling.
- The interface feels calm:
  - one full-height agent canvas
  - docked composer
  - hidden terminal until inspected
  - minimal visual clutter

### Could Have

- Additional capability packs for system, device, cloud, and doctor workflows.
- Product instrumentation for:
  - time from request to verified result
  - percent of runs with proof attached
  - recovery success rate
  - terminal fallback rate
- Feature flags for gradual rollout of renderer migration slices.

### Won't Have

- No terminal-first homepage.
- No unverified “done” language.
- No multiple long-lived execution paths.
- No framework migration as part of this product-definition phase.
- No broad feature expansion before build/test/deploy and recovery are reliable.

## Product Guardrails

- Keep the current agent-first UI direction as the baseline.
- Improve architecture behind stable seams instead of rewriting the app all at once.
- Do not re-promote terminal-first affordances while fixing architecture.
- Do not add more panels to compensate for weak proof or weak recovery.
- Do not ship visually polished states that lack backing records.

## Success Metrics

- Time from request to verified result.
- Percent of runs with proof attached.
- Recovery success rate after failed runs.
- Build/test/deploy completion rate.
- Number of times users must drop to the raw terminal.
- Number of UI success states rendered without backing run records.

## Current Refactor Mapping

The renderer refactor should be judged against this product direction:

- home screen: Agent thread
- execution surface: inline run blocks
- proof model: run + exit + receipt
- inspection model: drawers
- recovery model: first-class and inline
- state model: canonical workbench store
- execution model: one runner only

If a change improves local implementation quality but weakens `ask -> act -> prove -> recover`, it is the wrong change.

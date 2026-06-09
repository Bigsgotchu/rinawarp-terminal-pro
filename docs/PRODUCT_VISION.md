# RinaWarp Product Vision

RinaWarp Terminal Pro is a natural-language AI copilot for real computer work.

The primary experience is the Agent Thread. Users describe work in plain language, and Rina observes the project, plans the task, executes through AgentRuntime, streams progress, verifies outcomes, produces user-visible Proof, and remembers useful project context without storing secrets.

Agent Shell is only the Electron desktop container. The product is not a dashboard, workbench, or panel-driven interface.

The moat is the proof-backed execution loop: runtime-controlled automation, observable execution, verification, run history, exportable receipt artifacts behind the Proof layer, and durable project memory.

Current development focus is hardening the execution pipeline, planner approvals, proof generation, runtime reliability, and memory hydration while preserving a compact operator-first experience.

RinaWarp is not a terminal wrapper with an AI chat panel. It is an execution agent whose primary product loop is:

```text
ask -> observe -> plan -> execute -> verify -> proof -> remember
```

The product succeeds when a new user can install RinaWarp, type "Rina, fix my project", approve any mutation, watch execution happen, receive proof, and trust the result without needing to operate a terminal directly.

## Primary Experience

Agent Thread is the primary UI.

The user should live in this sequence:

```text
question
-> plan
-> execution stream
-> proof
-> receipt export when needed
```

Logs, debug views, and raw diagnostic surfaces are supporting tools. If they become the main place users work, the product has drifted back toward a terminal wrapper.

## Runtime Ownership

Execution must be owned by the runtime.

The required flow is:

```text
user
-> intent
-> AgentRuntime
-> tools
-> proof
-> receipt export when needed
```

The UI must not simulate completion, invent execution state, or treat renderer-local state as the source of truth for runtime behavior. Renderer state can display runtime facts, but runtime-owned execution records and receipts are the authority.

## Proof Requirement

Every meaningful action must produce proof.

This applies to flows such as:

- fix my project
- run tests
- deploy app
- check ports
- diagnose disk
- recover a failed build

Each flow must produce:

- Proof
- receipt export when needed
- verification result

No action should be considered complete because the assistant explained what it would do. Completion means Rina planned, executed or safely refused, verified, and produced user-visible Proof.

## Execution Memory

Memory is execution experience.

RinaWarp memory should learn from work performed in a workspace, including:

- project patterns
- successful commands
- failed commands
- workspace structure
- verification outcomes
- approved and denied actions

Memory is not primarily a chat transcript and is not AI personality memory. It should make future execution safer, faster, and more accurate.

## Product Standard

Many AI products stop at explanation:

```text
user asks
-> AI explains
```

RinaWarp must continue through execution:

```text
user asks
-> AI plans
-> AI executes
-> AI verifies
-> AI proves
```

Features should be evaluated against the product loop:

```text
ask -> observe -> plan -> execute -> verify -> proof -> remember
```

Anything that does not support that loop is infrastructure, supporting capability, or legacy residue that should eventually be removed, refactored, or clearly demoted.

## Validation Standard

The real product test is not whether the architecture sounds correct. The test is whether someone who has never seen the code can:

```text
install RinaWarp
-> ask "Rina, fix my project"
-> see understanding
-> review a plan
-> approve mutation
-> watch execution stream
-> inspect proof
-> export receipt artifacts when needed
-> trust the result
```

If that works without the user touching a terminal, RinaWarp is approaching this product definition. If it does not, the missing work is product behavior, not documentation.

## Current Implementation Signals

The codebase should be validated against this vision with special attention to:

- Agent Thread architecture
- runtime-owned execution records
- Proof presentation
- receipt export artifacts
- approval gates
- persistence
- diagnostics workflows
- runtime trust tests
- Electron packaging
- updater metadata generation

These are supporting signals, not proof by themselves. The product matches the vision only when the full user loop works end to end.

## Known Validation Targets

The following areas require ongoing validation before they can be treated as complete commercial product behavior:

- professional updater channels
- subscription entitlements
- Proof generation and receipt export UX
- runtime recovery workflows
- commercial licensing flow
- public beta install and update experience

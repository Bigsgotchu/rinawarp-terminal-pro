# RinaWarp Product Vision

RinaWarp is not a terminal wrapper with an AI chat panel. It is an execution agent whose primary product loop is:

```text
chat -> plan -> execute -> stream -> receipt -> memory
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
-> receipt
```

Terminal panels, logs, debug tabs, and raw diagnostic surfaces are supporting tools. If they become the main place users work, the product has drifted back toward a terminal wrapper.

## Runtime Ownership

Execution must be owned by the runtime.

The required flow is:

```text
user
-> intent
-> runtime
-> tools
-> proof
-> receipt
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

- proof block
- receipt
- verification result

No action should be considered complete because the assistant explained what it would do. Completion means Rina planned, executed or safely refused, verified, and left a receipt.

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
chat -> plan -> execute -> stream -> receipt -> memory
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
-> receive a receipt
-> trust the result
```

If that works without the user touching a terminal, RinaWarp is approaching this product definition. If it does not, the missing work is product behavior, not documentation.

## Current Implementation Signals

The codebase should be validated against this vision with special attention to:

- Agent Thread architecture
- runtime-owned execution records
- receipts
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
- receipt export UX
- runtime recovery workflows
- commercial licensing flow
- public beta install and update experience

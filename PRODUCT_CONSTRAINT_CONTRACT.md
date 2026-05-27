# RinaWarp Terminal Pro Product Constraint Contract

## Purpose

This document defines the non-negotiable implementation rules for RinaWarp Terminal Pro.

If code violates this contract, it is prototype behavior and must be removed or refactored.

## 1. Core Product Guarantee

RinaWarp Terminal Pro MUST behave as a natural-language AI execution system that converts user intent into safe, observable, transactional system actions.

### Absolute Rule

There is only ONE valid loop in the entire system:

user intent  
-> interpretation  
-> plan  
-> execution  
-> stream updates  
-> verification  
-> receipt  
-> memory update

If any feature bypasses this loop, it is invalid architecture.

## 2. UI Architecture Rules (No Exceptions)

### 2.1 Primary UI

ONLY ONE primary surface exists: Agent Thread (chat timeline).

It MUST contain:

- user messages
- Rina responses
- execution plans
- runtime stream events
- run blocks
- receipts

FORBIDDEN AS PRIMARY UI:

- terminal-first interface
- separate "runs dashboard" as default view
- diagnostics-first panels
- execution hidden from chat
- multiple competing "main screens"

### 2.2 Secondary UI (Inspectors Only)

These are optional overlays/drawers:

- terminal viewer
- logs viewer
- diff viewer
- MCP traces

Rule: Inspectors MUST NEVER be required to understand system behavior.

## 3. Execution Rules (Single Blessed Path)

ALL ACTIONS MUST FOLLOW THIS PATH:

handleIngress (ONLY entry point)  
-> memory injection  
-> policy evaluation  
-> plan generation  
-> transaction creation (if mutation)  
-> sandbox execution  
-> event stream emission  
-> receipt generation  
-> memory update

FORBIDDEN:

- direct CLI execution from UI
- renderer-side execution
- MCP bypassing runtime
- fallback execution paths
- duplicate executors

## 4. Run Block Standard (Critical UX Unit)

Every execution MUST generate a Run Block:

```ts
type RunBlock = {
  runId: string
  intent: string
  status: "planned" | "running" | "success" | "failed"
  steps: string[]
  logs?: string
  diff?: string
  exitCode?: number
  receipt: {
    artifacts: string[]
    rollback?: boolean
  }
}
```

UI Rule: Run Blocks MUST:

- appear inside chat thread
- update live during execution
- end with receipt
- be expandable, not separate views

## 5. Memory Rule (Behavioral Adaptation)

MEMORY IS NOT CHAT HISTORY.

Memory is execution experience compression.

Memory types:

- failure pattern
- success pattern
- decision trace
- workspace context snapshot

Required behavior:

After every execution:

- If success, store strategy used and outcome pattern.
- If failure, store failure signature, root cause, and environment context.

Before each new intent:

- Inject relevant memory into runtime context.

Optionally surface:

- "Rina has seen this failure before"
- "Rina is adjusting strategy based on past runs"

## 6. Receipt Rule (Trust System)

NO CLAIM WITHOUT PROOF.

Rina MUST NOT say "done", "fixed", or "completed" without:

- runId
- exit code
- execution log or diff
- artifact reference

Receipt MUST include:

- commands executed
- files changed
- outputs
- rollback status (if any)

## 7. Workspace Rule (Anti-Bug Core)

Single source of truth:

workspaceRoot = mainProcessProvidedValue

Rules:

- NEVER derive from URL
- NEVER derive from renderer
- NEVER use relative path guessing
- NEVER allow `..` traversal logic for root resolution

## 8. Safety Model

Rina may ONLY act under:

- sandboxed execution layer
- allowlisted tools
- mutation transactions
- explicit rollback system
- receipt generation

NO EXCEPTIONS.

If safety model is bypassed, system is invalid.

## 9. Event Stream Rule

All execution must emit structured events:

- intent.received
- plan.generated
- transaction.created
- execution.running
- execution.complete
- rollback.triggered

UI MUST:

- render stream live in chat
- never hide execution state

## 10. Playwright Role (System Validation)

Playwright MUST validate:

- full intent -> receipt loop
- rollback correctness
- stream ordering
- memory updates
- no UI bypass execution paths

## 11. Product Principle (Most Important)

RinaWarp is NOT:

- a chatbot
- a terminal wrapper
- a code assistant

RinaWarp IS a controlled execution agent system with observable, transactional, and replayable system actions driven by natural language.

## 12. Prototype Detection Rule

If any code:

- bypasses runtime
- executes directly from UI
- does not produce receipts
- does not emit events
- does not update memory
- introduces duplicate execution paths

It MUST be removed or refactored.

## Final System Guarantee

If implemented correctly, the user experience is:

"I speak naturally -> Rina understands -> I see what she is doing -> I get proof of everything -> nothing is hidden"

## How To Use This

Use this document as:

- architecture validator
- PR review checklist
- CI enforcement reference
- refactor elimination guide

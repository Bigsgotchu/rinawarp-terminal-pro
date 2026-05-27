# RinaWarp System Contract (Single Source of Truth)

## 0. Purpose

This document defines the unified meaning of all actions, tools, and systems in RinaWarp.

All components (runtime, MCP, cloud, UI, agents) MUST conform to this contract.

If a system behavior is not consistent with this document, it is invalid.

---

## 1. Core Definition: What is a "Rina Action"

A Rina Action is ANY attempt to change system state.

A Rina Action MUST always follow this lifecycle:

1. Intent is created
2. Transaction is created (immutable record)
3. Diff is computed
4. Policy is evaluated
5. Approval is granted or denied
6. Execution occurs (or is rejected)
7. Result is recorded

NO EXCEPTIONS.

---

## 2. Runtime Truth (Immutable Layer)

The following components define system truth:

### 2.1 RinaRuntime (Authoritative Engine)

RinaRuntime is the ONLY system allowed to:
- apply changes to filesystem
- execute mutations
- commit transactions
- perform rollback

No external system may bypass it.

---

### 2.2 Transaction Model

All changes MUST be represented as:

- created → proposed → approved → applied → (optional: rolled back)

Transactions are immutable once created.

---

### 2.3 Diff Model

All changes MUST generate a structured diff object.

Diffs are:
- first-class objects
- required for approval
- required for execution

No diff = no execution.

---

### 2.4 Approval Model

All non-trivial actions MUST pass through policy evaluation.

Approval may be:
- auto-approved (safe reads)
- policy-approved (low risk writes)
- human-approved (high risk changes)

Approval is REQUIRED before execution.

---

## 3. MCP System Rules (Tool Layer)

MCP (Model Context Protocol) systems are:

### ALLOWED:
- reading external systems
- proposing actions
- generating MCPAction objects

### FORBIDDEN:
- direct filesystem mutation
- direct execution
- bypassing RinaRuntime
- performing state changes without transactions

MCP is ALWAYS an INPUT LAYER ONLY.

MCP does NOT define system behavior.

MCP does NOT execute actions.

All MCP outputs MUST be converted into Rina Transactions.

---

## 4. Cloud System Rules (Product Layer)

Cloud systems (API, billing, agents) are:

- interfaces into RinaRuntime
- NOT independent execution systems

Cloud services MUST:

- create transactions via runtime
- never mutate state directly
- never bypass approval pipeline

Stripe, billing, and subscriptions are ENTITLEMENT SYSTEMS ONLY.

They do not affect runtime logic directly.

---

## 5. UI System Rules (Frontend Layer)

UI systems (terminal, web, chat) are:

- visual representations of runtime state
- NOT execution engines

UI may:

- display transactions
- request actions
- show diffs
- show approvals

UI may NOT:

- mutate state directly
- bypass runtime
- execute MCP actions directly

UI is READ + REQUEST ONLY.

---

## 6. Execution Hierarchy (STRICT ORDER)

All actions MUST flow in this order:

1. UI / MCP / Cloud input
2. RinaRuntime.propose()
3. Diff generation
4. Approval evaluation
5. Execution engine
6. State commit
7. Observability logging

Skipping any step is a system violation.

---

## 7. System Invariants (NON-NEGOTIABLE)

The system MUST always enforce:

- No direct mutation outside RinaRuntime
- No execution without transaction
- No approval bypass
- No MCP direct writes
- No UI direct state changes
- No cloud direct filesystem access

If any invariant is violated:
→ system must reject operation

---

## 8. Failure Mode Rules

If a system component is uncertain:

- default to REJECT
- never assume approval
- never execute partial state changes
- always preserve rollback capability

Safety > availability.

---

## 9. Source of Truth Hierarchy

In case of conflict:

1. RinaSystemContract (this document)
2. RinaRuntime implementation
3. CI enforcement rules
4. MCP adapters
5. Cloud services
6. UI behavior

---

## 10. System Identity Statement

RinaWarp is:

A controlled execution environment where all AI-assisted actions are converted into verifiable, reversible transactions governed by policy and executed through a single runtime engine.
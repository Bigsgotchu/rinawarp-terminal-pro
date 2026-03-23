# RinaWarp V2 Architecture

> Last Updated: 2026-03-23
>
> This document defines the target architecture for the next major RinaWarp desktop iteration.
> It is a migration target, not a rewrite mandate.
>
> Product direction remains anchored in [PRODUCT_WORKBENCH_REQUIREMENTS.md](/home/karina/Documents/rinawarp-terminal-pro/docs/PRODUCT_WORKBENCH_REQUIREMENTS.md).
> The current trusted-workbench execution spine remains defined in [ADAPTIVE_TRUSTED_WORKBENCH_SPEC.md](/home/karina/Documents/rinawarp-terminal-pro/docs/ADAPTIVE_TRUSTED_WORKBENCH_SPEC.md).

## One-Line Product Definition

RinaWarp should be an Electron-based, proof-first agent workbench with editor, diff, receipts, and recovery, running on a standard React/TypeScript renderer over the execution core already built.

## Why V2 Exists

The current product direction is right:

- agent-first workbench
- proof-backed execution
- receipts and recovery
- build/test/deploy as primary magical jobs
- local-first execution with optional hosted paths

The current product pain is not the core model. It is the architecture tax around it:

- custom renderer shell
- too much imperative DOM coordination
- mixed conversation and execution framing
- manual ownership cleanup to prevent haunted UI
- ad hoc capability metadata

V2 exists to keep the product while replacing the most expensive implementation surfaces.

## Core Product That Stays

These are stable foundations and should not be thrown away:

- Electron desktop distribution
- proof-first execution model
- run + receipt + artifact truth model
- recovery and restored-session continuity
- workspace-first local execution
- optional hosted `agentd`
- build, test, deploy, diagnose as primary intents
- release gates and no-fake-success discipline

V2 is not a new product category. It is a cleaner architecture for the same product.

## High-Level Stack

### Product

- Proof-first AI agent workbench
- Coding + build/test/deploy
- Receipts + recovery

### Desktop Shell

- Electron

### Renderer

- React
- TypeScript
- Monaco editor
- componentized shell surfaces for:
  - Agent surface
  - File tree
  - Diff view
  - Receipts
  - Recovery
  - Terminal / runs

### State

- Domain state
  - workspace
  - conversation
  - runs
  - receipts
  - recovery
  - capabilities
  - billing/license
- UI state
  - active panel
  - open drawers
  - selected file
  - selected receipt
  - selected run
  - palette state
  - settings visibility

### Agent Layer

- conversation responder
- intent router
- action planner
- execution controller

### Storage

- SQLite
- filesystem artifacts

### Execution

- local-first
- optional hosted `agentd`

## Architectural Principles

### 1. Keep The Product, Replace The Shell

The execution/proof engine is already valuable. V2 should not replace it.

Replace:

- custom renderer shell
- imperative panel rendering
- mixed conversation/execution response handling
- ad hoc capability metadata

Keep:

- one execution spine
- one proof spine
- one recovery model

### 2. Standard Renderer, Not More Custom DOM

The renderer should move toward a standard component model.

Target stack:

- React + TypeScript
- a small store such as Zustand
- Monaco for code editing and diff
- token-driven styling

Avoid in V2:

- more direct DOM listeners as a long-term pattern
- more synthetic clicks
- more inline runtime ownership patches as the primary answer

The current desktop shell is now canonical for the mounted customer-visible
regions. The remaining legacy renderer fallback exists only as a short-lived
emergency rollback switch and should be removed after one stable release cycle
if no blocker requires it.

### 3. Domain State And UI State Must Stay Separate

Domain state answers:

- what happened
- what exists
- what is true

UI state answers:

- what is open
- what is selected
- what is focused

The app should not need UI flags to infer execution truth, and it should not need run/receipt records to decide simple panel toggles.

### 4. Conversation Must Be Separate From Execution

This split is mandatory in V2.

The conversation responder handles:

- greetings
- help
- explanation
- supportive/frustrated replies
- natural language summaries

The intent router handles:

- classify user request
- identify allowed next action
- determine whether reply, inspect, plan, execute, or clarify is appropriate

The action planner handles:

- plan creation
- capability selection
- file/workspace-aware preflight

The execution controller handles:

- run creation
- streaming
- receipt finalization
- recovery checkpoints

No single layer should own all four concerns.

### 5. Capabilities Must Be Formal, Not Inferred From Marketing Copy

Capability metadata must be declared as contracts, not reverse-engineered from package descriptions.

Every capability should declare:

- `id`
- `category`
- `permissions`
- `tier`
- `actions`
- `proof requirements`
- `risk level`
- `recovery behavior`

This lets capabilities scale without turning the product into a giant bundle of exceptions.

## Target Module Map

### Desktop

- `apps/terminal-pro/src/main/`
  - Electron app lifecycle
  - IPC registration
  - execution bridge
  - workspace authority

### Renderer

- `apps/terminal-pro/src/renderer/app/`
  - React app entry
  - shell layout
  - routing / panel composition
- `apps/terminal-pro/src/renderer/components/`
  - reusable shell and workbench components
- `apps/terminal-pro/src/renderer/features/`
  - agent
  - runs
  - receipts
  - recovery
  - code
  - capabilities
  - diagnostics
  - settings
- `apps/terminal-pro/src/renderer/state/`
  - Zustand stores or equivalent
  - selectors
  - UI actions

### Agent / Conversation

- `apps/terminal-pro/src/main/orchestration/`
  - `conversationResponder.ts`
  - `intentRouter.ts`
  - `actionPlanner.ts`
  - `executionController.ts`

### Capability System

- `apps/terminal-pro/src/rina/capabilities/`
  - contracts
  - registry
  - execution adapters
  - catalog

### Storage

- SQLite for metadata:
  - runs
  - receipts index
  - recovery checkpoints
  - memory/preferences
  - capability install state
- filesystem for:
  - raw artifacts
  - output tails
  - diffs
  - receipt payloads
  - support/debug bundles

## Renderer Architecture

### Shell Layout

The shell should be explicit:

- left rail: navigation
- center canvas: Agent thread by default
- right or center inspectors:
  - runs
  - receipt
  - diagnostics
  - code
  - capabilities
- bottom utility strip:
  - workspace
  - mode
  - last run
  - recovery

Settings should have one owner only:

- modal
- dedicated panel
- or dedicated route

But not multiple competing visibility paths.

### Shell Components

At minimum, V2 should break the renderer into components such as:

- `WorkbenchShell`
- `AgentSurface`
- `FileTreePanel`
- `DiffPanel`
- `RunsPanel`
- `ReceiptPanel`
- `RecoveryPanel`
- `CapabilitiesPanel`
- `DiagnosticsPanel`
- `SettingsShell`
- `Composer`
- `TruthBar`

These can begin as non-React view-model-backed render helpers if needed, but the target is React components.

### Monaco

Monaco should be used for:

- file preview
- file edit
- diff review
- patch/diff surfaces

It should not own global product navigation or proof UI.

## State Architecture

### Domain Store

The domain store should contain:

```ts
type DomainState = {
  workspace: WorkspaceState
  conversation: ConversationState
  runs: RunsState
  receipts: ReceiptsState
  recovery: RecoveryState
  capabilities: CapabilityState
  billing: BillingState
}
```

### UI Store

The UI store should contain:

```ts
type UIState = {
  activePanel: PanelId
  openDrawers: DrawerState
  selectedFile: string | null
  selectedRunId: string | null
  selectedReceiptId: string | null
  paletteOpen: boolean
  settingsOpen: boolean
}
```

### Rules

- UI state must not fabricate domain state
- Domain state must not be polluted with ephemeral focus/visibility flags
- Derived selectors should shape view models for components

## Agent Layer Contracts

### Conversation Responder

Input:

- user turn
- workspace summary
- latest proven run summary
- memory/persona context

Output:

- natural language reply only

It cannot create execution or mark work complete.

### Intent Router

Input:

- user turn
- workspace context
- latest run/recovery references

Output:

- routed mode
- allowed next action
- clarification requirements
- candidate execution goal

### Action Planner

Input:

- routed intent
- workspace
- capabilities
- latest run / receipt context

Output:

- plan
- required capabilities
- risk markers
- preflight requirements

### Execution Controller

Input:

- approved plan
- workspace authority
- capability handler

Output:

- run
- stream events
- receipt
- artifacts
- recovery checkpoint

## Capability Contract

Capabilities should look like:

```ts
type CapabilityContract = {
  id: string
  category: 'build' | 'test' | 'deploy' | 'system' | 'workspace' | 'security' | 'device'
  tier: 'starter' | 'pro' | 'paid'
  permissions: Array<'read-only' | 'workspace-write' | 'network' | 'cloud' | 'device'>
  actions: Array<{
    id: string
    label: string
    risk: 'read' | 'safe-write' | 'high-impact'
    proof: Array<'run' | 'receipt' | 'log' | 'artifact' | 'diff'>
    requiresConfirmation?: boolean
  }>
  recovery: {
    resumable: boolean
    rerunnable: boolean
  }
}
```

Examples:

- `capability.build.node`
- `capability.test.python`
- `capability.deploy.cloudflare`
- `capability.system.selfcheck`

## Storage Architecture

### SQLite Holds Metadata

- run index
- session index
- receipt index
- recovery checkpoints
- workspace history
- billing status cache
- memory / preferences

### Filesystem Holds Evidence

- stdout/stderr tails
- full output blobs when retained
- diffs
- artifacts
- debug bundles
- raw receipts

Do not default to MongoDB for desktop runtime state.

The desktop app needs local durability, inspectability, and simple operational behavior more than it needs a document database.

## Execution Architecture

### Local-First

Default execution should remain local and workspace-aware.

### Optional Hosted

Hosted `agentd` remains optional for:

- background tasks
- remote execution
- account-linked workloads

Hosted execution must still emit the same proof model:

- run
- receipt
- artifacts
- recovery linkage

### Stable Execution Interface

The UI should depend on a narrow execution contract, for example:

```ts
type ExecutionController = {
  planAction(input: PlanInput): Promise<PlanResult>
  executeAction(input: ExecuteInput): Promise<RunHandle>
  streamRun(runId: string, onEvent: (event: RunEvent) => void): () => void
  finalizeReceipt(runId: string): Promise<ReceiptResult>
  recoverRun(runId: string): Promise<RecoveryResult>
}
```

## Migration Plan

### Phase 1: Keep Shipping Current Product

- current Electron app remains the shipped product
- keep release gates mandatory
- no destabilizing rewrite

### Phase 2: Stabilize The New Seams

This is already underway and should continue:

- conversation split
- capability contracts
- shell ownership consolidation
- view-model / surface pattern for workbench panels

### Phase 3: Introduce React Renderer Shell

- create React app root behind a feature flag
- mount new shell around the same workbench state and IPC
- migrate panel surfaces one by one

### Phase 4: Migrate Remaining Panels

Order:

1. Agent surface
2. Runs / receipts
3. Diagnostics / capabilities
4. Settings shell
5. File tree / diff / editor

### Phase 5: Adopt Monaco

- code preview
- diff viewer
- targeted file editing

### Phase 6: Retire Legacy Imperative Renderer Paths

- remove duplicate DOM renderers
- keep ownership/test gates
- preserve proof and recovery semantics

## Mandatory Gates That Stay

These should survive the migration:

- no stubs in production paths
- no fake success paths
- intent contracts
- ownership gates
- wiring / IPC contract checks
- packaged RC verification

The renderer can change. Truthfulness cannot.

## Anti-Goals

V2 should not become:

- a generic AI chat app
- a clone of Cursor
- a terminal homepage again
- a feature factory that weakens proof
- a React rewrite with no migration discipline

## Success Criteria

V2 is successful when:

- the renderer no longer needs repeated haunted-UI ownership cleanup
- conversation feels separate from execution without weakening proof
- capability behavior is declared, not inferred from text
- receipts and recovery remain stronger than competitors
- the product still feels like one calm place for `ask -> act -> prove -> recover`

## Immediate Next Step

Continue panel-by-panel migration using the current safe pattern:

1. typed panel model
2. pure surface renderer
3. centralized shell ownership
4. tests for model + ownership + behavior

Do not pause shipping to attempt a blind full rewrite.

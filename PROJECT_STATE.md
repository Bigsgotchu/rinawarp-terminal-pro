# Project State

## 2026-06-09 Workspace Knowledge Inspection

Added read-only workspace knowledge inspection:

- `buildKnowledgeSummary(...)` now generates structured category summaries from `WorkspaceKnowledgeSnapshot`.
- `buildWorkspaceKnowledgeInspection(...)` formats a human-readable response with:
  - architecture
  - dependencies
  - conventions
  - preferences
  - recurring failures
  - runtime facts
  - confidence counts
- “Rina, what do you know about this project?” routes to a reply-only workspace knowledge answer when a hydrated snapshot is provided.
- No editing UI, dashboard, sidebar, control panel, or persistence changes were added.

Next milestone:

- Workspace Knowledge Acquisition: verified Proof outcomes become WorkspaceFacts for future sessions.

## 2026-06-09 Workspace Knowledge Acquisition

Started proof-derived workspace learning:

- `acquireWorkspaceFactsFromVerifiedProof(...)` converts only fully verified `ProofVerification` records into WorkspaceFacts.
- Partially verified and unverified Proof records are ignored.
- Persisted facts are `source: "proof"` with high confidence.
- Stable proof fact ids make repeated acquisition for the same Proof update existing WorkspaceFactStore records instead of duplicating them.
- No AI-inferred fact acquisition is included in this milestone.

## 2026-06-09 Product Narrative Alignment

RinaWarp Terminal Pro product copy now aligns with `docs/PRODUCT_LOCK.md` and `docs/PRODUCT_UI_LOCK.md`.

Current positioning:

- Product: RinaWarp Terminal Pro
- AI: Rina
- Primary UX: Agent Thread
- Container: Agent Shell
- Runtime: AgentRuntime
- Moat: proof-backed execution
- Internal/export artifact: receipt

The product narrative is Electron + Vite + IPC + AgentRuntime + structured runs + user-visible Proof + local SQLite/memory. It must not be described as Convex, `useStream`, a deployed backend, a web dashboard, or a panel/workbench product.

Changed in this pass:

- Root README now describes Terminal Pro through Agent Thread, Agent Shell, AgentRuntime, and Proof.
- Product vision now centers `ask -> observe -> plan -> execute -> verify -> proof -> remember`.
- Architecture README now describes the real Electron/IPC/AgentRuntime/Proof/local-memory architecture.
- Receipt language is kept behind the Proof layer as an internal/export artifact.

Remaining rule:

- Use Proof as the primary user-facing term.
- Use receipt only for runtime/internal/export artifacts.
- Preserve Agent Thread as the center of the product.

## 2026-06-09 Obsolete Stack Cleanup Audit

Removal report:

- `docs/audits/TERMINAL_PRO_REMOVAL_REPORT_2026-06-09.md`

High-confidence generated/local artifacts removed and left removed in this pass:

- `apps/terminal-pro/test-results/`
- `apps/terminal-pro/.native-cache/`
- `apps/rinawarp-companion/dist/`
- `packages/rinawarp-agentd/dist/`
- `services/rina-cloud-api/dist/`
- `website/.pages-dist/`
- `test-results/`

Generated artifacts deleted during cleanup but recreated for validation:

- `apps/terminal-pro/dist-renderer/`
- `apps/terminal-pro/dist-electron/`
- Terminal Pro dependency package `dist/` outputs required by the current TypeScript/package export contract

No product/runtime source stacks were deleted in this pass.

Remaining medium-confidence removal candidates are TODO only:

- `packages/rinawarp-dashboard/`
- `services/rina-cloud-api/`
- `packages/rinawarp-api-client/`
- website Worker/API/Matter Intelligence backend routes
- `apps/rinawarp-companion/`
- marketplace/plugin/deploy expansion surfaces
- workbench-era planning docs and guard contract text

Remaining low-confidence candidates are TODO only:

- panel-heavy renderer/settings surfaces
- legacy smoke-only shell path
- duplicate-looking planner/runtime paths
- receipt compatibility modules behind the Proof layer
- dependency cleanup after code ownership is settled

Validation note:

- `apps/terminal-pro/package.json` now includes `typecheck`, using the same Terminal Pro TypeScript project build entrypoint as `build:electron`: `tsc -b tsconfig.json --pretty false`.
- `npm --workspace apps/terminal-pro run build:electron` passes after regenerating required workspace package outputs.
- `packages/rinawarp-agentd` still has unrelated standalone build issues around missing tool subpath declarations and undeclared/missing `openai`, `express`, and `ws` dependencies.

Required generated package `dist/` outputs for Terminal Pro:

- `packages/rina-contracts/dist/`
- `packages/rina-core/dist/`
- `packages/rina-runtime/dist/`
- `packages/rinawarp-agent/dist/`
- `packages/rinawarp-context/dist/`
- `packages/rinawarp-core/dist/`
- `packages/rinawarp-safety/dist/`
- `packages/rinawarp-tools/dist/`
- `packages/rina-doctor/dist/`
- `packages/runtime-core/dist/`
- `packages/runtime-contracts/dist/`
- `packages/runtime-feature-agentd/dist/`
- `packages/runtime-feature-diagnostics/dist/`
- `packages/runtime-feature-licensing/dist/`
- `packages/runtime-feature-team/dist/`
- `packages/runtime-feature-workspace/dist/`
- `packages/runtime-platform-electron/dist/`

Regenerate required package outputs with:

- `npm --workspace packages/rina-contracts run build`
- `npm --workspace packages/rina-core run build`
- `npm --workspace packages/rina-runtime run build`
- `npm --workspace packages/rinawarp-agent run build`
- `npm --workspace packages/rinawarp-context run build`
- `npm --workspace packages/rinawarp-core run build`
- `npm --workspace packages/rinawarp-safety run build`
- `npm --workspace packages/rinawarp-tools run build`
- `npm --workspace packages/rina-doctor run build`
- `npm --workspace packages/runtime-core run build`
- `npm --workspace packages/runtime-contracts run build`
- `npm --workspace packages/runtime-feature-agentd run build`
- `npm --workspace packages/runtime-feature-diagnostics run build`
- `npm --workspace packages/runtime-feature-licensing run build`
- `npm --workspace packages/runtime-feature-team run build`
- `npm --workspace packages/runtime-feature-workspace run build`
- `npm --workspace packages/runtime-platform-electron run build`

Do not delete those package `dist/` folders blindly. Terminal Pro currently imports package exports that resolve to `dist` files, and some source imports reference `packages/*/dist/index.js` directly. They can be removed permanently only after the monorepo is converted to source-based workspace imports or project-reference paths that do not require generated package output.

## 2026-06-09 Planner Approval Runtime Contract

Runtime trace report:

- `docs/audits/PLANNER_APPROVAL_RUNTIME_TRACE_2026-06-09.md`

Confirmed in this pass:

- `Approve & Run` starts in the Agent Thread renderer action handler and invokes `rina:executePlanStream`.
- Main-process approval handling reaches the registered execution backend via `handleExecutePlanStream(...)` -> `executeRemotePlanForIpc(...)`.
- Approval metadata now flows through IPC into execution and structured-run recording:
  - plan id
  - approval timestamp
  - approval actor
  - runtime id
  - proof id
- Rejection invokes `rina:plan:reject`, never calls execution, and records cancelled Proof evidence.
- Proof identity is now persisted in structured-session command records rather than depending on renderer-only state.

Tests added/extended:

- `apps/terminal-pro/tests/unit/planner-approval.test.ts` (23 tests)

## 2026-06-09 Approved Plan Adapter Implementation

Adapter created at `apps/terminal-pro/src/main/runtime/approvedPlanAdapter.ts`:

- `createApprovedPlanAdapter(...)` returns `executeApprovedPlan(input, eventSender)`
- Input: `plan_id`, `approved_plan`, `approval_timestamp`, `approval_actor`, optional `session_id`/`thread_id`
- Output: `{ ok: true, runtime_id, proof_id, structured_run_id, execution_status }` or rejection variant
- Wraps existing `executeRemotePlan` and `pipeAgentdSseToRenderer` without breaking `/v1/execute-plan` backend
- Proof metadata (`planId`, `approvedAt`, `actor`) passes through adapter boundary via `PlanApprovalMetadata`

Tests added to `apps/terminal-pro/tests/unit/planner-approval.test.ts`:

- Rejects when `approved_plan` is empty/invalid
- Executes valid plan with approval metadata to `executeRemotePlan` and `pipeAgentdSseToRenderer`
- Passes `session_id` to `resolveProjectRootSafe`
- Uses `thread_id` as `planRunId` when provided
- `handleExecutePlanStream` delegates to adapter when `approval.present && confirmed`

Completed work:

- `handleExecutePlanStream` in `agentExecutionFlow.ts` now routes approved plans through `executeApprovedPlan` adapter
- Existing `executeRemotePlan` and `/v1/execute-plan` backend preserved unchanged
- All 61 unit tests pass (3 new guard tests added), typecheck and build:electron pass

## 2026-06-09 Product Guard Tests

Added to `apps/terminal-pro/tests/unit/planner-approval.test.ts`:

- Guard: approved plans must pass through `executeApprovedPlan` adapter (cannot bypass)
- Guard: Proof metadata must contain all required fields (plan_id, approval_timestamp, approval_actor, runtime_id, proof_id)
- Guard: non-approved plans must not carry approval metadata to backend

## 2026-06-09 Proof Verification Pipeline

Runtime verification types added to `apps/terminal-pro/src/structured-session-types.ts`:

- `VerificationStatus`: 'verified' | 'partially_verified' | 'unverified'
- `EvidenceRecord`: id, session_id, command_id, proof_id, type, status, payload, created_at
- `ProofVerification`: verification_status, evidence_count, proof_id

Methods added to `StructuredSessionStore`:

- `recordEvidence(args)`: Persists evidence record to `evidence.ndjson`, returns evidence id
- `verifyProof(proofId)`: Computes verification status from evidence records for a proof

Verification logic in `endCommand`:

- Commands are marked 'verified' when exit_code present AND output exists
- Commands are marked 'partially_verified' when exit_code present OR execution started (but no output)
- Commands are marked 'unverified' when execution never started or no evidence

Tests added to `apps/terminal-pro/tests/unit/planner-approval.test.ts` (6 tests):

- Marks command as verified when exit code and output present
- Marks command as partially_verified when exit code but no output
- Marks command as unverified when neither exit code nor output
- `verifyProof` returns verified when all evidence present
- `verifyProof` returns partially_verified when some evidence present
- `verifyProof` returns unverified when no evidence found

All 67 unit tests pass, typecheck and build:electron pass.

## 2026-06-09 Memory To Workspace Knowledge Audit

Audit report:

- `docs/audits/MEMORY_WORKSPACE_KNOWLEDGE_AUDIT_2026-06-09.md`

Current memory state:

- Active product memory is centered on owner memory with SQLite operational storage and JSON fallback.
- The operational schema stores generic memory entries with scope, kind, status, source, confidence, salience, tags, and metadata.
- Current kinds include `preference`, `constraint`, `project_fact`, `task_outcome`, and `conversation_fact`.
- Repair knowledge is stored as task outcomes with repair-case metadata.
- Older `src/rina/memory/*` modules still represent parallel short-term/session/long-term memory concepts and should be treated as legacy candidates unless proven active.

Proposed direction:

- Introduce Workspace Knowledge as a typed layer for durable project facts.
- Keep user preferences and constraints separate from workspace facts.
- Treat raw conversation turns and `conversation_fact` entries as transient context, not durable truth.

Proposed `WorkspaceFact` minimum shape:

- `key`
- `value`
- `source`
- `confidence`
- `last_verified_at`

Recommended categories:

- technologies
- architecture
- conventions
- dependencies
- recurring failures
- verified facts

Next safe slice:

- Add a read-only `WorkspaceFact` contract and schema proposal tests.
- Do not migrate existing memory rows until the fact extraction and proof-backed verification rules are explicit.

## 2026-06-09 WorkspaceFact Type Seam

Added Workspace Knowledge types without changing storage behavior:

- `WorkspaceFact`
- `WorkspaceFactCategory`
- `WorkspaceFactSource`
- `WorkspaceFactConfidence`

Location:

- `apps/terminal-pro/src/main/memory/memoryTypes.ts`

Locked categories:

- `architecture`
- `dependency`
- `convention`
- `preference`
- `recurring_failure`
- `runtime_fact`

Locked sources:

- `user`
- `runtime`
- `proof`
- `config`
- `inferred`

Locked confidence levels:

- `high`
- `medium`
- `low`

Guard helpers:

- `isWorkspaceFactCategory`
- `isWorkspaceFactSource`
- `isWorkspaceFactConfidence`
- `isWorkspaceFact`

Tests:

- `apps/terminal-pro/tests/unit/workspace-fact-types.test.ts`

Storage note:

- No existing memory rows were migrated.
- No SQLite schema or owner memory store behavior changed.
- This is only the typed seam for future Workspace Knowledge storage and extraction.

## 2026-06-09 WorkspaceFact Normalization Helper

Added storage-neutral WorkspaceFact creation helper:

- `createWorkspaceFact(input)`

Location:

- `apps/terminal-pro/src/main/memory/memoryTypes.ts`

Behavior:

- trims `key`
- trims `value`
- validates category
- validates source
- defaults confidence to `medium`
- defaults `last_verified_at` to `null`
- fills `id`, `created_at`, and `updated_at` when omitted

Rejected inputs:

- empty key
- empty value
- invalid category
- invalid source
- invalid confidence

Tests:

- `apps/terminal-pro/tests/unit/workspace-fact-types.test.ts`

Storage note:

- No SQLite schema changed.
- No existing memory rows were migrated.
- Existing owner memory store behavior is unchanged.

## 2026-06-09 WorkspaceFact Classification Helper

Added deterministic WorkspaceFact classification helper:

- `classifyWorkspaceFact(input)`

Location:

- `apps/terminal-pro/src/main/memory/memoryTypes.ts`

Input:

- `key`
- `value`
- optional `source`

Output:

- `category`
- `confidence`

Classification rules:

- architecture: framework, runtime, architecture, ui, shell, agent
- dependency: package, dependency, database, auth, provider
- convention: naming, lint, formatting, commit, branch
- preference: user preference, coding preference, workflow preference
- recurring failure: repeated build/runtime/test failures
- runtime fact: runtime/proof sourced facts, plus low-confidence fallback

Tests:

- `apps/terminal-pro/tests/unit/workspace-fact-types.test.ts`

Storage note:

- No SQLite schema changed.
- No existing memory rows were migrated.
- Classification only proposes category/confidence before future storage integration.

## 2026-06-09 WorkspaceFact Extraction Helper

Added extraction helper for candidate WorkspaceFacts:

- `extractWorkspaceFacts(input)`

Location:

- `apps/terminal-pro/src/main/memory/workspaceFactExtractor.ts`

Input types:

- `ProjectConfigInput`: runtime, shell, agent, ui, database, authProvider, modelProvider, packageManager
- `ExecutionRecordInput`: command, exitCode, success, output, proofId
- `ProofRecordInput`: proofId, verificationStatus, evidenceCount, command counts
- `MemoryEntryInput`: scope, kind, content, source, salience

Output:

- `WorkspaceFact[]`: candidate facts (not persisted)

Extraction rules:

- Architecture facts from config: runtime, shell, agent, ui
- Dependency facts from config: database, auth, model, package manager
- Runtime facts from successful executions: proof-backed success markers
- Runtime facts from failed executions: exit codes
- Proof facts: verification status, evidence counts
- Memory facts: preference and project_fact entries

Key design decisions:

- Deterministic extraction only - no AI inference
- No memory writes - extraction creates candidates only
- Uses existing `classifyWorkspaceFact` and `createWorkspaceFact` helpers
- `last_verified_at` set from execution/proof timestamps when available

Tests:

- `apps/terminal-pro/tests/unit/workspace-fact-extractor.test.ts`

Storage note:

- No SQLite schema changed.
- No existing memory rows were migrated.
- Extraction completes the pipeline: Raw Data -> Extract -> Classify -> Normalize -> Validate -> Store
- WorkspaceFactStore persistence layer will be added after extraction is stable.

## 2026-06-09 WorkspaceFactStore Interface

Added persistence contract for WorkspaceFact without implementing storage yet.

- `WorkspaceFactStore` interface
- `WorkspaceFactFilter` type
- `createMemoryWorkspaceFactStore()` in-memory test implementation

Location:

- `apps/terminal-pro/src/main/memory/workspaceFactStore.ts`

Interface methods:

- `upsertFact(fact)` - Insert or update a fact
- `getFact(id)` - Retrieve a fact by ID
- `listFacts(filter?)` - List facts with optional filtering
- `deleteFact(id)` - Remove a fact by ID
- `findFactByKey(key)` - Find a fact by key

Filter type `WorkspaceFactFilter`:

- `category?: WorkspaceFactCategory`
- `source?: WorkspaceFactSource`
- `confidence?: WorkspaceFactConfidence`
- `keyPrefix?: string`

In-memory implementation:

- `createMemoryWorkspaceFactStore()` returns a store backed by a Map
- Used for testing the interface contract
- Returns copies of facts, not references
- Implements all 5 methods: upsertFact, getFact, listFacts, deleteFact, findFactByKey

Storage note:

- No existing memory rows were migrated.
- SQLite storage implementation at `apps/terminal-pro/src/main/memory/SqliteWorkspaceFactStore.ts` with schema `WORKSPACE_FACT_SCHEMA_SQL`.
- Schema creates `workspace_facts` table with indexes on key, category, source, confidence.

## 2026-06-09 WorkspaceFact Persistence Guard Tests

Added tests proving deterministic and safe persistence behavior:

- `upsertFact` preserves id through round-trip
- `findFactByKey` returns latest version when fact updated by id
- `listFacts` filters correctly by category, source, confidence, keyPrefix
- `deleteFact` removes records and returns correct boolean
- `confidence` persists through upsert and get
- `category` persists through upsert and get
- `source` persists through upsert and get
- `timestamps` persist through upsert and get
- `last_verified_at` persists through upsert and get
- Invalid facts are rejected at creation time (empty key/value, invalid category/source)
- Duplicate keys are intentionally allowed (multiple facts can share same key)
- `findFactByKey` returns first match when multiple facts share same key
- `upsertFact` updates existing fact by id, not by key

Location: `apps/terminal-pro/tests/unit/workspace-fact-store.test.ts`

## 2026-06-09 WorkspaceFact SQLite Store Tests

Added persistence guard tests for `SqliteWorkspaceFactStore` to verify interface contract matches memory store:

- Same 22 tests as memory store cover: upsertFact, getFact, listFacts, deleteFact, findFactByKey
- Persistence guards for confidence, category, source, timestamps, last_verified_at
- Duplicate key behavior verified
- All 88 unit tests pass (75 workspace fact tests across: 30 memory store + 23 SQLite store + 14 extraction + 8 types/classification, plus 13 agent narration + 14 unified turn)

Fixed SQLite implementation drift:
- `upsertFact` now preserves `updated_at` from input fact (previously overwrote with current time)
- Matches memory store behavior where timestamps are preserved

Location: `apps/terminal-pro/tests/unit/workspace-fact-sqlite-store.test.ts`

## 2026-06-09 Workspace Knowledge Hydration

Implemented read-only workspace knowledge hydration for agent startup:

- `WorkspaceKnowledgeSnapshot` type with grouped facts (architecture, dependencies, conventions, preferences, recurring_failures, runtime_facts)
- `hydrateWorkspaceKnowledge(store)` helper loads facts through `WorkspaceFactStore` interface only
- Facts sorted by confidence (high → medium → low) within each category
- `RinaAgentRequest` extended with optional `workspaceKnowledge` field
- `AgentModelState.workspaceKnowledge` added to receive durable project facts
- `buildAgentContext` merges architecture/dependencies/facts into state

Tests:
- `apps/terminal-pro/tests/unit/workspace-knowledge.test.ts` (6 hydration tests + 8 summary tests = 14 total)
- `apps/terminal-pro/src/renderer/rina-agent-context.test.ts` (2 tests)

All 96 unit tests pass. `typecheck` and `build:electron` pass.

## 2026-06-09 Workspace Knowledge Inspection

Added knowledge visibility layer to expose hydrated workspace knowledge:

- `KnowledgeSummary` type with formatted strings for each category
- `buildKnowledgeSummary(snapshot)` builds human-readable summary from `WorkspaceKnowledgeSnapshot`
- `formatKnowledgeForDisplay(summary)` formats summary as "Workspace Knowledge" report
- Confidence counts tracked (high/medium/low)
- Categories formatted with `- value` bullet style or "None" when empty

Formatted output includes:
- Architecture
- Dependencies
- Conventions
- Preferences
- Recurring Failures
- Runtime Facts
- Confidence counts

Tests:
- `apps/terminal-pro/tests/unit/workspace-knowledge.test.ts` (8 tests total: 6 hydration + 2 summary)

No UI changes. No persistence changes. No editing capability.

## Completed Milestones

- Planner Approval
- Proof Verification
- Proof UI
- WorkspaceFact Foundation
- WorkspaceFact Persistence
- Placeholder Cleanup
- Workspace Knowledge Hydration
- Workspace Knowledge Inspection

without the user repeatedly telling it.

This is where the Remember phase starts becoming real rather than a collection of memory entries.

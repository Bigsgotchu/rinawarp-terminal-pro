# Memory To Workspace Knowledge Audit - 2026-06-09

## Scope

Goal:

- Make memory represent durable project facts rather than chat residue.
- Audit only; no large migration or runtime rewrite in this pass.

Product chain:

- Ask
- Observe
- Plan
- Approve
- Execute
- Verify
- Proof
- Remember

## Current Memory Storage Trace

### Main owner memory store

Primary files:

- `apps/terminal-pro/src/main/memory/memoryStore.ts`
- `apps/terminal-pro/src/main/memory/memorySchema.ts`
- `apps/terminal-pro/src/main/memory/memoryTypes.ts`
- `apps/terminal-pro/src/main/ipc/registerMemoryIpc.ts`

Storage:

- JSON owner profile fallback: `rina-memory-v1.json`
- SQLite operational store: `rina-memory.sqlite`
- SQLite tables:
  - `memory_entries`
  - `conversation_turns`
  - `memory_reviews`

Current entry model:

- `scope`: `session | user | workspace | episode`
- `kind`: `preference | constraint | project_fact | task_outcome | conversation_fact`
- `status`: `approved | suggested | rejected`
- `source`: `user_explicit | assistant_inferred | task_outcome | system_derived`
- `content`, `normalized_key`, `salience`, `confidence`, `tags_json`, `metadata_json`

This is the active product-facing memory path.

### Extraction and retrieval

Primary files:

- `apps/terminal-pro/src/main/memory/RuleBasedMemoryExtractor.ts`
- `apps/terminal-pro/src/main/memory/MemoryRetrieval.ts`
- `apps/terminal-pro/src/main/orchestration/memoryExtractor.ts`
- `apps/terminal-pro/src/main/orchestration/unifiedTurn.ts`

Current behavior:

- Explicit user preferences are extracted, such as package manager preference and concise response preference.
- Task results are stored as `task_outcome`.
- Some workspace facts are inferred from task summaries, such as missing env configuration, tsconfig aliases, and flaky tests.
- Unified turn retrieval merges general memories with repair knowledge.
- Constraints such as “do not touch tests” can affect planning.

Weakness:

- Workspace facts are stored as generic natural-language `content`.
- There is no first-class fact key/value contract for technologies, architecture, conventions, dependencies, recurring failures, or verified facts.
- `conversation_fact` can be captured as raw user/assistant text, which risks storing chat residue beside durable knowledge.

### Repair knowledge

Primary file:

- `apps/terminal-pro/src/main/memory/memoryStore.ts`

Current behavior:

- `recordRepairCase(...)` stores repair outcomes as `task_outcome`.
- Repair entries include metadata:
  - category: `repair_case`
  - outcome
  - signature
  - failure signature
  - commands
  - verification
  - notes

This is the closest current path to execution-derived workspace knowledge.

Weakness:

- Repair facts are still modeled as task outcomes, not typed recurring failure facts.

### Settings UI memory surfaces

Primary files:

- `apps/terminal-pro/src/renderer/settings/panels/memory.ts`
- `apps/terminal-pro/src/renderer/settings/panels/memorySurface.ts`

Current behavior:

- Shows profile preferences.
- Shows workspace conventions.
- Shows inferred memories.
- Shows operational memories.

Weakness:

- “Project conventions” are manually edited key/value rows in the JSON owner profile, separate from SQLite operational memory.
- The UI does not distinguish durable workspace facts from semi-durable preferences and transient conversation facts.

### Legacy Rina memory modules

Primary files:

- `apps/terminal-pro/src/rina/memory/conversation.ts`
- `apps/terminal-pro/src/rina/memory/session.ts`
- `apps/terminal-pro/src/rina/memory/workspace.ts`
- `apps/terminal-pro/src/rina/memory/longterm.ts`
- `apps/terminal-pro/src/rina/memory/projectMemory.ts`
- `apps/terminal-pro/src/rina/memory/persistent-memory.ts`
- `apps/terminal-pro/src/rina/memory/memory-manager.ts`
- `apps/terminal-pro/src/rina/workspace/knowledgeGraph.ts`

Current behavior:

- Stores short-term conversation history.
- Stores current session workspace root, project type, recent commands, and errors.
- Stores long-term JSON preferences and known projects.
- Stores project context in JSON.
- Builds an in-memory workspace graph.

Weakness:

- These modules look like legacy or parallel memory paths.
- They are not clearly integrated with the active owner memory SQLite contract.
- They mix chat/session memory with project knowledge.

## Memory Categories

### Durable

These should become first-class Workspace Knowledge:

- Project technologies: `Auth = Clerk`, `DB = SQLite`, `Runtime = AgentRuntime`, `UI = Agent Thread`
- Package manager and build/test commands when verified from files or successful runs
- Architecture facts verified by source inspection
- Local conventions, such as proof terminology or approval rules
- Recurring failure signatures with verified repair outcomes
- Dependency facts verified from manifests

Current locations:

- `memory_entries.kind = project_fact`
- `memory_entries.kind = task_outcome` with repair-case metadata
- `workspaces[workspaceId].conventions`
- legacy `projectMemory` and `workspace` modules

### Semi-Durable

These should remain memory, but not Workspace Knowledge unless verified against project evidence:

- User preferences, such as concise responses or package-manager preference
- User constraints, such as “ask before touching tests”
- Workspace response/proof style preferences
- Suggested project facts with confidence below a verification threshold
- Recent repair patterns that have not repeated or have not been verified

Current locations:

- owner profile fields
- `memory_entries.kind = preference`
- `memory_entries.kind = constraint`
- `inferredMemories`

### Transient

These should not be treated as durable workspace facts:

- Raw conversation turns
- Current session chat context
- Last user message and last assistant response
- One-off task summaries without verification
- Temporary workspace root/project type detected only for the session

Current locations:

- `conversation_turns`
- `memory_entries.kind = conversation_fact`
- `apps/terminal-pro/src/rina/memory/conversation.ts`
- `apps/terminal-pro/src/rina/memory/session.ts`
- `apps/terminal-pro/src/rina/memory/workspace.ts`

## Proposed Schema

Do not implement this yet. Proposed contract:

```ts
export type WorkspaceFactCategory =
  | 'technology'
  | 'architecture'
  | 'convention'
  | 'dependency'
  | 'recurring_failure'
  | 'verified_fact'

export type WorkspaceFactSource =
  | 'source_inspection'
  | 'package_manifest'
  | 'structured_run'
  | 'proof'
  | 'user_explicit'
  | 'assistant_inferred'

export interface WorkspaceFact {
  id: string
  workspace_id: string
  key: string
  value: string
  category: WorkspaceFactCategory
  source: WorkspaceFactSource
  confidence: number
  last_verified_at: string | null
  proof_id?: string | null
  run_id?: string | null
  evidence_refs?: string[]
  created_at: string
  updated_at: string
}
```

Minimum user-requested shape:

```ts
type WorkspaceFact = {
  key: string
  value: string
  source: string
  confidence: number
  last_verified_at: string | null
}
```

Suggested normalized keys:

- `technology.auth`
- `technology.database`
- `technology.runtime`
- `technology.ui`
- `technology.package_manager`
- `architecture.primary_ux`
- `architecture.execution_backend`
- `convention.proof_term`
- `dependency.sqlite`
- `recurring_failure.<signature>`
- `verified_fact.<topic>`

Example facts:

```json
[
  {
    "key": "technology.runtime",
    "value": "AgentRuntime",
    "source": "source_inspection",
    "confidence": 0.95,
    "last_verified_at": "2026-06-09T00:00:00.000Z"
  },
  {
    "key": "technology.ui",
    "value": "Agent Thread",
    "source": "product_lock",
    "confidence": 1,
    "last_verified_at": "2026-06-09T00:00:00.000Z"
  },
  {
    "key": "technology.package_manager",
    "value": "pnpm",
    "source": "user_explicit",
    "confidence": 0.98,
    "last_verified_at": null
  }
]
```

## Migration Proposal

No migration in this pass.

Recommended future slices:

1. Add `workspace_facts` table and TypeScript contract.
2. Add read-only Workspace Knowledge query API.
3. Add source-inspection fact extractor for package manager, frameworks, runtime, database, and UI architecture.
4. Convert verified repair cases into `recurring_failure` facts when backed by Proof.
5. Stop surfacing raw `conversation_fact` as long-term memory hints.
6. Keep owner profile preferences separate from Workspace Knowledge.
7. Add guard tests proving chat text alone cannot create high-confidence WorkspaceFact entries.

## Audit Conclusion

Memory is functional but still shaped around “things to remember” rather than “workspace truth.”

The strongest current pieces are:

- SQLite-backed operational memory
- explicit status/confidence/source fields
- repair-case metadata
- workspace-scoped query ranking

The main missing piece is a first-class WorkspaceFact model backed by verification/proof. That is what would let Rina reason from workspace truth instead of chat history.

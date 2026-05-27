# @rinawarp/rina-runtime

**Layer 2: Controlled Execution Engine**

This package implements the **semantic nervous system** of RinaWarp. It transforms the repository from "a tool with rules" to "a controlled execution engine where AI-mediated changes are safe."

## 🧠 Core Concept

Every change in RinaWarp goes through a controlled pipeline:

```
PROPOSED → DIFF → APPROVAL → APPLIED (or ROLLED_BACK)
```

At each stage, the system has complete visibility and control:

1. **Transaction** - Atomic unit of change (immutable once created)
2. **Diff** - Structured representation of what changed (queryable, auditable)
3. **Approval** - Gate between proposed and applied (policy-driven or manual)
4. **Execution** - All-or-nothing apply with automatic rollback

## 📦 Four Physics Layers

### 1. Transaction Model (`src/transactions/`)

**What it does:**
- Wraps every filesystem operation in an immutable transaction
- Transactions flow through states: `created → proposed → approved → applied`
- Complete audit trail of all state transitions

**Why it matters:**
- AI cannot directly mutate—it can only propose
- Every change is tracked from proposal to application
- Rollback is possible at any point

**Example:**
```typescript
const store = new TransactionStore();

// Create transaction
const txn = store.create("txn-001", "ai-agent", [
  { type: "write", path: "src/foo.ts", payload: "console.log('hi')" }
]);

// State transitions
store.propose("txn-001");
store.approve("txn-001", "system", "automatic");
// Now ready to apply
```

### 2. Diff Engine (`src/diffs/`)

**What it does:**
- Calculates structured diffs between before/after states
- Makes diffs first-class queryable objects (not just strings)
- Provides summaries, filtering, JSON serialization

**Why it matters:**
- Approval requires visibility—you can't approve what you can't see
- Diffs are auditable (stored, compared, queried)
- Enables intelligent approval policies

**Example:**
```typescript
const engine = new DiffEngine();

const diff = engine.calculateDiff(
  "txn-001",
  { "src/old.ts": "old code" },
  { "src/old.ts": "new code", "src/new.ts": "added" }
);

// Query what changed
const mods = engine.getModifications(diff); // [1 file]
const additions = engine.getAdditions(diff); // [1 file]

// Human-readable summary
console.log(engine.summarize(diff));
// Diff for transaction txn-001:
//   Added: 1 files
//   Modified: 1 files
//   Deleted: 0 files
```

### 3. Approval Pipeline (`src/approvals/`)

**What it does:**
- Manages flow from proposed to approved state
- Built-in policies: `automatic`, `human-required`
- Extensible for custom policies

**Why it matters:**
- Approval is a runtime primitive, not an afterthought
- Policies can be automatic (for trusted agents) or manual (for risky changes)
- Every approval is timestamped and auditable

**Example:**
```typescript
const pipeline = new ApprovalPipeline();

// AI-agent changes: automatic approval
const decision1 = await pipeline.submit(
  "txn-001",
  "ai-agent",
  "automatic"
); // Approved immediately

// Unknown-source changes: requires manual approval
const decision2 = await pipeline.submit(
  "txn-002",
  "unknown",
  "automatic"
); // Returns null (pending manual review)

// Manual approval
pipeline.approveManually("txn-002", "alice", "Looks good!");
```

### 4. Executor (`src/execute/`)

**What it does:**
- Applies approved transactions to filesystem
- Implements all-or-nothing semantics (succeeds completely or rolls back completely)
- Maintains operation log (what succeeded, what failed, when)

**Why it matters:**
- Filesystem operations are inherently risky
- If one operation fails, everything is rolled back automatically
- Operation log provides recovery and audit trail

**Example:**
```typescript
const mockFS = {
  writeFile: async (path: string, content: string) => { /* ... */ },
  deleteFile: async (path: string) => { /* ... */ },
  // ... other operations
};

const executor = new Executor(mockFS);

// Apply approved transaction
const results = await executor.apply(approvedTxn);
// results: [{ operationIndex: 0, status: "success" }, ...]

// If any operation fails:
// - Previous operations are automatically rolled back
// - Results show which operations succeeded/failed
// - Operation log documents everything for recovery
```

## 🔗 Full Pipeline Example

```typescript
import {
  TransactionStore,
  DiffEngine,
  ApprovalPipeline,
  Executor,
} from "@rinawarp/rina-runtime";

// 1. Create transaction
const store = new TransactionStore();
const txn = store.create("txn-001", "ai-agent", [
  { type: "write", path: "src/new.ts", payload: "console.log('new')" },
  { type: "write", path: "src/old.ts", payload: "console.log('updated')" },
]);

// 2. Calculate diff (before applying)
const engine = new DiffEngine();
const diff = engine.calculateDiff("txn-001", before, after);
console.log(engine.summarize(diff)); // Human sees exactly what changed

// 3. Get approval
const pipeline = new ApprovalPipeline();
store.propose("txn-001");
const decision = await pipeline.submit("txn-001", "ai-agent", "automatic");

if (decision?.approved) {
  store.approve("txn-001", "system", "automatic");

  // 4. Execute
  const executor = new Executor(fileSystemContext);
  const results = await executor.apply(store.get("txn-001")!);

  if (results.every((r) => r.status === "success")) {
    store.markApplied("txn-001", results);
    console.log("✅ Transaction applied successfully");
  } else {
    console.log("❌ Transaction rolled back automatically");
  }
} else {
  console.log("⏳ Transaction requires manual approval");
}
```

## ✅ Guarantees

With this layer in place:

- ✅ **AI cannot directly mutate filesystem** - Every change goes through the pipeline
- ✅ **Every change is visible** - Diffs are queryable and auditable
- ✅ **Every change is approved** - Policies gate the approval flow
- ✅ **Execution is atomic** - All operations succeed or all rollback
- ✅ **Failure is recoverable** - Operation log tracks everything
- ✅ **System is auditable** - Every transaction has complete history

## 🚀 What Comes Next (Layer 3+)

This layer provides the foundation for:

- **MCP Integration** (Layer 3) - MCP servers become safe proposers (not trusted executors)
- **Observability** (Layer 4) - Metrics, tracing, alerts on transaction flow
- **Product Logic** (Layer 5) - Feature-specific workflows built on transaction model

## 🧪 Testing

```bash
pnpm test
```

Tests verify:
- Transaction state machine
- Diff calculation and querying
- Approval policy evaluation
- Execution and rollback
- Error handling and recovery

## 📚 Philosophy

This layer implements **Semantic Enforcement**:

- Layer 0+1 (completed) = Structural enforcement (versions, fields, workspace rules)
- Layer 2 (this) = Semantic enforcement (runtime safety, mutation boundaries, approval gating)
- Layer 3+ = Intelligent enforcement (MCP mediation, observability, policy reasoning)

The key insight: **Trust is verified, not assumed.** Every change is mediated, visible, and recoverable.

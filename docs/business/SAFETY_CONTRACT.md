# Safety Contract

This system enforces controlled file mutation via structured patching.

## Core Guarantees

### 1. No pre-approval mutation

- Files must not be modified before explicit approval.

### 2. Backup safety

- Every patch must create a backup before write.
- Backups must reflect exact pre-patch state.

### 3. Atomic patch application

- Partial writes are not permitted.
- Failure during write must not corrupt target file.

### 4. Structured diff validation

- Only valid, context-aware unified diffs may be applied.
- Wrong-context diffs must be rejected.

### 5. Verification gating

- All patches must pass verification command before acceptance.
- Failure triggers rollback behavior.

### 6. Failure containment

- Permission errors must not alter filesystem state.
- Missing files must fail safely.
- Interrupted operations must leave system consistent.

## Test Mapping

### test:safety

- Backup integrity
- Snapshot invariants
- Structured diff validation
- Pre-approval immutability

### test:failure

- Permission denial handling
- File disappearance during apply
- Crash mid-write recovery
- Invalid diff rejection
- Sequential patch isolation
- Verification failure rollback
- Partial artifact cleanup
- Backup uniqueness under rapid operations

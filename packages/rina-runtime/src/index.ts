/**
 * Rina Runtime Core - Transaction, diff, and approval engine
 *
 * Layer 2 of the RinaWarp infrastructure:
 * - Transaction model (atomic unit of change)
 * - Diff engine (make changes visible and auditable)
 * - Approval pipeline (gate between proposed and applied)
 * - Executor (safe all-or-nothing execution with automatic rollback)
 *
 * This layer ensures:
 * ✅ AI cannot directly mutate filesystem
 * ✅ Every change becomes a transaction
 * ✅ Diff becomes first-class object
 * ✅ Approval becomes a runtime primitive
 * ✅ Rollback becomes automatic capability
 */

export const SYSTEM_CONTRACT_PATH = 'rina-system-contract.md'

export interface SystemContractValidationHook {
  validateSystemContract(): boolean
}

export * from './approvals/index.js'
export * from './diffs/index.js'
export * from './errors/index.js'
export * from './memory/rinaMemoryStore.js'
export * from './stream/rinaEventStream.js'
export * from './core/RinaRuntime.js'
export * from './execute/index.js'
export * from './execution/sandbox.js'
export * from './transactions/index.js'
export * from './ipc/index.js'
export * from './execution/executionRecord.js'

// Namespace for organized access
export { approvals } from './approvals/index.js'
export { diffs } from './diffs/index.js'
export { execute } from './execute/index.js'
export { transactions } from './transactions/index.js'

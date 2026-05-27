/**
 * MCP → Transaction Bridge
 * This is the heart of Layer 3
 * MCP actions never execute directly - they become transactions
 */

import type { IntentEvent, IntentResolution, RinaAction, RinaIntent } from '@rinawarp/rina-core'
import type { MCPAction, MCPBridgeResponse, MCPMutationIntentPayload, MCPToTransaction } from '../schema/mcp-action.js'
import type { TransactionOperation } from '@rinawarp/rina-runtime'

/**
 * Bridge response types
 */
export interface BridgeExecutionResult {
  transactionId: string
  status: 'success' | 'rolled_back'
  results: Array<{
    operationIndex: number
    status: 'success' | 'failed' | 'rolled_back'
    error?: string
  }>
}

/**
 * Runtime interface that MCP Bridge uses
 * This is a simplified interface for the bridge
 */
export interface RinaRuntimeInterface {
  propose: (operations: TransactionOperation[]) => string
  diff: (transactionId: string) => Promise<unknown>
  approve: (id: string, by: string, policy: string) => void
  execute: (transactionId: string) => Promise<BridgeExecutionResult>
  getTransaction: (id: string) => unknown
}

/**
 * MCP to RinaRuntime Bridge
 * Translates MCP actions into transactions through the runtime
 */
export class MCPBridge {
  private runtime: RinaRuntimeInterface

  constructor(runtime: RinaRuntimeInterface) {
    this.runtime = runtime
  }

  /**
   * Handle an MCP action - converts it to a transaction
   * MCP never executes directly, only proposes
   */
  async handle(action: MCPAction): Promise<MCPBridgeResponse> {
    // Step 1: Convert MCP action to canonical Rina intent.
    const intent = this.convertToIntent(action)
    const intentEvent = this.intentCreatedEvent(intent)

    // Step 2: Wrap intent in canonical action semantics.
    const rinaAction = this.convertToAction(intent)

    // Step 3: Convert canonical intent to runtime transaction operations.
    const operations = this.convertToOperations(rinaAction.intent)

    if (operations.length === 0) {
      return {
        status: "approved",
        reason: "Intent does not request runtime mutation",
        intentId: intent.id,
        events: [intentEvent],
      }
    }

    // Step 4: Create transaction in runtime
    const transactionId = this.runtime.propose(operations)
    rinaAction.transactionId = transactionId

    // Step 5: Calculate diff
    const diff = await this.runtime.diff(transactionId)

    // Step 6: Evaluate approval
    const decision = await this.evaluateApproval(rinaAction, diff)

    if (decision.allowed) {
      // Step 7: Execute if approved
      await this.runtime.execute(transactionId)
      return {
        status: "executed",
        intentId: intent.id,
        transactionId,
        events: [intentEvent],
      }
    }

    return {
      status: "blocked",
      reason: decision.reason,
      intentId: intent.id,
      transactionId,
      events: [intentEvent],
    }
  }

  /**
   * Convert MCP action to canonical Rina intent.
   */
  public convertToIntent(action: MCPAction): RinaIntent {
    return {
      id: action.id,
      source: 'mcp',
      kind: this.intentKindFor(action),
      target: action.target,
      payload: action.operation === 'write' || action.operation === 'patch'
        ? { operation: 'write', value: action.payload } satisfies MCPMutationIntentPayload
        : action.payload,
      createdAt: action.timestamp,
    }
  }

  public resolveIntent(intent: RinaIntent, transactionId?: string): IntentResolution {
    return {
      intentId: intent.id,
      requiresTransaction: intent.kind === 'mutate',
      transactionId,
    }
  }

  public intentCreatedEvent(intent: RinaIntent): IntentEvent {
    return {
      type: 'intent.created',
      intentId: intent.id,
      source: intent.source,
      kind: intent.kind,
      timestamp: intent.createdAt,
    }
  }

  /**
   * Convert canonical intent to canonical action semantics.
   */
  public convertToAction(intent: RinaIntent): RinaAction {
    const policyLevel = intent.kind === 'read' || intent.kind === 'analyze'
      ? 'safe'
      : intent.kind === 'mutate'
        ? 'sensitive'
        : 'moderate'

    return {
      intent,
      requiresApproval: policyLevel !== 'safe',
      policyLevel,
    }
  }

  /**
   * Convert canonical intent to transaction operations.
   */
  private convertToOperations(intent: RinaIntent): TransactionOperation[] {
    if (intent.kind !== 'mutate') {
      return []
    }

    const payload = intent.payload as MCPMutationIntentPayload | undefined
    const op: TransactionOperation = {
      type: payload?.operation || 'write',
      path: intent.target,
      payload: payload?.value as string,
      timestamp: intent.createdAt,
    }
    return [op]
  }

  private intentKindFor(action: MCPAction): RinaIntent['kind'] {
    if (action.operation === 'read') return 'read'
    if (action.operation === 'search') return 'analyze'
    return 'mutate'
  }

  /**
   * Evaluate approval based on MCP action classification
   */
  private async evaluateApproval(
    action: RinaAction,
    _diff: unknown
  ): Promise<{ allowed: boolean; reason: string }> {
    // Classification-based approval logic
    if (!action.requiresApproval) {
      return { allowed: true, reason: `${action.policyLevel} intent - auto-approved` }
    }

    if (action.intent.source === 'mcp') {
      return { allowed: false, reason: 'MCP mutation requires human approval' }
    }

    // Default: require approval
    return { allowed: false, reason: 'Operation requires approval' }
  }

  /**
   * Check if MCP can perform this operation (security boundary)
   */
  canPerform(action: MCPAction): boolean {
    // Forbidden: direct filesystem write, shell execution, network calls, runtime bypass
    // Allowed: action proposal, transaction ingestion, diff generation

    // MCP is never allowed to directly write - only propose
    if (action.operation === 'write' && action.source === 'filesystem') {
      return false // Must go through transaction
    }

    return true
  }
}

/**
 * Simplified adapter for testing - directly uses RinaRuntime
 */
export class MCPBridgeTestAdapter {
  constructor(
    private transactionStore: any,
    private executor: any
  ) {}

  async handle(action: MCPAction): Promise<MCPBridgeResponse> {
    const intent: RinaIntent = {
      id: action.id,
      source: 'mcp',
      kind: action.operation === 'read' ? 'read' : action.operation === 'search' ? 'analyze' : 'mutate',
      target: action.target,
      payload: action.operation === 'write' || action.operation === 'patch'
        ? { operation: 'write', value: action.payload }
        : action.payload,
      createdAt: action.timestamp,
    }

    if (intent.kind !== 'mutate') {
      return {
        status: "approved",
        reason: "Intent does not request runtime mutation",
        intentId: intent.id,
        events: [{
          type: 'intent.created',
          intentId: intent.id,
          source: intent.source,
          kind: intent.kind,
          timestamp: intent.createdAt,
        }],
      }
    }

    // Create transaction
    const txnId = `mcp-${action.id}`
    const payload = intent.payload as MCPMutationIntentPayload | undefined
    const ops: TransactionOperation[] = [{
      type: payload?.operation || 'write',
      path: intent.target,
      payload: payload?.value as string,
      timestamp: intent.createdAt,
    }]

    const txn = this.transactionStore.create(txnId, 'mcp-adapter', ops)
    this.transactionStore.propose(txnId)

    // Evaluate approval
    if (action.operation === 'read') {
      this.transactionStore.approve(txnId, 'system', 'automatic')
    } else {
      // Write operations require human approval in test
      return {
        status: "blocked",
        reason: "Write operation requires approval",
        intentId: intent.id,
        transactionId: txnId,
        events: [{
          type: 'intent.created',
          intentId: intent.id,
          source: intent.source,
          kind: intent.kind,
          timestamp: intent.createdAt,
        }],
      }
    }

    // Execute
    const results = await this.executor.apply(txn)

    return {
      status: "executed",
      intentId: intent.id,
      transactionId: txnId,
      events: [{
        type: 'intent.created',
        intentId: intent.id,
        source: intent.source,
        kind: intent.kind,
        timestamp: intent.createdAt,
      }],
    }
  }
}

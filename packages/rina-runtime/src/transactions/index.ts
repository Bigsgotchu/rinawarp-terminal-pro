/**
 * Transaction model - atomic unit of change
 * Every filesystem operation is wrapped in a transaction
 * Transactions are immutable once created and go through states:
 * CREATED -> PROPOSED -> APPROVED -> APPLIED (or ROLLED_BACK at any point)
 */

export type TransactionState = 'created' | 'proposed' | 'approved' | 'applied' | 'rolled_back'

export interface TransactionOperation {
  /** Type of operation: write, delete, rename, mkdir */
  type: 'write' | 'delete' | 'rename' | 'mkdir' | 'rmdir'
  /** File or directory path */
  path: string
  /** For write: the new content. For rename: new path. For others: null */
  payload?: string | null
  /** Timestamp when operation was created */
  timestamp: number
}

export interface Transaction {
  /** Unique transaction ID */
  id: string
  /** Who proposed this transaction */
  proposer: string
  /** List of operations in this transaction */
  operations: TransactionOperation[]
  /** Current state of the transaction */
  state: TransactionState
  /** When transaction was created */
  createdAt: number
  /** When transaction was last modified */
  updatedAt: number
  /** Approval info (if approved) */
  approval?: {
    approvedBy: string
    approvedAt: number
    policy: string
  }
  /** Metadata about execution (if applied) */
  execution?: {
    appliedAt: number
    results: Array<{
      operationIndex: number
      status: 'success' | 'failed' | 'rolled_back'
      error?: string
    }>
  }
}

/**
 * In-memory transaction store
 * Provides CRUD operations and state transitions
 * All operations are atomic (no partial updates)
 */
export class TransactionStore {
  private transactions = new Map<string, Transaction>()
  private operationLog: Array<{
    txnId: string
    action: string
    timestamp: number
    previousState: TransactionState
    newState: TransactionState
  }> = []

  /**
   * Create and store a new transaction
   */
  public create(id: string, proposer: string, operations: TransactionOperation[]): Transaction {
    if (this.transactions.has(id)) {
      throw new Error(`Transaction ${id} already exists`)
    }

    const txn: Transaction = {
      id,
      proposer,
      operations,
      state: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.transactions.set(id, txn)
    this.log(id, 'create', 'created', 'created')
    return txn
  }

  /**
   * Get transaction by ID
   */
  public get(id: string): Transaction | undefined {
    return this.transactions.get(id)
  }

  /**
   * Get all transactions in a given state
   */
  public getByState(state: TransactionState): Transaction[] {
    return Array.from(this.transactions.values()).filter((t) => t.state === state)
  }

  /**
   * Transition transaction to PROPOSED state
   */
  public propose(id: string): Transaction {
    const txn = this.get(id)
    if (!txn) throw new Error(`Transaction ${id} not found`)
    if (txn.state !== 'created') {
      throw new Error(`Cannot propose transaction in state '${txn.state}'`)
    }

    const updated = {
      ...txn,
      state: 'proposed' as TransactionState,
      updatedAt: Date.now(),
    }

    this.transactions.set(id, updated)
    this.log(id, 'propose', txn.state, 'proposed')
    return updated
  }

  /**
   * Transition transaction to APPROVED state
   */
  public approve(id: string, approvedBy: string, policy: string): Transaction {
    const txn = this.get(id)
    if (!txn) throw new Error(`Transaction ${id} not found`)
    if (txn.state !== 'proposed') {
      throw new Error(`Cannot approve transaction in state '${txn.state}'`)
    }

    const updated = {
      ...txn,
      state: 'approved' as TransactionState,
      updatedAt: Date.now(),
      approval: {
        approvedBy,
        approvedAt: Date.now(),
        policy,
      },
    }

    this.transactions.set(id, updated)
    this.log(id, 'approve', txn.state, 'approved')
    return updated
  }

  /**
   * Transition transaction to APPLIED state
   */
  public markApplied(
    id: string,
    results: Array<{
      operationIndex: number
      status: 'success' | 'failed' | 'rolled_back'
      error?: string
    }>
  ): Transaction {
    const txn = this.get(id)
    if (!txn) throw new Error(`Transaction ${id} not found`)
    if (txn.state !== 'approved') {
      throw new Error(`Cannot mark transaction as applied in state '${txn.state}'`)
    }

    const updated = {
      ...txn,
      state: 'applied' as TransactionState,
      updatedAt: Date.now(),
      execution: {
        appliedAt: Date.now(),
        results,
      },
    }

    this.transactions.set(id, updated)
    this.log(id, 'markApplied', txn.state, 'applied')
    return updated
  }

  /**
   * Transition transaction to ROLLED_BACK state
   */
  public markRolledBack(id: string, reason: string): Transaction {
    const txn = this.get(id)
    if (!txn) throw new Error(`Transaction ${id} not found`)

    const updated = {
      ...txn,
      state: 'rolled_back' as TransactionState,
      updatedAt: Date.now(),
      execution: {
        ...(txn.execution || { appliedAt: 0, results: [] }),
        results:
          txn.execution?.results.map((r) => ({
            ...r,
            status: 'rolled_back' as const,
          })) || [],
      },
    }

    this.transactions.set(id, updated)
    this.log(id, 'markRolledBack', txn.state, 'rolled_back')
    return updated
  }

  /**
   * Get audit log of all state transitions
   */
  public getAuditLog() {
    return [...this.operationLog]
  }

  /**
   * Get audit log for a specific transaction
   */
  public getTransactionAuditLog(txnId: string) {
    return this.operationLog.filter((entry) => entry.txnId === txnId)
  }

  /**
   * Clear all data (for testing)
   */
  public clear() {
    this.transactions.clear()
    this.operationLog = []
  }

  private log(txnId: string, action: string, previousState: TransactionState, newState: TransactionState) {
    this.operationLog.push({
      txnId,
      action,
      timestamp: Date.now(),
      previousState,
      newState,
    })
  }
}

/**
 * Namespace export for index
 */
export const transactions = {
  create: (id: string, proposer: string, operations: TransactionOperation[]) =>
    ({ id, proposer, operations }) as Pick<Transaction, 'id' | 'proposer' | 'operations'>,
  TransactionStore,
}

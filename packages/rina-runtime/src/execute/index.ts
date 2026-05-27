/**
 * Executor - applies approved transactions
 * Implements all-or-nothing execution with automatic rollback on failure
 */

import type { Transaction, TransactionOperation } from '../transactions/index.js'

export interface ExecutionResult {
  operationIndex: number
  operation: TransactionOperation
  status: 'success' | 'failed' | 'rolled_back'
  error?: string
  executedAt?: number
}

export interface ExecutorContext {
  // Filesystem-like interface (can be mocked for testing)
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  mkdir: (path: string) => Promise<void>
  rmdir: (path: string) => Promise<void>
  readFile: (path: string) => Promise<string>
}

export interface TransactionalExecutorContext extends ExecutorContext {
  beginTransaction: (transactionId: string) => void | Promise<void>
  commitTransaction: (transactionId: string) => void | Promise<void>
  rollbackTransaction: (transactionId: string) => Promise<void>
}

function supportsTransactionSnapshots(context: ExecutorContext): context is TransactionalExecutorContext {
  const transactional = context as Partial<TransactionalExecutorContext>
  return typeof transactional.beginTransaction === 'function'
    && typeof transactional.commitTransaction === 'function'
    && typeof transactional.rollbackTransaction === 'function'
}

/**
 * Execution log entry
 */
export interface OperationLogEntry {
  transactionId: string
  operationIndex: number
  operation: TransactionOperation
  status: 'success' | 'failed' | 'rolled_back'
  error?: string
  executedAt: number
}

/**
 * Transaction executor - applies approved transactions atomically
 * If any operation fails, entire transaction is rolled back
 */
export class Executor {
  private operationLog: OperationLogEntry[] = []
  private appliedTransactions = new Map<string, { results: ExecutionResult[]; rolledBack: boolean }>()

  constructor(private context: ExecutorContext) {}

  /**
   * Apply an approved transaction
   * Either succeeds completely or rolls back completely
   */
  public async apply(transaction: Transaction): Promise<ExecutionResult[]> {
    if (transaction.state !== 'approved') {
      throw new Error(`Cannot apply transaction in state '${transaction.state}' (must be 'approved')`)
    }

    const results: ExecutionResult[] = []
    let lastSuccessIndex = -1
    if (supportsTransactionSnapshots(this.context)) {
      await this.context.beginTransaction(transaction.id)
    }

    try {
      // Execute all operations
      for (let i = 0; i < transaction.operations.length; i++) {
        const operation = transaction.operations[i]
        try {
          await this.executeOperation(operation)
          results.push({
            operationIndex: i,
            operation,
            status: 'success',
            executedAt: Date.now(),
          })
          lastSuccessIndex = i
        } catch (error) {
          // Operation failed - rollback what we've done so far
          results.push({
            operationIndex: i,
            operation,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            executedAt: Date.now(),
          })

          // Rollback previous operations
          if (supportsTransactionSnapshots(this.context)) {
            await this.context.rollbackTransaction(transaction.id)
          } else {
            await this.rollback(transaction.id, transaction.operations.slice(0, lastSuccessIndex + 1))
          }

          // Mark rollback in results
          for (let j = 0; j <= lastSuccessIndex; j++) {
            const existingResult = results.find((r) => r.operationIndex === j)
            if (existingResult) {
              existingResult.status = 'rolled_back'
            }
          }

          throw new Error(`Transaction ${transaction.id} failed at operation ${i}: ${error}`)
        }
      }

      if (supportsTransactionSnapshots(this.context)) {
        await this.context.commitTransaction(transaction.id)
      }

      // All operations succeeded - record in log
      for (const result of results) {
        this.operationLog.push({
          transactionId: transaction.id,
          operationIndex: result.operationIndex,
          operation: result.operation,
          status: result.status,
          executedAt: result.executedAt || Date.now(),
        })
      }

      this.appliedTransactions.set(transaction.id, { results, rolledBack: false })
      return results
    } catch (error) {
      this.appliedTransactions.set(transaction.id, { results, rolledBack: true })
      throw error
    }
  }

  /**
   * Manually rollback an applied transaction
   */
  public async rollback(transactionId: string, operations: TransactionOperation[]): Promise<void> {
    if (supportsTransactionSnapshots(this.context)) {
      await this.context.rollbackTransaction(transactionId)
      return
    }
    // Execute operations in reverse order
    for (let i = operations.length - 1; i >= 0; i--) {
      const operation = operations[i]
      try {
        // Create inverse operation
        const inverseOp = this.inverseOperation(operation)
        await this.executeOperation(inverseOp)
      } catch (error) {
        // Log but continue - try to rollback everything
        console.error(`Failed to rollback operation ${i} in transaction ${transactionId}:`, error)
      }
    }
  }

  /**
   * Get execution results for transaction
   */
  public getResults(transactionId: string): ExecutionResult[] | undefined {
    const entry = this.appliedTransactions.get(transactionId)
    return entry?.results
  }

  /**
   * Get operation log
   */
  public getOperationLog(): OperationLogEntry[] {
    return [...this.operationLog]
  }

  /**
   * Get operation log for specific transaction
   */
  public getTransactionLog(transactionId: string): OperationLogEntry[] {
    return this.operationLog.filter((entry) => entry.transactionId === transactionId)
  }

  /**
   * Clear logs (for testing)
   */
  public clear() {
    this.operationLog = []
    this.appliedTransactions.clear()
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: TransactionOperation): Promise<void> {
    switch (operation.type) {
      case 'write':
        if (!operation.payload) {
          throw new Error(`Write operation for ${operation.path} has no content`)
        }
        await this.context.writeFile(operation.path, operation.payload)
        break

      case 'delete':
        await this.context.deleteFile(operation.path)
        break

      case 'rename':
        if (!operation.payload) {
          throw new Error(`Rename operation for ${operation.path} has no target path`)
        }
        await this.context.renameFile(operation.path, operation.payload)
        break

      case 'mkdir':
        await this.context.mkdir(operation.path)
        break

      case 'rmdir':
        await this.context.rmdir(operation.path)
        break

      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`)
    }
  }

  /**
   * Create inverse operation for rollback
   */
  private inverseOperation(operation: TransactionOperation): TransactionOperation {
    switch (operation.type) {
      case 'write':
        // Inverse of write is delete
        return {
          type: 'delete',
          path: operation.path,
          timestamp: Date.now(),
        }

      case 'delete':
        // We can't perfectly inverse a delete without stored content
        // In a real system, we'd have stored the original content
        throw new Error('Cannot rollback delete operation - original content not stored in transaction')

      case 'rename':
        // Inverse of rename is rename back
        return {
          type: 'rename',
          path: operation.payload || '',
          payload: operation.path,
          timestamp: Date.now(),
        }

      case 'mkdir':
        // Inverse of mkdir is rmdir
        return {
          type: 'rmdir',
          path: operation.path,
          timestamp: Date.now(),
        }

      case 'rmdir':
        // We can't perfectly inverse rmdir without stored content
        throw new Error('Cannot rollback rmdir operation - directory contents not stored in transaction')

      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`)
    }
  }
}

export const execute = {
  Executor,
}

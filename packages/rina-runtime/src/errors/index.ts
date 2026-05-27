/**
 * RinaRuntime error types
 * All errors that can occur in the transaction/diff/approval/execute pipeline
 */

export class RinaRuntimeError extends Error {
  public readonly code: string
  public readonly context: Record<string, unknown>

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message)
    this.name = 'RinaRuntimeError'
    this.code = code
    this.context = context
    Object.setPrototypeOf(this, RinaRuntimeError.prototype)
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    }
  }
}

// Transaction errors
export class TransactionNotFoundError extends RinaRuntimeError {
  constructor(txnId: string) {
    super('TXN_NOT_FOUND', `Transaction not found: ${txnId}`, { txnId })
    this.name = 'TransactionNotFoundError'
    Object.setPrototypeOf(this, TransactionNotFoundError.prototype)
  }
}

export class InvalidTransactionStateError extends RinaRuntimeError {
  constructor(txnId: string, currentState: string, expectedStates: string[]) {
    super(
      'INVALID_TXN_STATE',
      `Transaction ${txnId} in state '${currentState}', expected one of: ${expectedStates.join(', ')}`,
      { txnId, currentState, expectedStates }
    )
    this.name = 'InvalidTransactionStateError'
    Object.setPrototypeOf(this, InvalidTransactionStateError.prototype)
  }
}

// Diff errors
export class DiffCalculationError extends RinaRuntimeError {
  constructor(message: string, cause?: Error) {
    super('DIFF_CALCULATION_FAILED', message, {
      cause: cause?.message,
    })
    this.name = 'DiffCalculationError'
    Object.setPrototypeOf(this, DiffCalculationError.prototype)
  }
}

// Approval errors
export class ApprovalPolicyError extends RinaRuntimeError {
  constructor(message: string, policy: string) {
    super('APPROVAL_POLICY_ERROR', message, { policy })
    this.name = 'ApprovalPolicyError'
    Object.setPrototypeOf(this, ApprovalPolicyError.prototype)
  }
}

export class ApprovalRequiredError extends RinaRuntimeError {
  constructor(txnId: string) {
    super('APPROVAL_REQUIRED', `Transaction ${txnId} requires approval but none provided`, {
      txnId,
    })
    this.name = 'ApprovalRequiredError'
    Object.setPrototypeOf(this, ApprovalRequiredError.prototype)
  }
}

// Execution errors
export class ExecutionError extends RinaRuntimeError {
  constructor(txnId: string, operationIndex: number, message: string, cause?: Error) {
    super('EXECUTION_FAILED', `Transaction ${txnId}: operation ${operationIndex} failed: ${message}`, {
      txnId,
      operationIndex,
      cause: cause?.message,
    })
    this.name = 'ExecutionError'
    Object.setPrototypeOf(this, ExecutionError.prototype)
  }
}

export class RollbackError extends RinaRuntimeError {
  constructor(txnId: string, message: string, failedOperations: number[]) {
    super('ROLLBACK_FAILED', `Rollback for ${txnId} failed: ${message}`, {
      txnId,
      failedOperations,
    })
    this.name = 'RollbackError'
    Object.setPrototypeOf(this, RollbackError.prototype)
  }
}

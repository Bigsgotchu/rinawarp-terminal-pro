/**
 * Approval pipeline - gate between PROPOSED and APPLIED states
 * Policies determine what can proceed without human intervention
 */

export type ApprovalPolicy = 'automatic' | 'human-required' | 'policy-driven'

export interface ApprovalRequest {
  /** Transaction ID to approve */
  transactionId: string
  /** What policy to use */
  policy: ApprovalPolicy
  /** Human approver (if needed) */
  approver?: string
  /** Metadata for policy evaluation */
  metadata?: Record<string, unknown>
}

export interface ApprovalDecision {
  /** Whether approved */
  approved: boolean
  /** Who made this decision */
  decidedBy: string
  /** When decision was made */
  decidedAt: number
  /** Reason for decision */
  reason: string
  /** Policy that was applied */
  policy: ApprovalPolicy
}

/**
 * Policy evaluator - determines if transaction should be auto-approved
 */
export interface ApprovalPolicyEvaluator {
  name: ApprovalPolicy
  evaluate(
    transactionId: string,
    proposer: string,
    metadata?: Record<string, unknown>
  ): Promise<{ approved: boolean; reason: string }>
}

/**
 * Built-in automatic policy
 * Approves all transactions from trusted proposers
 */
export const automaticPolicy: ApprovalPolicyEvaluator = {
  name: 'automatic',
  async evaluate(transactionId: string, proposer: string) {
    // Only trusted proposers can use automatic approval
    const trustedProposers = ['system', 'ai-agent', 'ci']
    if (trustedProposers.includes(proposer)) {
      return {
        approved: true,
        reason: `Automatic approval for trusted proposer: ${proposer}`,
      }
    }
    return {
      approved: false,
      reason: `Proposer '${proposer}' not in automatic approval list`,
    }
  },
}

/**
 * Built-in human-required policy
 * Never approves automatically - always requires explicit human decision
 */
export const humanRequiredPolicy: ApprovalPolicyEvaluator = {
  name: 'human-required',
  async evaluate(transactionId: string, proposer: string) {
    return {
      approved: false,
      reason: 'Human approval required by policy',
    }
  },
}

/**
 * Approval pipeline - manages the approval flow
 */
export class ApprovalPipeline {
  private decisions = new Map<string, ApprovalDecision>()
  private policies: Map<ApprovalPolicy, ApprovalPolicyEvaluator>

  constructor(customPolicies?: ApprovalPolicyEvaluator[]) {
    this.policies = new Map()
    this.policies.set('automatic', automaticPolicy)
    this.policies.set('human-required', humanRequiredPolicy)

    if (customPolicies) {
      for (const policy of customPolicies) {
        this.policies.set(policy.name, policy)
      }
    }
  }

  /**
   * Submit a transaction for approval
   * Returns decision immediately if policy auto-approves, otherwise returns pending
   */
  public async submit(
    transactionId: string,
    proposer: string,
    policy: ApprovalPolicy,
    metadata?: Record<string, unknown>
  ): Promise<ApprovalDecision | null> {
    const evaluator = this.policies.get(policy)
    if (!evaluator) {
      throw new Error(`Unknown approval policy: ${policy}`)
    }

    const result = await evaluator.evaluate(transactionId, proposer, metadata)

    if (result.approved) {
      const decision: ApprovalDecision = {
        approved: true,
        decidedBy: 'system',
        decidedAt: Date.now(),
        reason: result.reason,
        policy,
      }
      this.decisions.set(transactionId, decision)
      return decision
    }

    // Not approved by policy - requires manual intervention
    return null
  }

  /**
   * Manually approve a transaction (human decision)
   */
  public approveManually(
    transactionId: string,
    approver: string,
    reason: string = 'Manual approval'
  ): ApprovalDecision {
    const decision: ApprovalDecision = {
      approved: true,
      decidedBy: approver,
      decidedAt: Date.now(),
      reason,
      policy: 'human-required',
    }
    this.decisions.set(transactionId, decision)
    return decision
  }

  /**
   * Manually reject a transaction (human decision)
   */
  public rejectManually(
    transactionId: string,
    rejector: string,
    reason: string = 'Manual rejection'
  ): ApprovalDecision {
    const decision: ApprovalDecision = {
      approved: false,
      decidedBy: rejector,
      decidedAt: Date.now(),
      reason,
      policy: 'human-required',
    }
    this.decisions.set(transactionId, decision)
    return decision
  }

  /**
   * Check if transaction is approved
   */
  public isApproved(transactionId: string): boolean {
    const decision = this.decisions.get(transactionId)
    return decision?.approved ?? false
  }

  /**
   * Get approval decision for transaction
   */
  public getDecision(transactionId: string): ApprovalDecision | undefined {
    return this.decisions.get(transactionId)
  }

  /**
   * Get all pending approvals (from human-required policy)
   */
  public getPending(): string[] {
    // In a real system, this would query a database
    // For now, we track nothing - system is stateless
    return []
  }

  /**
   * Register custom policy
   */
  public registerPolicy(policy: ApprovalPolicyEvaluator) {
    this.policies.set(policy.name, policy)
  }

  /**
   * Clear all decisions (for testing)
   */
  public clear() {
    this.decisions.clear()
  }
}

export const approvals = {
  ApprovalPipeline,
  automaticPolicy,
  humanRequiredPolicy,
}

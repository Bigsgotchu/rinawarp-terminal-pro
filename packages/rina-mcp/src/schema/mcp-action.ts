/**
 * MCP Action Model - Everything MCP produces becomes structured intent
 * MCP never outputs "results", only "actions"
 * Even reads become actions for observability, auditability, reproducibility, diffability
 */

import type { RinaEvent, RinaIntent, RinaMutationOperation } from '@rinawarp/rina-core'

export type MCPActionSource = "filesystem" | "git" | "github" | "unknown"

export type MCPActionOperation = "read" | "write" | "patch" | "search"

export type MCPMutationIntentPayload = {
  operation: Extract<RinaMutationOperation, 'write'>
  value?: unknown
}

export interface MCPAction {
  /** Unique action ID */
  id: string
  /** Source system that generated this action */
  source: MCPActionSource
  /** Type of operation being requested */
  operation: MCPActionOperation
  /** Target path or identifier */
  target: string
  /** Operation-specific payload */
  payload?: unknown
  /** When action was created */
  timestamp: number
}

export type MCPRinaIntent = RinaIntent & {
  source: "mcp"
}

/**
 * MCP to Transaction Translation Contract
 * This is the canonical ingestion format that prevents chaos
 */
export interface MCPToTransaction {
  action: MCPAction
  /** Context for the action */
  context?: {
    repoId: string
    userId: string
    sessionId?: string
  }
}

/**
 * MCP Bridge Response
 * MCP actions never return execution results, only status
 */
export interface MCPBridgeResponse {
  status: "pending" | "approved" | "blocked" | "executed"
  reason?: string
  intentId?: string
  transactionId?: string
  events?: RinaEvent[]
}

/**
 * Security Boundary Rules
 * These are enforced everywhere to prevent MCP chaos
 */
export interface MCPSecurityPolicy {
  /** Forbidden operations that MCP can never perform */
  forbidden: {
    directFilesystemWrite: boolean
    shellExecution: boolean
    networkCallsOutsideAdapter: boolean
    runtimeBypass: boolean
  }
  /** Allowed operations that MCP can propose */
  allowed: {
    actionProposal: boolean
    transactionIngestion: boolean
    diffGeneration: boolean
  }
}

/**
 * Built-in security policy - MCP is never trusted, always mediated
 */
export const MCP_SECURITY_POLICY: MCPSecurityPolicy = {
  forbidden: {
    directFilesystemWrite: true,
    shellExecution: true,
    networkCallsOutsideAdapter: true,
    runtimeBypass: true,
  },
  allowed: {
    actionProposal: true,
    transactionIngestion: true,
    diffGeneration: true,
  },
}

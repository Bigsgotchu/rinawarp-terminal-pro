/**
 * Rina MCP Package - Translation and Containment Layer
 * 
 * Core principle: MCP is never allowed to execute.
 * MCP is only allowed to propose effects into RinaRuntime.
 * 
 * Architecture:
 * MCP → Capability Provider (unsafe world)
 *      ↓
 *  Rina MCP Adapter (translation layer)
 *      ↓
 *  RinaRuntime (truth + governance)
 *      ↓
 *  Executor (safe mutation)
 */

// Schema contracts
export * from './schema/index.js'

// Adapters for different MCP sources
export * from './adapters/index.js'

// Bridge between MCP and RinaRuntime
export * from './bridge/index.js'

// Main integration point
export { MCPBridge, MCPBridgeTestAdapter } from './bridge/mcp-to-transaction.js'

// Key types for imports
export type {
  MCPAction,
  MCPActionSource,
  MCPActionOperation,
  MCPToTransaction,
  MCPBridgeResponse,
  MCPSecurityPolicy
} from './schema/mcp-action.js'
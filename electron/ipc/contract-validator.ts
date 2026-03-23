/**
 * IPC Contract Validation Layer
 * 
 * Ensures type safety and validates all IPC communication between
 * main process and renderer. Catches contract violations at runtime.
 * 
 * Features:
 * - Request/response validation
 * - Type checking
 * - Schema enforcement
 * - Audit logging
 * - Contract violation reporting
 */

import { IPC_CHANNELS, IPCRequest, IPCResponse } from '../shared/contracts';

interface ContractDefinition {
  channel: string;
  requestSchema?: any;
  responseSchema?: any;
  handler: string;
  description: string;
}

/**
 * IPC Contract Registry
 * 
 * All IPC channels must be registered here with their contracts
 */
export const IPC_CONTRACTS: Record<string, ContractDefinition> = {
  // Run Management
  [IPC_CHANNELS.RUN_CREATE]: {
    channel: IPC_CHANNELS.RUN_CREATE,
    requestSchema: {
      prompt: 'string',
      mode: ['local', 'remote'],
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run
    },
    handler: 'orchestrator.createRun',
    description: 'Create a new agent run',
  },
  
  [IPC_CHANNELS.RUN_GET]: {
    channel: IPC_CHANNELS.RUN_GET,
    requestSchema: {
      id: 'string',
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run | null
    },
    handler: 'orchestrator.getRun',
    description: 'Get run by ID',
  },
  
  [IPC_CHANNELS.RUN_LIST]: {
    channel: IPC_CHANNELS.RUN_LIST,
    requestSchema: {},
    responseSchema: {
      success: 'boolean',
      data: 'array', // Run[]
    },
    handler: 'orchestrator.listRuns',
    description: 'List all runs',
  },
  
  [IPC_CHANNELS.RUN_CANCEL]: {
    channel: IPC_CHANNELS.RUN_CANCEL,
    requestSchema: {
      id: 'string',
    },
    responseSchema: {
      success: 'boolean',
      data: 'boolean',
    },
    handler: 'orchestrator.cancelRun',
    description: 'Cancel a running task',
  },
  
  [IPC_CHANNELS.RUN_RECOVER]: {
    channel: IPC_CHANNELS.RUN_RECOVER,
    requestSchema: {
      id: 'string',
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run
    },
    handler: 'orchestrator.recoverRun',
    description: 'Recover a failed run',
  },
  
  // Agent Operations
  [IPC_CHANNELS.AGENT_STATUS]: {
    channel: IPC_CHANNELS.AGENT_STATUS,
    requestSchema: {},
    responseSchema: {
      success: 'boolean',
      data: 'object', // AgentStatus
    },
    handler: 'orchestrator.getAgentStatus',
    description: 'Get agent status',
  },
  
  [IPC_CHANNELS.AGENT_EXECUTE]: {
    channel: IPC_CHANNELS.AGENT_EXECUTE,
    requestSchema: {
      task: 'string',
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run
    },
    handler: 'orchestrator.createRun',
    description: 'Execute agent task',
  },
  
  [IPC_CHANNELS.AGENT_DIAGNOSTIC]: {
    channel: IPC_CHANNELS.AGENT_DIAGNOSTIC,
    requestSchema: {},
    responseSchema: {
      success: 'boolean',
      data: 'object',
    },
    handler: 'orchestrator.diagnostic',
    description: 'Get diagnostic information',
  },
  
  // Receipt Operations
  [IPC_CHANNELS.RECEIPT_GET]: {
    channel: IPC_CHANNELS.RECEIPT_GET,
    requestSchema: {
      runId: 'string',
    },
    responseSchema: {
      success: 'boolean',
      data: 'array', // ExecutionReceipt[]
    },
    handler: 'dataStore.getReceipts',
    description: 'Get receipts for a run',
  },
  
  // Build/Test/Deploy
  [IPC_CHANNELS.BUILD_START]: {
    channel: IPC_CHANNELS.BUILD_START,
    requestSchema: {
      config: 'object',
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run
    },
    handler: 'orchestrator.createRun',
    description: 'Start build process',
  },
  
  [IPC_CHANNELS.TEST_START]: {
    channel: IPC_CHANNELS.TEST_START,
    requestSchema: {
      config: 'object',
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run
    },
    handler: 'orchestrator.createRun',
    description: 'Start test process',
  },
  
  [IPC_CHANNELS.DEPLOY_START]: {
    channel: IPC_CHANNELS.DEPLOY_START,
    requestSchema: {
      config: 'object',
    },
    responseSchema: {
      success: 'boolean',
      data: 'object', // Run
    },
    handler: 'orchestrator.createRun',
    description: 'Start deployment',
  },
  
  // Update Operations
  [IPC_CHANNELS.UPDATE_CHECK]: {
    channel: IPC_CHANNELS.UPDATE_CHECK,
    requestSchema: {},
    responseSchema: {
      success: 'boolean',
      data: 'object',
    },
    handler: 'autoUpdater.checkForUpdates',
    description: 'Check for app updates',
  },
  
  [IPC_CHANNELS.UPDATE_DOWNLOAD]: {
    channel: IPC_CHANNELS.UPDATE_DOWNLOAD,
    requestSchema: {},
    responseSchema: {
      success: 'boolean',
    },
    handler: 'autoUpdater.downloadUpdate',
    description: 'Download app update',
  },
  
  [IPC_CHANNELS.UPDATE_INSTALL]: {
    channel: IPC_CHANNELS.UPDATE_INSTALL,
    requestSchema: {},
    responseSchema: {
      success: 'boolean',
    },
    handler: 'autoUpdater.quitAndInstall',
    description: 'Install app update',
  },
};

/**
 * Contract Validator
 */
export class ContractValidator {
  private violations: Array<{
    channel: string;
    type: 'request' | 'response';
    error: string;
    timestamp: string;
  }> = [];

  /**
   * Validate IPC request against contract
   */
  validateRequest(channel: string, data: any): { valid: boolean; errors: string[] } {
    const contract = IPC_CONTRACTS[channel];
    
    if (!contract) {
      const error = `No contract defined for channel: ${channel}`;
      this.recordViolation(channel, 'request', error);
      return { valid: false, errors: [error] };
    }

    const errors: string[] = [];
    
    // Validate request schema
    if (contract.requestSchema) {
      for (const [key, type] of Object.entries(contract.requestSchema)) {
        if (Array.isArray(type)) {
          // Enum validation
          if (!type.includes(data[key])) {
            errors.push(`${key} must be one of: ${type.join(', ')}`);
          }
        } else if (typeof type === 'string') {
          // Type validation
          const actualType = typeof data[key];
          if (type === 'array' && !Array.isArray(data[key])) {
            errors.push(`${key} must be an array`);
          } else if (type !== 'array' && actualType !== type && data[key] !== undefined) {
            errors.push(`${key} must be of type ${type}, got ${actualType}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      errors.forEach(error => this.recordViolation(channel, 'request', error));
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate IPC response against contract
   */
  validateResponse(channel: string, response: any): { valid: boolean; errors: string[] } {
    const contract = IPC_CONTRACTS[channel];
    
    if (!contract) {
      return { valid: false, errors: [`No contract for channel: ${channel}`] };
    }

    const errors: string[] = [];
    
    // All responses must have success field
    if (typeof response.success !== 'boolean') {
      errors.push('Response must have success: boolean field');
    }

    // Validate response schema
    if (contract.responseSchema && response.success) {
      for (const [key, type] of Object.entries(contract.responseSchema)) {
        if (key === 'success') continue; // Already validated
        
        if (typeof type === 'string') {
          const actualType = typeof response[key];
          if (type === 'array' && !Array.isArray(response[key])) {
            errors.push(`Response ${key} must be an array`);
          } else if (type !== 'array' && actualType !== type && response[key] !== undefined) {
            errors.push(`Response ${key} must be of type ${type}, got ${actualType}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      errors.forEach(error => this.recordViolation(channel, 'response', error));
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Record contract violation
   */
  private recordViolation(channel: string, type: 'request' | 'response', error: string) {
    this.violations.push({
      channel,
      type,
      error,
      timestamp: new Date().toISOString(),
    });
    
    console.error(`[IPC Contract Violation] ${channel} (${type}): ${error}`);
  }

  /**
   * Get all violations
   */
  getViolations() {
    return this.violations;
  }

  /**
   * Get violations for specific channel
   */
  getViolationsForChannel(channel: string) {
    return this.violations.filter(v => v.channel === channel);
  }

  /**
   * Clear violations
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Generate audit report
   */
  generateAuditReport(): string {
    if (this.violations.length === 0) {
      return 'No contract violations detected';
    }

    let report = `IPC Contract Audit Report
Generated: ${new Date().toISOString()}
Total Violations: ${this.violations.length}

`;

    // Group by channel
    const byChannel: Record<string, typeof this.violations> = {};
    this.violations.forEach(v => {
      if (!byChannel[v.channel]) {
        byChannel[v.channel] = [];
      }
      byChannel[v.channel].push(v);
    });

    for (const [channel, violations] of Object.entries(byChannel)) {
      report += `\nChannel: ${channel} (${violations.length} violations)\n`;
      violations.forEach(v => {
        report += `  [${v.type}] ${v.error} (${v.timestamp})\n`;
      });
    }

    return report;
  }
}

/**
 * Create wrapped IPC handler with validation
 */
export function createValidatedHandler(
  channel: string,
  handler: (...args: any[]) => Promise<IPCResponse>,
  validator: ContractValidator
) {
  return async (event: any, data: any): Promise<IPCResponse> => {
    // Validate request
    const requestValidation = validator.validateRequest(channel, data);
    if (!requestValidation.valid) {
      console.error(`[IPC] Request validation failed for ${channel}:`, requestValidation.errors);
      return {
        success: false,
        error: `Contract violation: ${requestValidation.errors.join(', ')}`,
      };
    }

    // Execute handler
    const response = await handler(event, data);

    // Validate response
    const responseValidation = validator.validateResponse(channel, response);
    if (!responseValidation.valid) {
      console.error(`[IPC] Response validation failed for ${channel}:`, responseValidation.errors);
    }

    return response;
  };
}

/**
 * Global validator instance
 */
export const globalValidator = new ContractValidator();

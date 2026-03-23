// Type-safe IPC contracts between main and renderer

// Run status types
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Agent execution modes
export type AgentMode = 'local' | 'remote';

// Receipt/proof structure
export interface ExecutionReceipt {
  id: string;
  runId: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  output?: string;
  error?: string;
  proof: {
    hash: string;
    signature?: string;
  };
}

// Run data structure
export interface Run {
  id: string;
  prompt: string;
  status: RunStatus;
  mode: AgentMode;
  createdAt: string;
  updatedAt: string;
  receipts: ExecutionReceipt[];
  output?: string;
  error?: string;
}

// IPC Channel definitions
export const IPC_CHANNELS = {
  // Run management
  RUN_CREATE: 'run:create',
  RUN_GET: 'run:get',
  RUN_LIST: 'run:list',
  RUN_CANCEL: 'run:cancel',
  RUN_RECOVER: 'run:recover',
  RUN_UPDATE: 'run:update',
  
  // Agent operations
  AGENT_STATUS: 'agent:status',
  AGENT_EXECUTE: 'agent:execute',
  AGENT_DIAGNOSTIC: 'agent:diagnostic',
  
  // Receipt/proof
  RECEIPT_GET: 'receipt:get',
  RECEIPT_VERIFY: 'receipt:verify',
  
  // Build/Test/Deploy
  BUILD_START: 'build:start',
  TEST_START: 'test:start',
  DEPLOY_START: 'deploy:start',
  
  // Updates
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
} as const;

// IPC Request/Response types
export interface IPCRequest<T = any> {
  channel: string;
  data?: T;
}

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Agent status
export interface AgentStatus {
  available: boolean;
  mode: AgentMode;
  version: string;
  activeRuns: number;
}

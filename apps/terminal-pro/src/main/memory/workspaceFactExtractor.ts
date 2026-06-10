import {
  classifyWorkspaceFact,
  createWorkspaceFact,
  type WorkspaceFact,
  type WorkspaceFactCategory,
  type WorkspaceFactConfidence,
  type WorkspaceFactInput,
  type WorkspaceFactSource,
} from "./memoryTypes.js";

/**
 * Project configuration data for fact extraction
 */
export type ProjectConfigInput = {
  projectRoot: string;
  packageManager?: string;
  framework?: string;
  deploymentTarget?: string;
  runtime?: string;
  shell?: string;
  agent?: string;
  ui?: string;
  database?: string;
  authProvider?: string;
  modelProvider?: string;
};

/**
 * Execution record data for fact extraction
 */
export type ExecutionRecordInput = {
  command: string;
  exitCode: number | null;
  success: boolean;
  output?: string;
  startedAt: string;
  endedAt?: string;
  proofId?: string;
};

/**
 * Proof record data for fact extraction
 */
export type ProofRecordInput = {
  proofId: string;
  verificationStatus: "verified" | "partially_verified" | "unverified";
  evidenceCount: number;
  commandsExecuted?: string[];
  successfulCommands?: number;
  failedCommands?: number;
};

/**
 * Memory entry for fact extraction
 */
export type MemoryEntryInput = {
  id: string;
  scope: "session" | "user" | "project" | "episode";
  kind: "preference" | "constraint" | "project_fact" | "task_outcome" | "conversation_fact";
  content: string;
  salience: number;
  tags: string[];
  source: "behavior" | "conversation";
  createdAt: string;
  updatedAt: string;
  workspaceId?: string;
};

/**
 * Input for extractWorkspaceFacts - can contain any combination of sources
 */
export type WorkspaceFactExtractInput = {
  projectConfig?: ProjectConfigInput;
  executionRecords?: ExecutionRecordInput[];
  proofRecords?: ProofRecordInput[];
  memoryEntries?: MemoryEntryInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Extract WorkspaceFacts from project configuration
 */
function extractFromProjectConfig(config: ProjectConfigInput): WorkspaceFact[] {
  const facts: WorkspaceFact[] = [];

  if (config.runtime) {
    const classification = classifyWorkspaceFact({
      key: "runtime.primary",
      value: config.runtime,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "runtime.primary",
        value: config.runtime,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.framework) {
    const classification = classifyWorkspaceFact({
      key: "framework.primary",
      value: config.framework,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "framework.primary",
        value: config.framework,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.shell) {
    const classification = classifyWorkspaceFact({
      key: "shell.primary",
      value: config.shell,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "shell.primary",
        value: config.shell,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.agent) {
    const classification = classifyWorkspaceFact({
      key: "agent.runtime",
      value: config.agent,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "agent.runtime",
        value: config.agent,
        category: classification.category,
        source: "runtime",
        confidence: "high",
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.ui) {
    const classification = classifyWorkspaceFact({
      key: "ui.primary",
      value: config.ui,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "ui.primary",
        value: config.ui,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.database) {
    const classification = classifyWorkspaceFact({
      key: "database.primary",
      value: config.database,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "database.primary",
        value: config.database,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.authProvider) {
    const classification = classifyWorkspaceFact({
      key: "auth.provider",
      value: config.authProvider,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "auth.provider",
        value: config.authProvider,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.modelProvider) {
    const classification = classifyWorkspaceFact({
      key: "model.provider",
      value: config.modelProvider,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "model.provider",
        value: config.modelProvider,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.packageManager) {
    const classification = classifyWorkspaceFact({
      key: "package.manager",
      value: config.packageManager,
      source: "config",
    });
    facts.push(
      createWorkspaceFact({
        key: "package.manager",
        value: config.packageManager,
        category: classification.category,
        source: "config",
        confidence: classification.confidence,
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  if (config.deploymentTarget) {
    facts.push(
      createWorkspaceFact({
        key: "deployment.target",
        value: config.deploymentTarget,
        category: "runtime_fact",
        source: "config",
        confidence: "high",
        last_verified_at: new Date().toISOString(),
      }),
    );
  }

  return facts;
}

/**
 * Extract WorkspaceFacts from execution records
 */
function extractFromExecutionRecords(records: ExecutionRecordInput[]): WorkspaceFact[] {
  const facts: WorkspaceFact[] = [];

  for (const record of records) {
    if (record.proofId && record.success) {
      facts.push(
        createWorkspaceFact({
          key: `execution.${record.proofId}.success`,
          value: "true",
          category: "runtime_fact",
          source: "runtime",
          confidence: "high",
          last_verified_at: record.endedAt || record.startedAt,
        }),
      );
    }

    if (record.proofId && !record.success && record.exitCode !== null) {
      facts.push(
        createWorkspaceFact({
          key: `execution.${record.proofId}.exit_code`,
          value: String(record.exitCode),
          category: "runtime_fact",
          source: "runtime",
          confidence: "high",
          last_verified_at: record.endedAt || record.startedAt,
        }),
      );
    }
  }

  return facts;
}

/**
 * Extract WorkspaceFacts from proof records
 */
function extractFromProofRecords(records: ProofRecordInput[]): WorkspaceFact[] {
  const facts: WorkspaceFact[] = [];

  for (const record of records) {
    facts.push(
      createWorkspaceFact({
        key: `proof.${record.proofId}.verification_status`,
        value: record.verificationStatus,
        category: "runtime_fact",
        source: "proof",
        confidence: "high",
        last_verified_at: new Date().toISOString(),
      }),
    );

    if (record.evidenceCount > 0) {
      facts.push(
        createWorkspaceFact({
          key: `proof.${record.proofId}.evidence_count`,
          value: String(record.evidenceCount),
          category: "runtime_fact",
          source: "proof",
          confidence: "high",
          last_verified_at: new Date().toISOString(),
        }),
      );
    }

    if (record.successfulCommands !== undefined) {
      facts.push(
        createWorkspaceFact({
          key: `proof.${record.proofId}.successful_commands`,
          value: String(record.successfulCommands),
          category: "runtime_fact",
          source: "proof",
          confidence: "high",
          last_verified_at: new Date().toISOString(),
        }),
      );
    }

    if (record.failedCommands !== undefined) {
      facts.push(
        createWorkspaceFact({
          key: `proof.${record.proofId}.failed_commands`,
          value: String(record.failedCommands),
          category: "runtime_fact",
          source: "proof",
          confidence: "high",
          last_verified_at: new Date().toISOString(),
        }),
      );
    }
  }

  return facts;
}

/**
 * Extract WorkspaceFacts from memory entries
 */
function extractFromMemoryEntries(entries: MemoryEntryInput[]): WorkspaceFact[] {
  const facts: WorkspaceFact[] = [];

  for (const entry of entries) {
    if (entry.kind === "preference" || entry.kind === "project_fact") {
      const source = entry.source === "behavior" ? "runtime" : "user";
      const classification = classifyWorkspaceFact({
        key: `memory.${entry.id}`,
        value: entry.content,
        source,
      });

      facts.push(
        createWorkspaceFact({
          key: `memory.${entry.id}.${entry.kind}`,
          value: entry.content,
          category: classification.category,
          source,
          confidence: entry.source === "behavior" ? "high" : "medium",
          last_verified_at: entry.updatedAt,
        }),
      );
    }
  }

  return facts;
}

/**
 * Extract candidate WorkspaceFacts from various runtime/project data sources.
 *
 * This function does NOT persist facts - it only extracts and classifies them.
 * Use WorkspaceFactStore for persistence when that layer is added.
 */
export function extractWorkspaceFacts(input: WorkspaceFactExtractInput): WorkspaceFact[] {
  const facts: WorkspaceFact[] = [];

  if (isRecord(input.projectConfig)) {
    facts.push(...extractFromProjectConfig(input.projectConfig));
  }

  if (input.executionRecords && Array.isArray(input.executionRecords)) {
    facts.push(...extractFromExecutionRecords(input.executionRecords));
  }

  if (input.proofRecords && Array.isArray(input.proofRecords)) {
    facts.push(...extractFromProofRecords(input.proofRecords));
  }

  if (input.memoryEntries && Array.isArray(input.memoryEntries)) {
    facts.push(...extractFromMemoryEntries(input.memoryEntries));
  }

  return facts;
}

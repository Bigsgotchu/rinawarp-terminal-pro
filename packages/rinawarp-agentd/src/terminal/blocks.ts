/**
 * Terminal Block Model
 * 
 * Warp-style block-based command output system.
 * Replaces plain text streams with structured blocks enabling:
 * - AI analysis of command output
 * - Collapsible output sections
 * - Structured command history
 * - Streaming updates
 * 
 * Block Types:
 * - CommandBlock: The command that was run
 * - OutputBlock: stdout content
 * - ErrorBlock: stderr content
 * - SuggestionBlock: AI suggestions (future)
 */

import { randomUUID } from "crypto";

/**
 * Block status types
 */
export type BlockStatus = "running" | "success" | "error" | "cancelled";

/**
 * Output chunk type
 */
export type ChunkType = "stdout" | "stderr";

/**
 * Output chunk - represents a piece of output from a command
 */
export interface OutputChunk {
  /** Unique ID for this chunk */
  id: string;
  /** Chunk type - stdout or stderr */
  type: ChunkType;
  /** The text content of this chunk */
  text: string;
  /** Timestamp when this chunk was received */
  timestamp: Date;
  /** Optional: sequence number for ordering chunks */
  sequence: number;
}

/**
 * Command block - represents a single command execution
 */
export interface CommandBlock {
  /** Unique ID for this block (UUID) */
  id: string;
  /** The command that was executed */
  command: string;
  /** Working directory when command was run */
  cwd: string;
  /** When the command started */
  startTime: Date;
  /** When the command ended (null if still running) */
  endTime: Date | null;
  /** Current status of the command */
  status: BlockStatus;
  /** Exit code (null if still running) */
  exitCode: number | null;
  /** Signal if killed (null if exited normally) */
  signal: string | null;
  /** Output chunks received from stdout */
  stdoutChunks: OutputChunk[];
  /** Output chunks received from stderr */
  stderrChunks: OutputChunk[];
  /** Combined stdout text (convenience) */
  stdout: string;
  /** Combined stderr text (convenience) */
  stderr: string;
  /** Optional metadata for AI/analysis */
  metadata: Record<string, unknown>;
}

/**
 * Serialized block for storage/history
 */
export interface SerializedBlock {
  id: string;
  command: string;
  cwd: string;
  startTime: string;  // ISO string
  endTime: string | null;
  status: BlockStatus;
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  metadata: Record<string, unknown>;
}

/**
 * Block listener callback types
 */
export type BlockDataCallback = (blockId: string, chunk: OutputChunk) => void;
export type BlockStatusCallback = (blockId: string, status: BlockStatus, exitCode?: number) => void;

/**
 * Block Manager
 * 
 * Manages command blocks throughout their lifecycle:
 * - Creation when command starts
 * - Streaming output chunks
 * - Status updates
 * - History and retrieval
 */
export class BlockManager {
  private blocks: Map<string, CommandBlock> = new Map();
  private blockOrder: string[] = [];
  private maxBlocks: number;
  private chunkSequence = 0;
  
  // Event listeners
  private dataListeners: BlockDataCallback[] = [];
  private statusListeners: BlockStatusCallback[] = [];

  constructor(maxBlocks = 1000) {
    this.maxBlocks = maxBlocks;
  }

  /**
   * Create a new command block
   */
  createBlock(command: string, cwd: string = process.cwd()): CommandBlock {
    const id = randomUUID();
    const now = new Date();
    
    const block: CommandBlock = {
      id,
      command,
      cwd,
      startTime: now,
      endTime: null,
      status: "running",
      exitCode: null,
      signal: null,
      stdoutChunks: [],
      stderrChunks: [],
      stdout: "",
      stderr: "",
      metadata: {},
    };

    this.blocks.set(id, block);
    this.blockOrder.push(id);

    // Trim if over max
    this.trim();

    return block;
  }

  /**
   * Get a block by ID
   */
  getBlock(id: string): CommandBlock | undefined {
    return this.blocks.get(id);
  }

  /**
   * Get the currently running block (if any)
   */
  getRunningBlock(): CommandBlock | undefined {
    for (const block of this.blocks.values()) {
      if (block.status === "running") {
        return block;
      }
    }
    return undefined;
  }

  /**
   * Append output to a block
   */
  appendOutput(blockId: string, type: ChunkType, text: string): OutputChunk | null {
    const block = this.blocks.get(blockId);
    if (!block || block.status !== "running") {
      return null;
    }

    const chunk: OutputChunk = {
      id: randomUUID(),
      type,
      text,
      timestamp: new Date(),
      sequence: this.chunkSequence++,
    };

    const targetChunks = type === "stdout" ? block.stdoutChunks : block.stderrChunks;
    targetChunks.push(chunk);

    // Update convenience properties
    if (type === "stdout") {
      block.stdout += text;
    } else {
      block.stderr += text;
    }

    // Notify listeners
    this.notifyDataListeners(blockId, chunk);

    return chunk;
  }

  /**
   * Append stdout output (convenience method)
   */
  appendStdout(blockId: string, text: string): OutputChunk | null {
    return this.appendOutput(blockId, "stdout", text);
  }

  /**
   * Append stderr output (convenience method)
   */
  appendStderr(blockId: string, text: string): OutputChunk | null {
    return this.appendOutput(blockId, "stderr", text);
  }

  /**
   * Mark a block as completed
   */
  completeBlock(
    blockId: string, 
    exitCode: number, 
    signal: string | null = null
  ): CommandBlock | null {
    const block = this.blocks.get(blockId);
    if (!block) {
      return null;
    }

    const now = new Date();
    block.endTime = now;
    block.exitCode = exitCode;
    block.signal = signal;
    block.status = exitCode === 0 ? "success" : "error";

    // Notify listeners
    this.notifyStatusListeners(blockId, block.status, exitCode);

    return block;
  }

  /**
   * Mark a block as cancelled
   */
  cancelBlock(blockId: string): CommandBlock | null {
    const block = this.blocks.get(blockId);
    if (!block) {
      return null;
    }

    block.endTime = new Date();
    block.status = "cancelled";

    // Notify listeners
    this.notifyStatusListeners(blockId, "cancelled");

    return block;
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): CommandBlock[] {
    return this.blockOrder.map(id => this.blocks.get(id)!).filter(Boolean);
  }

  /**
   * Get blocks by range (for pagination)
   */
  getBlocksByRange(start: number, count: number): CommandBlock[] {
    const end = Math.min(start + count, this.blockOrder.length);
    return this.blockOrder.slice(start, end)
      .map(id => this.blocks.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get recent blocks
   */
  getRecentBlocks(count: number): CommandBlock[] {
    return this.getBlocksByRange(Math.max(0, this.blockOrder.length - count), count);
  }

  /**
   * Get blocks by status
   */
  getBlocksByStatus(status: BlockStatus): CommandBlock[] {
    return this.getAllBlocks().filter(b => b.status === status);
  }

  /**
   * Search blocks by command
   */
  searchBlocks(pattern: string): CommandBlock[] {
    try {
      const regex = new RegExp(pattern, "i");
      return this.getAllBlocks().filter(b => regex.test(b.command));
    } catch {
      // Fallback to simple contains
      const lower = pattern.toLowerCase();
      return this.getAllBlocks().filter(b => b.command.toLowerCase().includes(lower));
    }
  }

  /**
   * Get failed blocks
   */
  getFailedBlocks(): CommandBlock[] {
    return this.getBlocksByStatus("error");
  }

  /**
   * Get successful blocks
   */
  getSuccessfulBlocks(): CommandBlock[] {
    return this.getBlocksByStatus("success");
  }

  /**
   * Delete a block
   */
  deleteBlock(blockId: string): boolean {
    const block = this.blocks.get(blockId);
    if (!block) {
      return false;
    }

    this.blocks.delete(blockId);
    const orderIndex = this.blockOrder.indexOf(blockId);
    if (orderIndex > -1) {
      this.blockOrder.splice(orderIndex, 1);
    }

    return true;
  }

  /**
   * Clear all blocks
   */
  clear(): void {
    this.blocks.clear();
    this.blockOrder = [];
    this.chunkSequence = 0;
  }

  /**
   * Get statistics
   */
  stats(): {
    total: number;
    running: number;
    success: number;
    error: number;
    cancelled: number;
  } {
    const blocks = this.getAllBlocks();
    return {
      total: blocks.length,
      running: blocks.filter(b => b.status === "running").length,
      success: blocks.filter(b => b.status === "success").length,
      error: blocks.filter(b => b.status === "error").length,
      cancelled: blocks.filter(b => b.status === "cancelled").length,
    };
  }

  /**
   * Serialize a block for storage
   */
  serializeBlock(blockId: string): SerializedBlock | null {
    const block = this.blocks.get(blockId);
    if (!block) {
      return null;
    }

    return {
      id: block.id,
      command: block.command,
      cwd: block.cwd,
      startTime: block.startTime.toISOString(),
      endTime: block.endTime?.toString() ?? null,
      status: block.status,
      exitCode: block.exitCode,
      signal: block.signal,
      stdout: block.stdout,
      stderr: block.stderr,
      metadata: block.metadata,
    };
  }

  /**
   * Serialize all blocks
   */
  serializeAll(): SerializedBlock[] {
    return this.blockOrder.map(id => this.serializeBlock(id)).filter(Boolean) as SerializedBlock[];
  }

  /**
   * Deserialize a block (restore from storage)
   */
  deserializeBlock(data: SerializedBlock): CommandBlock {
    const block: CommandBlock = {
      id: data.id,
      command: data.command,
      cwd: data.cwd,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      status: data.status,
      exitCode: data.exitCode,
      signal: data.signal,
      stdoutChunks: [],
      stderrChunks: [],
      stdout: data.stdout,
      stderr: data.stderr,
      metadata: data.metadata,
    };

    this.blocks.set(block.id, block);
    this.blockOrder.push(block.id);

    return block;
  }

  /**
   * Deserialize multiple blocks
   */
  deserializeAll(data: SerializedBlock[]): void {
    for (const blockData of data) {
      this.deserializeBlock(blockData);
    }
    this.trim();
  }

  /**
   * Add metadata to a block
   */
  setBlockMetadata(blockId: string, key: string, value: unknown): boolean {
    const block = this.blocks.get(blockId);
    if (!block) {
      return false;
    }
    block.metadata[key] = value;
    return true;
  }

  /**
   * Register data listener
   */
  onData(callback: BlockDataCallback): void {
    this.dataListeners.push(callback);
  }

  /**
   * Unregister data listener
   */
  offData(callback: BlockDataCallback): void {
    const index = this.dataListeners.indexOf(callback);
    if (index > -1) {
      this.dataListeners.splice(index, 1);
    }
  }

  /**
   * Register status listener
   */
  onStatus(callback: BlockStatusCallback): void {
    this.statusListeners.push(callback);
  }

  /**
   * Unregister status listener
   */
  offStatus(callback: BlockStatusCallback): void {
    const index = this.statusListeners.indexOf(callback);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  /**
   * Trim blocks to max size
   */
  private trim(): void {
    while (this.blockOrder.length > this.maxBlocks) {
      const oldestId = this.blockOrder.shift();
      if (oldestId) {
        this.blocks.delete(oldestId);
      }
    }
  }

  /**
   * Notify data listeners
   */
  private notifyDataListeners(blockId: string, chunk: OutputChunk): void {
    for (const listener of this.dataListeners) {
      try {
        listener(blockId, chunk);
      } catch (error) {
        console.error("[BlockManager] Error in data listener:", error);
      }
    }
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(blockId: string, status: BlockStatus, exitCode?: number): void {
    for (const listener of this.statusListeners) {
      try {
        listener(blockId, status, exitCode);
      } catch (error) {
        console.error("[BlockManager] Error in status listener:", error);
      }
    }
  }
}

// Singleton instance
let blockManagerInstance: BlockManager | null = null;

/**
 * Get the global BlockManager instance
 */
export function getBlockManager(): BlockManager {
  if (!blockManagerInstance) {
    blockManagerInstance = new BlockManager();
  }
  return blockManagerInstance;
}

/**
 * Reset the global BlockManager instance (useful for testing)
 */
export function resetBlockManager(): void {
  blockManagerInstance = null;
}

/**
 * Create a new BlockManager instance
 */
export function createBlockManager(maxBlocks?: number): BlockManager {
  return new BlockManager(maxBlocks);
}

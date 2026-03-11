/**
 * Command History
 * 
 * Manages command execution history with undo, replay, and search.
 * Now supports both legacy HistoryEntry and Warp-style CommandBlock.
 */

import { BlockManager, CommandBlock, getBlockManager, SerializedBlock } from "./blocks.js";

export interface HistoryEntry {
  id: number;
  command: string;
  timestamp: Date;
  exitCode: number | null;
  durationMs: number | null;
  success: boolean;
}

/**
 * History mode - legacy or block-based
 */
export type HistoryMode = "legacy" | "blocks";

/**
 * Extended History entry that includes block ID reference
 */
export interface HistoryEntryWithBlock extends HistoryEntry {
  blockId: string | null;
}

export class History {
  private entries: HistoryEntry[] = [];
  private nextId = 1;
  private maxEntries: number;
  private mode: HistoryMode;
  private blockManager: BlockManager | null = null;

  /**
   * Create a new History instance
   * @param maxEntries Maximum number of entries to keep
   * @param mode History mode: 'legacy' for simple entries, 'blocks' for Warp-style blocks
   */
  constructor(maxEntries = 1000, mode: HistoryMode = "blocks") {
    this.maxEntries = maxEntries;
    this.mode = mode;
    
    if (mode === "blocks") {
      this.blockManager = getBlockManager();
    }
  }

  /**
   * Get the block manager (if in block mode)
   */
  getBlockManagerInstance(): BlockManager | null {
    return this.blockManager;
  }

  /**
   * Get the current mode
   */
  getMode(): HistoryMode {
    return this.mode;
  }

  /**
   * Switch history mode
   */
  setMode(mode: HistoryMode): void {
    this.mode = mode;
    if (mode === "blocks") {
      this.blockManager = getBlockManager();
    } else {
      this.blockManager = null;
    }
  }

  /**
   * Add a command to history
   * @deprecated Use addBlock() for Warp-style block-based history
   */
  add(
    command: string,
    exitCode: number | null,
    durationMs: number | null
  ): HistoryEntry {
    const entry: HistoryEntry = {
      id: this.nextId++,
      command,
      timestamp: new Date(),
      exitCode,
      durationMs,
      success: exitCode === 0 || exitCode === null,
    };

    this.entries.push(entry);

    // Trim if over max
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    return entry;
  }

  /**
   * Add a block to history (Warp-style)
   */
  addBlock(block: CommandBlock): void {
    if (this.mode !== "blocks" || !this.blockManager) {
      console.warn("[History] Cannot add block - not in block mode");
      return;
    }
    // Block is already managed by BlockManager, this just syncs
  }

  /**
   * Create and add a new running block
   */
  createBlock(command: string, cwd?: string): CommandBlock | null {
    if (this.mode !== "blocks" || !this.blockManager) {
      return null;
    }
    return this.blockManager.createBlock(command, cwd);
  }

  /**
   * Complete a block
   */
  completeBlock(blockId: string, exitCode: number, signal?: string): CommandBlock | null {
    if (this.mode !== "blocks" || !this.blockManager) {
      return null;
    }
    return this.blockManager.completeBlock(blockId, exitCode, signal ?? null);
  }

  /**
   * Append output to a block
   */
  appendToBlock(blockId: string, type: "stdout" | "stderr", text: string): void {
    if (this.mode !== "blocks" || !this.blockManager) {
      return;
    }
    if (type === "stdout") {
      this.blockManager.appendStdout(blockId, text);
    } else {
      this.blockManager.appendStderr(blockId, text);
    }
  }

  /**
   * Get a block by ID
   */
  getBlock(blockId: string): CommandBlock | undefined {
    return this.blockManager?.getBlock(blockId);
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): CommandBlock[] {
    return this.blockManager?.getAllBlocks() ?? [];
  }

  /**
   * Get recent blocks
   */
  getRecentBlocks(count: number): CommandBlock[] {
    return this.blockManager?.getRecentBlocks(count) ?? [];
  }

  /**
   * Search blocks
   */
  searchBlocks(pattern: string): CommandBlock[] {
    return this.blockManager?.searchBlocks(pattern) ?? [];
  }

  /**
   * Get failed blocks
   */
  getFailedBlocks(): CommandBlock[] {
    return this.blockManager?.getFailedBlocks() ?? [];
  }

  /**
   * Get recent entries
   */
  recent(count: number): HistoryEntry[] {
    const start = Math.max(0, this.entries.length - count);
    return this.entries.slice(start);
  }

  /**
   * Search history - supports regex patterns
   */
  search(pattern: string): HistoryEntry[] {
    try {
      const regex = new RegExp(pattern, "i");
      return this.entries.filter((e) => regex.test(e.command));
    } catch {
      // Fallback to simple contains if regex is invalid
      const lower = pattern.toLowerCase();
      return this.entries.filter((e) => e.command.toLowerCase().includes(lower));
    }
  }

  /**
   * Get by ID
   */
  get(id: number): HistoryEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /**
   * Get all entries
   */
  all(): HistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Clear history (both legacy and blocks)
   */
  clear(): void {
    this.entries = [];
    this.blockManager?.clear();
  }

  /**
   * Get failed commands
   */
  failed(): HistoryEntry[] {
    return this.entries.filter((e) => !e.success);
  }

  /**
   * Get successful commands
   */
  successful(): HistoryEntry[] {
    return this.entries.filter((e) => e.success);
  }

  /**
   * Undo last command - returns the command for re-execution
   */
  undo(): HistoryEntry | undefined {
    if (this.entries.length === 0) return undefined;
    const last = this.entries.pop();
    return last;
  }

  /**
   * Replay a command by ID - returns command for re-execution
   */
  replay(id: number): string | undefined {
    const entry = this.get(id);
    return entry?.command;
  }

  /**
   * Get commands from this session
   */
  session(): HistoryEntry[] {
    const sessionStart = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
    return this.entries.filter((e) => e.timestamp.getTime() > sessionStart);
  }

  /**
   * Statistics
   */
  stats(): { total: number; success: number; failed: number; blocks?: number } {
    const baseStats = {
      total: this.entries.length,
      success: this.entries.filter((e) => e.success).length,
      failed: this.entries.filter((e) => !e.success).length,
    };

    // Include block stats if in block mode
    if (this.mode === "blocks" && this.blockManager) {
      const blockStats = this.blockManager.stats();
      return { ...baseStats, blocks: blockStats.total };
    }

    return baseStats;
  }

  /**
   * Serialize history for storage
   */
  serialize(): string {
    const data = {
      entries: this.entries,
      mode: this.mode,
      blocks: this.mode === "blocks" ? this.blockManager?.serializeAll() : [],
    };
    return JSON.stringify(data);
  }

  /**
   * Deserialize history from storage
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this.entries = data.entries || [];
      this.mode = data.mode || "legacy";
      
      if (this.mode === "blocks" && data.blocks) {
        if (!this.blockManager) {
          this.blockManager = getBlockManager();
        }
        this.blockManager.deserializeAll(data.blocks);
      }
    } catch (error) {
      console.error("[History] Failed to deserialize:", error);
    }
  }
}

// Singleton instance
let historyInstance: History | null = null;

export function getHistory(): History {
  if (!historyInstance) {
    historyInstance = new History();
  }
  return historyInstance;
}

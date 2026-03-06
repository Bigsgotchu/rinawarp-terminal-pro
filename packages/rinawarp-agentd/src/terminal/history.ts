/**
 * Command History
 * 
 * Manages command execution history with undo, replay, and search.
 */

export interface HistoryEntry {
  id: number;
  command: string;
  timestamp: Date;
  exitCode: number | null;
  durationMs: number | null;
  success: boolean;
}

export class History {
  private entries: HistoryEntry[] = [];
  private nextId = 1;
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Add a command to history
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
   * Clear history
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get failed commands - useful for debugging
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
  stats(): { total: number; success: number; failed: number } {
    return {
      total: this.entries.length,
      success: this.entries.filter((e) => e.success).length,
      failed: this.entries.filter((e) => !e.success).length,
    };
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

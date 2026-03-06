/**
 * Command History
 * 
 * Manages command execution history.
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
   * Search history
   */
  search(pattern: string): HistoryEntry[] {
    const regex = new RegExp(pattern, "i");
    return this.entries.filter((e) => regex.test(e.command));
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
}

// Singleton instance
let historyInstance: History | null = null;

export function getHistory(): History {
  if (!historyInstance) {
    historyInstance = new History();
  }
  return historyInstance;
}

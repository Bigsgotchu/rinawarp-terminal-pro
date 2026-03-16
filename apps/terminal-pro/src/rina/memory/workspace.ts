/**
 * Rina OS Control Layer - Workspace Memory (Session)
 *
 * Stores project/workspace specific information for the current session.
 * Remembers project root, project type, recent commands, and other
 * workspace-specific context.
 *
 * Additive architecture - does not modify existing core functionality.
 */

export interface WorkspaceMemoryData {
  root?: string
  projectType?: string
  lastCommands: CommandRecord[]
  currentFile?: string
  currentDirectory?: string
  activeProcesses?: string[]
}

export interface CommandRecord {
  command: string
  intent: string
  timestamp: number
  success?: boolean
}

/**
 * WorkspaceMemory - Session memory for current workspace
 *
 * Features:
 * - Stores current workspace root path
 * - Remembers project type (node, python, rust, etc.)
 * - Tracks recent commands with intents
 * - Maintains current working file/directory context
 */
export class WorkspaceMemory {
  private data: WorkspaceMemoryData = {
    lastCommands: [],
  }
  private maxCommandHistory: number = 20

  /**
   * Set the workspace root path
   */
  setWorkspace(root: string): void {
    this.data.root = root
  }

  /**
   * Get the workspace root path
   */
  getWorkspace(): string | undefined {
    return this.data.root
  }

  /**
   * Set the project type (node, python, rust, etc.)
   */
  setProjectType(type: string): void {
    this.data.projectType = type
  }

  /**
   * Get the project type
   */
  getProjectType(): string | undefined {
    return this.data.projectType
  }

  /**
   * Record a command execution
   */
  recordCommand(command: string, intent: string, success?: boolean): void {
    this.data.lastCommands.push({
      command,
      intent,
      timestamp: Date.now(),
      success,
    })

    // Maintain maximum command history
    while (this.data.lastCommands.length > this.maxCommandHistory) {
      this.data.lastCommands.shift()
    }
  }

  /**
   * Get recent commands
   */
  getRecentCommands(count: number = 10): CommandRecord[] {
    return this.data.lastCommands.slice(-count)
  }

  /**
   * Get all commands
   */
  getAllCommands(): CommandRecord[] {
    return [...this.data.lastCommands]
  }

  /**
   * Get the last command
   */
  getLastCommand(): CommandRecord | null {
    if (this.data.lastCommands.length === 0) {
      return null
    }
    return this.data.lastCommands[this.data.lastCommands.length - 1]
  }

  /**
   * Set current working directory
   */
  setCurrentDirectory(dir: string): void {
    this.data.currentDirectory = dir
  }

  /**
   * Get current working directory
   */
  getCurrentDirectory(): string | undefined {
    return this.data.currentDirectory
  }

  /**
   * Set currently active file
   */
  setCurrentFile(file: string): void {
    this.data.currentFile = file
  }

  /**
   * Get currently active file
   */
  getCurrentFile(): string | undefined {
    return this.data.currentFile
  }

  /**
   * Track an active process
   */
  addProcess(processId: string): void {
    if (!this.data.activeProcesses) {
      this.data.activeProcesses = []
    }
    if (!this.data.activeProcesses.includes(processId)) {
      this.data.activeProcesses.push(processId)
    }
  }

  /**
   * Remove a process from tracking
   */
  removeProcess(processId: string): void {
    if (this.data.activeProcesses) {
      this.data.activeProcesses = this.data.activeProcesses.filter((p) => p !== processId)
    }
  }

  /**
   * Get active processes
   */
  getActiveProcesses(): string[] {
    return this.data.activeProcesses ? [...this.data.activeProcesses] : []
  }

  /**
   * Get all workspace data
   */
  get(): WorkspaceMemoryData {
    return { ...this.data }
  }

  /**
   * Get workspace context as string for AI
   */
  getContextString(): string {
    const parts: string[] = []

    if (this.data.root) {
      parts.push(`Workspace: ${this.data.root}`)
    }

    if (this.data.projectType) {
      parts.push(`Project Type: ${this.data.projectType}`)
    }

    if (this.data.currentDirectory) {
      parts.push(`Current Dir: ${this.data.currentDirectory}`)
    }

    if (this.data.currentFile) {
      parts.push(`Active File: ${this.data.currentFile}`)
    }

    if (this.data.lastCommands.length > 0) {
      const recentCmds = this.data.lastCommands
        .slice(-5)
        .map((c) => c.command)
        .join(', ')
      parts.push(`Recent Commands: ${recentCmds}`)
    }

    return parts.join('\n')
  }

  /**
   * Clear workspace memory
   */
  clear(): void {
    this.data = {
      lastCommands: [],
    }
  }

  /**
   * Clear only command history
   */
  clearCommandHistory(): void {
    this.data.lastCommands = []
  }
}

// Singleton instance for easy access
export const workspaceMemory = new WorkspaceMemory()

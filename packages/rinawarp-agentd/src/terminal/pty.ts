/**
 * PTY Terminal - Interactive Shell Support
 *
 * Provides PTY-based terminal functionality using node-pty.
 * Supports interactive shells (vim, nano, htop, ssh, docker attach).
 *
 * Architecture:
 * - Uses node-pty for pseudo-terminal emulation
 * - Streams data via events for real-time output
 * - Integrates with safety validator for command validation
 */

import * as pty from 'node-pty'
import * as os from 'os'

export interface PtyOptions {
  /** Working directory (defaults to current process cwd) */
  cwd?: string
  /** Environment variables (defaults to process.env) */
  env?: Record<string, string>
  /** Shell to spawn (defaults to $SHELL or /bin/bash) */
  shell?: string
  /** Initial columns (default: 80) */
  cols?: number
  /** Initial rows (default: 24) */
  rows?: number
  /** Name of the terminal (default: xterm-256color) */
  name?: string
}

export interface PtyDimensions {
  cols: number
  rows: number
}

export interface PtyExit {
  exitCode: number
  signal?: number
}

/**
 * PTY Terminal Events
 */
export type PtyEventCallback = (data: string) => void
export type PtyExitCallback = (exit: PtyExit) => void

/**
 * PTY Terminal Class
 *
 * Provides a full-featured pseudo-terminal for interactive shell sessions.
 * Supports streaming I/O, dynamic resizing, and proper process lifecycle management.
 *
 * Usage:
 * ```typescript
 * const pty = new PtyTerminal();
 *
 * pty.onData((data) => {
 *   console.log('Output:', data);
 * });
 *
 * pty.onExit((exit) => {
 *   console.log('Process exited:', exit.exitCode);
 * });
 *
 * await pty.spawn();
 * pty.write('ls -la\n');
 * pty.resize(100, 30);
 * pty.kill();
 * ```
 */
export class PtyTerminal {
  private ptyProcess: pty.IPty | null = null
  private options: Required<PtyOptions>
  private dataCallbacks: PtyEventCallback[] = []
  private exitCallbacks: PtyExitCallback[] = []
  private _isRunning = false

  constructor(options: PtyOptions = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      env: this.sanitizeEnv({ ...process.env, ...options.env }),
      shell: options.shell || this.getDefaultShell(),
      cols: options.cols || 80,
      rows: options.rows || 24,
      name: options.name || 'xterm-256color',
    }
  }

  /**
   * Get the default shell based on platform
   */
  private getDefaultShell(): string {
    const platform = os.platform()

    // Check SHELL environment variable first
    if (process.env.SHELL) {
      return process.env.SHELL
    }

    // Platform-specific defaults
    if (platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    }

    if (platform === 'darwin') {
      return '/bin/zsh'
    }

    // Linux default
    return '/bin/bash'
  }

  /**
   * Sanitize environment variables to ensure all values are strings
   */
  private sanitizeEnv(env: Record<string, string | undefined>): Record<string, string> {
    const sanitized: Record<string, string> = {}
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  /**
   * Check if shell exists and is executable
   */
  private async isShellValid(shell: string): Promise<boolean> {
    try {
      const { execSync } = await import('child_process')
      execSync(`test -x ${shell}`, { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the shell path to use
   */
  private async resolveShell(): Promise<string> {
    const shell = this.options.shell

    if (await this.isShellValid(shell)) {
      return shell
    }

    // Fallback chain
    const fallbackShells = ['/bin/bash', '/bin/sh', '/usr/bin/bash']

    for (const fallback of fallbackShells) {
      if (fallback !== shell && (await this.isShellValid(fallback))) {
        console.warn(`[PtyTerminal] Shell '${shell}' not found, using '${fallback}'`)
        return fallback
      }
    }

    // Last resort - just try the original
    console.warn(`[PtyTerminal] No valid shell found, using '${shell}'`)
    return shell
  }

  /**
   * Spawn the PTY process
   */
  async spawn(): Promise<number> {
    if (this._isRunning) {
      throw new Error('PTY is already running')
    }

    const shell = await this.resolveShell()

    try {
      this.ptyProcess = pty.spawn(shell, [], {
        cwd: this.options.cwd,
        env: this.options.env,
        name: this.options.name,
        cols: this.options.cols,
        rows: this.options.rows,
        // Linux-specific options for better compatibility
        ...(os.platform() === 'linux' && {
          uid: process.getuid?.(),
          gid: process.getgid?.(),
        }),
      })

      this._isRunning = true

      // Set up data listener
      this.ptyProcess.onData((data: string) => {
        this.dataCallbacks.forEach((cb) => cb(data))
      })

      // Set up exit listener
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        this._isRunning = false
        this.exitCallbacks.forEach((cb) =>
          cb({
            exitCode: exitCode ?? -1,
            signal,
          })
        )
      })

      return this.ptyProcess.pid
    } catch (error) {
      this._isRunning = false
      throw new Error(`Failed to spawn PTY: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Write data to the PTY (simulates user input)
   */
  write(data: string): void {
    if (!this.ptyProcess || !this._isRunning) {
      throw new Error('PTY is not running')
    }
    this.ptyProcess.write(data)
  }

  /**
   * Resize the PTY terminal
   */
  resize(cols: number, rows: number): void {
    if (!this.ptyProcess || !this._isRunning) {
      throw new Error('PTY is not running')
    }

    if (cols <= 0 || rows <= 0) {
      throw new Error('Invalid dimensions')
    }

    this.ptyProcess.resize(cols, rows)
    this.options.cols = cols
    this.options.rows = rows
  }

  /**
   * Get current dimensions
   */
  getDimensions(): PtyDimensions {
    return {
      cols: this.options.cols,
      rows: this.options.rows,
    }
  }

  /**
   * Kill the PTY process
   */
  kill(signal: string = 'SIGTERM'): void {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill(signal)
      } catch (error) {
        // Process may have already exited
        console.warn(`[PtyTerminal] Error killing process: ${error}`)
      }
      this.ptyProcess = null
      this._isRunning = false
    }
  }

  /**
   * Check if PTY is running
   */
  get isRunning(): boolean {
    return this._isRunning
  }

  /**
   * Get the process ID
   */
  get pid(): number | null {
    return this.ptyProcess?.pid ?? null
  }

  /**
   * Register data callback (stdout/stderr combined)
   */
  onData(callback: PtyEventCallback): void {
    this.dataCallbacks.push(callback)
  }

  /**
   * Register exit callback
   */
  onExit(callback: PtyExitCallback): void {
    this.exitCallbacks.push(callback)
  }

  /**
   * Remove data callback
   */
  offData(callback: PtyEventCallback): void {
    const index = this.dataCallbacks.indexOf(callback)
    if (index > -1) {
      this.dataCallbacks.splice(index, 1)
    }
  }

  /**
   * Remove exit callback
   */
  offExit(callback: PtyExitCallback): void {
    const index = this.exitCallbacks.indexOf(callback)
    if (index > -1) {
      this.exitCallbacks.splice(index, 1)
    }
  }
}

/**
 * PTY Manager - Manages multiple PTY instances
 *
 * Useful for terminal multiplexing or managing multiple shell sessions.
 */
export class PtyManager {
  private terminals: Map<string, PtyTerminal> = new Map()
  private defaultOptions: PtyOptions

  constructor(defaultOptions: PtyOptions = {}) {
    this.defaultOptions = defaultOptions
  }

  /**
   * Create a new PTY terminal with an ID
   */
  create(id: string, options: PtyOptions = {}): PtyTerminal {
    if (this.terminals.has(id)) {
      throw new Error(`Terminal '${id}' already exists`)
    }

    const terminal = new PtyTerminal({
      ...this.defaultOptions,
      ...options,
    })

    this.terminals.set(id, terminal)
    return terminal
  }

  /**
   * Get a terminal by ID
   */
  get(id: string): PtyTerminal | undefined {
    return this.terminals.get(id)
  }

  /**
   * Get or create a terminal
   */
  getOrCreate(id: string, options: PtyOptions = {}): PtyTerminal {
    return this.get(id) ?? this.create(id, options)
  }

  /**
   * Remove and kill a terminal
   */
  remove(id: string): boolean {
    const terminal = this.terminals.get(id)
    if (terminal) {
      terminal.kill()
      return this.terminals.delete(id)
    }
    return false
  }

  /**
   * List all terminal IDs
   */
  list(): string[] {
    return Array.from(this.terminals.keys())
  }

  /**
   * Kill all terminals
   */
  killAll(): void {
    this.terminals.forEach((terminal) => terminal.kill())
    this.terminals.clear()
  }
}

/**
 * Factory function to create a configured PTY terminal
 * with safety validation integration
 */
export interface SafePtyOptions extends PtyOptions {
  /** Validate commands before execution */
  validateCommand?: (command: string) => boolean
  /** Callback for blocked commands */
  onBlocked?: (command: string) => void
}

/**
 * Create a safe PTY terminal that validates commands
 */
export function createSafePty(options: SafePtyOptions = {}): PtyTerminal {
  const terminal = new PtyTerminal(options)

  // If validation is enabled, wrap the write method
  if (options.validateCommand) {
    const originalWrite = terminal.write.bind(terminal)

    terminal.write = (data: string) => {
      // Check if the data looks like a command (ends with newline)
      if (data.endsWith('\n') && options.validateCommand && !options.validateCommand(data)) {
        options.onBlocked?.(data)
        return
      }
      originalWrite(data)
    }
  }

  return terminal
}

/**
 * Get system shell information
 */
export function getSystemShell(): {
  shell: string
  platform: NodeJS.Platform
  homeDir: string
} {
  return {
    shell: process.env.SHELL || '/bin/bash',
    platform: os.platform(),
    homeDir: os.homedir(),
  }
}

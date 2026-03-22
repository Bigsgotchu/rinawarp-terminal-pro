/**
 * Workspace Watcher
 *
 * Monitors the workspace for changes and triggers AI responses.
 * Enables reactive AI assistance based on file changes.
 */

import fs from 'fs'
import path from 'path'
import { thinkingStream } from '../thinking/thinkingStream.js'
import { detectFailure } from '../diagnostics/failureDetector.js'

export type WatchEvent = {
  type: 'add' | 'change' | 'unlink'
  path: string
  timestamp: string
}

export type WatchCallback = (event: WatchEvent) => void | Promise<void>

class WorkspaceWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map()
  private callbacks: WatchCallback[] = []
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private debounceMs = 500
  private _watching = false

  get watching(): boolean {
    return this._watching
  }

  /**
   * Start watching a workspace directory
   */
  watch(root: string, callback?: WatchCallback): void {
    if (this._watching) {
      console.log('[WorkspaceWatcher] Already watching')
      return
    }

    if (callback) {
      this.callbacks.push(callback)
    }

    console.log(`[WorkspaceWatcher] Starting to watch: ${root}`)

    try {
      const watcher = fs.watch(root, { recursive: true }, (eventType, filename) => {
        if (!filename) return

        // Skip hidden files and common ignore patterns
        if (filename.startsWith('.') || filename.includes('node_modules')) return

        const fullPath = path.join(root, filename)

        this.handleEvent(eventType as 'change' | 'rename', fullPath)
      })

      this.watchers.set(root, watcher)
      this._watching = true

      thinkingStream.emit('thinking', {
        type: 'workspace_watcher',
        status: 'started',
        message: `Watching workspace: ${root}`,
      })
    } catch (error) {
      console.error('[WorkspaceWatcher] Failed to start:', error)
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    for (const [root, watcher] of this.watchers) {
      watcher.close()
      console.log(`[WorkspaceWatcher] Stopped watching: ${root}`)
    }

    this.watchers.clear()
    this._watching = false

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    thinkingStream.emit('thinking', {
      type: 'workspace_watcher',
      status: 'stopped',
      message: 'Workspace watching stopped',
    })
  }

  /**
   * Add a callback
   */
  onEvent(callback: WatchCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * Remove a callback
   */
  offEvent(callback: WatchCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index > -1) {
      this.callbacks.splice(index, 1)
    }
  }

  /**
   * Handle file system event with debouncing
   */
  private handleEvent(_eventType: 'change' | 'rename', filePath: string): void {
    // Debounce events
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath)
      this.emitEvent(filePath)
    }, this.debounceMs)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Emit event to all callbacks
   */
  private async emitEvent(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase()
    const isFile = fs.existsSync(filePath) && fs.statSync(filePath).isFile()

    // Determine event type
    let eventType: WatchEvent['type'] = 'change'

    // For watch 'rename' events, determine add vs unlink
    if (!isFile && !fs.existsSync(filePath.split('.').slice(0, -1).join('.'))) {
      // Could be add or unlink - simplified for now
      eventType = 'change'
    }

    const event: WatchEvent = {
      type: eventType,
      path: filePath,
      timestamp: new Date().toISOString(),
    }

    // Only process relevant files
    if (!['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml'].includes(ext)) {
      return
    }

    console.log(`[WorkspaceWatcher] File ${eventType}: ${filePath}`)

    // Emit to thinking stream
    thinkingStream.emit('thinking', {
      type: 'workspace_watcher',
      status: 'file_changed',
      message: `File ${eventType}: ${path.basename(filePath)}`,
      details: { path: filePath, type: eventType },
    })

    // Call all callbacks
    for (const callback of this.callbacks) {
      try {
        await callback(event)
      } catch (error) {
        console.error('[WorkspaceWatcher] Callback error:', error)
      }
    }

    // Check for errors in changed files
    if (eventType === 'change' && isFile) {
      await this.checkForErrors(filePath)
    }
  }

  /**
   * Check a file for potential errors
   */
  private async checkForErrors(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')

      // Simple error detection in code
      if (detectFailure(content)) {
        thinkingStream.emit('thinking', {
          type: 'workspace_watcher',
          status: 'error_detected',
          message: `Potential error in: ${path.basename(filePath)}`,
        })
      }
    } catch {
      // Ignore read errors
    }
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    return [...this.watchers.keys()]
  }
}

export const workspaceWatcher = new WorkspaceWatcher()

/**
 * RinaWarp Brain Events System
 *
 * Emits brain events that flow to the AI Brain Panel in real-time.
 * Events represent the AI's reasoning pipeline.
 */

import { EventEmitter } from 'events'

/**
 * Brain event types representing AI reasoning stages
 */
export type BrainEventType =
  | 'intent' // User intent recognized
  | 'plan' // Planning phase
  | 'execution' // Tool execution
  | 'memory' // Memory operations
  | 'result' // Final result
  | 'error' // Error occurred

/**
 * Brain event structure
 */
export interface BrainEvent {
  type: BrainEventType
  message: string
  timestamp: number
  data?: Record<string, any>
  progress?: number // 0-100 for execution progress
}

/**
 * Brain Events singleton - emits events to renderer
 */
class BrainEvents extends EventEmitter {
  private mainWindow: any = null

  /**
   * Set the main window for sending events to renderer
   */
  setMainWindow(window: any): void {
    this.mainWindow = window
  }

  /**
   * Emit a brain event
   */
  emitEvent(type: BrainEventType, message: string, data?: Record<string, any>): void {
    const event: BrainEvent = {
      type,
      message,
      timestamp: Date.now(),
      data,
    }

    // Emit locally for handlers
    this.emit('brain-event', event)

    // Send to renderer if window is available
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('rina:brain:event', event)
    }
  }

  /**
   * Emit intent event
   */
  intent(message: string): void {
    this.emitEvent('intent', message)
  }

  /**
   * Emit plan event
   */
  plan(message: string, progress?: number): void {
    const event: BrainEvent = {
      type: 'plan',
      message,
      timestamp: Date.now(),
      progress,
    }
    this.emit('brain-event', event)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('rina:brain:event', event)
    }
  }

  /**
   * Emit execution event
   */
  execution(message: string, progress?: number): void {
    const event: BrainEvent = {
      type: 'execution',
      message,
      timestamp: Date.now(),
      progress,
    }
    this.emit('brain-event', event)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('rina:brain:event', event)
    }
  }

  /**
   * Emit memory event
   */
  memory(message: string): void {
    this.emitEvent('memory', message)
  }

  /**
   * Emit result event
   */
  result(message: string): void {
    this.emitEvent('result', message)
  }

  /**
   * Emit error event
   */
  error(message: string): void {
    this.emitEvent('error', message)
  }

  /**
   * Emit a progress event with percentage
   */
  progress(type: BrainEventType, message: string, percent: number): void {
    const event: BrainEvent = {
      type,
      message,
      timestamp: Date.now(),
      progress: Math.min(100, Math.max(0, percent)),
    }
    this.emit('brain-event', event)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('rina:brain:event', event)
    }
  }
}

/**
 * Singleton instance
 */
export const brainEvents = new BrainEvents()

/**
 * Helper to create scoped event emitter
 */
export function createBrainScope(scope: string) {
  return {
    intent: (msg: string) => brainEvents.intent(`[${scope}] ${msg}`),
    plan: (msg: string, p?: number) => brainEvents.plan(`[${scope}] ${msg}`, p),
    execution: (msg: string, p?: number) => brainEvents.execution(`[${scope}] ${msg}`, p),
    memory: (msg: string) => brainEvents.memory(`[${scope}] ${msg}`),
    result: (msg: string) => brainEvents.result(`[${scope}] ${msg}`),
    error: (msg: string) => brainEvents.error(`[${scope}] ${msg}`),
    progress: (msg: string, pct: number) => brainEvents.progress('execution', `[${scope}] ${msg}`, pct),
  }
}

/**
 * RinaWarp Brain System - Main Export
 *
 * Unified export for brain events, thinking stream, and visualization.
 */

export * from './brainEvents.js'
export * from '../thinking/thinkingStream.js'

// Import and create singleton instances
import { brainEvents } from './brainEvents.js'
import { thinkingStream } from '../thinking/thinkingStream.js'

/**
 * Initialize brain system with main window
 */
export function initBrainSystem(mainWindow: any): void {
  // Connect brain events to main window
  brainEvents.setMainWindow(mainWindow)

  // Also connect thinking stream
  thinkingStream.on('thought:start', (thought) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rina:thinking', {
        time: thought.timestamp.getTime(),
        message: thought.content,
        type: thought.type,
      })
    }
  })

  console.log('[BrainSystem] Initialized')
}

/**
 * Send brain event helper
 */
export function emitBrainEvent(
  type: 'intent' | 'plan' | 'execution' | 'memory' | 'result' | 'error',
  message: string,
  data?: Record<string, any>
): void {
  brainEvents.emitEvent(type, message, data)
}

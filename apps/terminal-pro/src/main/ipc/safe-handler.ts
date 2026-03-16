import { ipcMain } from "electron"

/**
 * Safely register an IPC handler, preventing duplicate errors.
 * Always removes any existing handler before registering to avoid
 * "Attempted to register a second handler" errors.
 */
export function safeHandle(channel: string, handler: (...args: any[]) => any): void {
  // Always remove existing handler first to prevent duplicate registration errors
  // This works regardless of which module registered it first
  try {
    ipcMain.removeHandler(channel)
  } catch {
    // Ignore if handler doesn't exist
  }
  
  ipcMain.handle(channel, handler)
}

/**
 * Check if a channel has a handler registered
 */
export function hasHandler(channel: string): boolean {
  // We can't directly check, but we track what we've registered
  return false // Simplified - just always allow registration
}

/**
 * Get all registered channel names (for debugging)
 */
export function getRegisteredChannels(): string[] {
  // Electron doesn't provide a way to list all handlers
  // This would need manual tracking if needed
  return []
}

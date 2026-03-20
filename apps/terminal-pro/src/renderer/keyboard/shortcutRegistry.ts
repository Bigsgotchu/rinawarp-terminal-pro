/**
 * Keyboard Shortcut Registry
 *
 * Central registry for all global keyboard shortcuts.
 * Handles registration, delegation, and cleanup of shortcuts.
 */

export type ShortcutHandler = (event: KeyboardEvent) => void

export interface Shortcut {
  key: string
  ctrl?: boolean
  cmd?: boolean
  alt?: boolean
  shift?: boolean
  handler: ShortcutHandler
  description?: string
}

export class ShortcutRegistry {
  private shortcuts: Map<string, Shortcut> = new Map()
  private keydownHandler: (event: KeyboardEvent) => void

  constructor() {
    this.keydownHandler = this.handleKeydown.bind(this)
  }

  register(shortcut: Shortcut): () => void {
    const key = this.normalizeKey(shortcut)
    if (this.shortcuts.has(key)) {
      console.warn(`Shortcut already registered: ${key}`)
      return () => {}
    }
    this.shortcuts.set(key, shortcut)
    return () => this.shortcuts.delete(key)
  }

  start(): void {
    document.addEventListener('keydown', this.keydownHandler)
  }

  stop(): void {
    document.removeEventListener('keydown', this.keydownHandler)
  }

  private handleKeydown(event: KeyboardEvent): void {
    const key = this.normalizeKey({
      key: event.key,
      ctrl: event.ctrlKey,
      cmd: event.metaKey,
      alt: event.altKey,
      shift: event.shiftKey,
    })

    const shortcut = this.shortcuts.get(key)
    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      shortcut.handler(event)
    }
  }

  private normalizeKey(shortcut: Partial<Shortcut>): string {
    const parts: string[] = []
    if (shortcut.ctrl) parts.push('ctrl')
    if (shortcut.cmd) parts.push('cmd')
    if (shortcut.alt) parts.push('alt')
    if (shortcut.shift) parts.push('shift')
    parts.push(shortcut.key || '')
    return parts.join('+')
  }
}

// Global instance
export const globalShortcutRegistry = new ShortcutRegistry()
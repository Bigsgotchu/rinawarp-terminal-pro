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
  private started = false

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
    if (this.started) return
    this.started = true
    document.addEventListener('keydown', this.keydownHandler)
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    document.removeEventListener('keydown', this.keydownHandler)
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.shouldIgnoreEvent(event)) return

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

  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') return false
    const target = event.target
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable) return true
    const tag = target.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select'
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

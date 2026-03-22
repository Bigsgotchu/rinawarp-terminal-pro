import { globalShortcutRegistry } from './shortcutRegistry.js'

type ShortcutDeps = {
  togglePalette: () => void
  hidePalette: () => void
  toggleSettings: () => void
  closeSettings: () => void
}

async function copyCurrentSelection(): Promise<void> {
  const selection = window.getSelection()
  const text = selection?.toString().trim() || ''
  if (!text) return
  await navigator.clipboard.writeText(text)
}

export function registerRendererShortcuts(deps: ShortcutDeps): () => void {
  const unregisterShortcuts = [
    globalShortcutRegistry.register({
      key: 'k',
      ctrl: true,
      handler: () => deps.togglePalette(),
    }),
    globalShortcutRegistry.register({
      key: 'k',
      cmd: true,
      handler: () => deps.togglePalette(),
    }),
    globalShortcutRegistry.register({
      key: ',',
      ctrl: true,
      handler: () => deps.toggleSettings(),
    }),
    globalShortcutRegistry.register({
      key: ',',
      cmd: true,
      handler: () => deps.toggleSettings(),
    }),
    globalShortcutRegistry.register({
      key: 'Escape',
      handler: () => {
        deps.hidePalette()
        deps.closeSettings()
      },
    }),
    globalShortcutRegistry.register({
      key: 'C',
      ctrl: true,
      shift: true,
      handler: () => {
        void copyCurrentSelection()
      },
    }),
    globalShortcutRegistry.register({
      key: 'C',
      cmd: true,
      shift: true,
      handler: () => {
        void copyCurrentSelection()
      },
    }),
    globalShortcutRegistry.register({
      key: 'c',
      ctrl: true,
      handler: () => {
        void copyCurrentSelection()
      },
    }),
    globalShortcutRegistry.register({
      key: 'c',
      cmd: true,
      handler: () => {
        void copyCurrentSelection()
      },
    }),
  ]

  globalShortcutRegistry.start()

  return () => {
    unregisterShortcuts.forEach((cleanup) => cleanup())
    globalShortcutRegistry.stop()
  }
}

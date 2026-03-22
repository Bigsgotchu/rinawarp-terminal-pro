import { globalShortcutRegistry } from './shortcutRegistry.js'

type ShortcutDeps = {
  togglePalette: () => void
  hidePalette: () => void
  toggleSettings: () => void
  closeSettings: () => void
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
  ]

  globalShortcutRegistry.start()

  return () => {
    unregisterShortcuts.forEach((cleanup) => cleanup())
    globalShortcutRegistry.stop()
  }
}

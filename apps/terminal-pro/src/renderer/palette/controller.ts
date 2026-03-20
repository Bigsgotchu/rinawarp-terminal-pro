import type { PaletteCommand } from './model.js'

type Deps = { backdrop: HTMLElement; host: HTMLElement }

type Controller = {
  open: () => void
  close: () => void
  isOpen: () => boolean
  setCommands: (_commands: PaletteCommand[]) => void
}

export function createPaletteController(_deps: Deps): Controller {
  console.warn('[ui] legacy palette controller is disabled; use renderer.prod.ts')
  return {
    open: () => {},
    close: () => {},
    isOpen: () => false,
    setCommands: () => {},
  }
}

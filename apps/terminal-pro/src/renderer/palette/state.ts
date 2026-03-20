import type { PaletteCommand } from './model.js'

export type PaletteState = {
  commands: PaletteCommand[]
  filtered: PaletteCommand[]
  activeIndex: number
  isOpen: boolean
}

export function createInitialState(): PaletteState {
  return {
    commands: [],
    filtered: [],
    activeIndex: 0,
    isOpen: false,
  }
}

export function setCommands(state: PaletteState, next: PaletteCommand[]): void {
  state.commands = Array.isArray(next) ? next : []
  state.filtered = state.commands.slice(0, 30)
  state.activeIndex = 0
}

export function buildRecentBoost(): Map<string, number> {
  return new Map<string, number>()
}

export function clampIndex(idx: number, length: number): number {
  if (length <= 0) return 0
  return Math.max(0, Math.min(idx, length - 1))
}

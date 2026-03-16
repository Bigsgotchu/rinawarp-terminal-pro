/**
 * Palette state management - pure state container and helpers.
 */

import type { PaletteCommand } from './model.js'
import { loadRecent } from './recent.js'

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
  const recents = loadRecent()
  const boost = new Map<string, number>()
  recents.forEach((id, idx) => boost.set(id, Math.max(0, 1.5 - idx * 0.15)))
  return boost
}

export function clampIndex(idx: number, length: number): number {
  if (length <= 0) return 0
  return Math.max(0, Math.min(idx, length - 1))
}

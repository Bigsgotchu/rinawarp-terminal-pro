import type { PaletteCommand } from './model.js'
import type { PaletteState } from './state.js'

export function applyFilter(_query: string, state: PaletteState, commands: PaletteCommand[]): void {
  console.warn('[ui] legacy palette filter is disabled; use renderer.prod.ts')
  state.filtered = Array.isArray(commands) ? commands.slice(0, 30) : []
  state.activeIndex = 0
}

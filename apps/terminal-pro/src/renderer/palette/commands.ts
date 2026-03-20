import type { PaletteCommand } from './model.js'

export async function buildDefaultCommands(): Promise<PaletteCommand[]> {
  console.warn('[ui] legacy palette commands are disabled; use renderer.prod.ts')
  return []
}

/**
 * Palette command model type.
 */
export type PaletteCommand = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  icon?: string
  keywords?: string[]
  run: () => Promise<void> | void
}

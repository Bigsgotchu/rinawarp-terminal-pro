/**
 * Renderer Bootstrap
 *
 * Orchestrates the initialization of the production renderer.
 * Keep this file thin so startup ownership stays explicit while the
 * renderer is progressively extracted from the monolith.
 */

import { domReady } from './domReady.js'
import { initProductionRenderer } from '../renderer.prod.js'
import { applySelectedThemeFromApi } from '../theme/selectedTheme.js'

export async function initRenderer(): Promise<void> {
  console.log('[renderer] bootstrap starting')
  await domReady()

  await initProductionRenderer()
  await applySelectedThemeFromApi()

  console.log('[renderer] bootstrap complete')
}

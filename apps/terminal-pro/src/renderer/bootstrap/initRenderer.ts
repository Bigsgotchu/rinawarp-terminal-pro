/**
 * Renderer Bootstrap
 *
 * Orchestrates startup for the canonical workbench shell, while keeping
 * a short-lived emergency fallback to the older production mount path.
 */

import { domReady } from './domReady.js'
import { initProductionRenderer } from '../renderer.prod.js'
import { initWorkbenchShellRenderer } from '../modern/initWorkbenchShellRenderer.js'
import { resolveLegacyRendererFallbackEnabled } from '../modern/legacyRendererFallback.js'
import { applySelectedThemeFromApi } from '../theme/selectedTheme.js'

export async function initRenderer(): Promise<void> {
  console.log('[renderer] bootstrap starting')
  await domReady()
  const useLegacyFallback = resolveLegacyRendererFallbackEnabled({
    storage: window.localStorage,
    documentElement: document.documentElement,
  })
  document.documentElement.setAttribute(
    'data-rw-renderer-flavor-active',
    useLegacyFallback ? 'legacy-fallback' : 'workbench-shell'
  )

  if (useLegacyFallback) {
    await initProductionRenderer()
  } else {
    await initWorkbenchShellRenderer()
  }
  await applySelectedThemeFromApi()

  console.log('[renderer] bootstrap complete')
}

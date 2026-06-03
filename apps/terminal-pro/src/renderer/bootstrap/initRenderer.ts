/**
 * Renderer Bootstrap
 *
 * Orchestrates startup for the canonical workbench shell.
 */

import { domReady } from './domReady.js'
import { initWorkbenchShellRenderer } from '../modern/initWorkbenchShellRenderer.js'
import { applySelectedThemeFromApi } from '../theme/selectedTheme.js'

export async function initRenderer(): Promise<void> {
  console.log('[renderer] bootstrap starting')
  await domReady()

  document.documentElement.setAttribute(
    'data-rw-renderer-flavor-active',
    'workbench-shell'
  )

  await initWorkbenchShellRenderer()
  await applySelectedThemeFromApi()

  console.log('[renderer] bootstrap complete')
}

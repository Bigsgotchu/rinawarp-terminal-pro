/**
 * Renderer Bootstrap
 *
 * Orchestrates startup for the canonical Agent Shell.
 */

import { domReady } from './domReady.js'
import { initAgentShellRenderer } from '../modern/initAgentShellRenderer.js'
import { applySelectedThemeFromApi } from '../theme/selectedTheme.js'

export async function initRenderer(): Promise<void> {
  await domReady()

  document.documentElement.setAttribute(
    'data-rw-renderer-flavor-active',
    'agent-shell'
  )

  await initAgentShellRenderer()
  await applySelectedThemeFromApi()
}

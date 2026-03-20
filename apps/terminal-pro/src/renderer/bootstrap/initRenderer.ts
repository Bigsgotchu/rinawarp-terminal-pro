/**
 * Renderer Bootstrap
 *
 * Orchestrates the initialization of all renderer modules.
 * This is the central entry point for setting up the UI.
 */

import { ThemeController } from '../theme/themeController.js'

// Placeholder for future modular initialization
export async function initRenderer(): Promise<void> {
  console.log('[renderer] bootstrap starting')

  // TODO: Initialize theme controller
  const themeController = new ThemeController()
  themeController.applyTheme()

  // TODO: Initialize other modules...

  console.log('[renderer] bootstrap complete')
}
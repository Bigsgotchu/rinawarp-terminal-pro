import { getCurrentDensity, setRendererDensity, toggleRendererDensity } from '../theme/rendererThemeCompat.js'
import type { Density as ThemeDensity } from '../theme/tokens.js'
import { WorkbenchStore, type LicenseTier } from '../workbench/store.js'

export async function resolveInitialWorkspaceKey(
  normalizeWorkspaceKey: (root?: string | null) => string
): Promise<string> {
  let initialWorkspaceKey = '__none__'
  try {
    const workspace = await window.rina.workspaceDefault?.()
    if (workspace?.ok && workspace.path) {
      initialWorkspaceKey = normalizeWorkspaceKey(workspace.path)
      console.log('[ui] workspaceDefault', workspace.path)
    }
  } catch (error) {
    console.warn('Failed to resolve default workspace:', error)
  }
  return initialWorkspaceKey
}

export function installDensityBridge(): void {
  window.__rinaDensity = {
    get: () => getCurrentDensity(),
    set: (value: ThemeDensity) => setRendererDensity(value),
    toggle: () => toggleRendererDensity(),
  }
}

export async function finalizeRendererBoot(store: WorkbenchStore): Promise<void> {
  store.dispatch({ type: 'ui/setStatusSummary', text: 'Ready' })

  const license = await window.rina.licenseState()
  store.dispatch({
    type: 'license/set',
    tier: ((license?.tier || 'starter').toLowerCase() as LicenseTier) || 'starter',
    lastCheckedAt: Date.now(),
  })
  store.dispatch({
    type: 'runtime/set',
    runtime: {
      ...store.getState().runtime,
      rendererCanonicalReady: true,
    },
  })

  console.log('RinaWarp Terminal Pro initialized successfully')
  window.RINAWARP_READY = true
}

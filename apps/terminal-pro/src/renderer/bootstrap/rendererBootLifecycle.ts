import { getCurrentDensity, setRendererDensity, toggleRendererDensity } from '../theme/rendererThemeCompat.js'
import type { Density as ThemeDensity } from '../theme/tokens.js'
import { WorkbenchStore, type LicenseTier } from '../workbench/store.js'

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function resolveInitialWorkspaceKey(
  normalizeWorkspaceKey: (root?: string | null) => string
): Promise<string> {
  let initialWorkspaceKey = '__none__'
  try {
    const workspace = await withTimeout(
      window.rina.workspaceDefault?.() ?? Promise.resolve(null),
      5_000,
      'workspaceDefault'
    )
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
  try {
    const license = await withTimeout(window.rina.licenseState(), 5_000, 'licenseState')
    store.dispatch({
      type: 'license/set',
      tier: ((license?.tier || 'starter').toLowerCase() as LicenseTier) || 'starter',
      lastCheckedAt: Date.now(),
    })
  } catch (error) {
    console.warn('Failed to resolve license state during renderer boot:', error)
  } finally {
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
}

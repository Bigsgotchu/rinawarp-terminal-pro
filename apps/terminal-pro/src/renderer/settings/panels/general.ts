import { requestWorkspaceSelection } from '../../actions/workspaceOwnership.js'
import { renderGeneralPanel } from './generalSurface.js'

declare global {
  interface Window {
    __rinaDensity?: {
      get: () => 'compact' | 'comfortable'
      set: (value: 'compact' | 'comfortable') => void
      toggle: () => 'compact' | 'comfortable'
    }
  }
}

async function resolveWorkspaceLabel(): Promise<string> {
  try {
    const workspace = await (window as any).rina?.workspaceDefault?.()
    if (workspace?.ok && workspace.path) return String(workspace.path)
  } catch {
    // ignore
  }
  return 'No workspace selected'
}

export async function mountGeneralPanel(container: HTMLElement): Promise<void> {
  const workspaceLabel = await resolveWorkspaceLabel()
  container.innerHTML = renderGeneralPanel(workspaceLabel)

  const sync = () => {
    const current = window.__rinaDensity?.get?.() || 'compact'
    const buttons = Array.from(container.querySelectorAll<HTMLElement>('[data-density-option]'))
    for (const button of buttons) {
      const active = button.dataset.densityOption === current
      button.classList.toggle('rw-density-active', active)
      button.setAttribute('aria-pressed', String(active))
    }
  }

  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-density-option]'))
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const value = button.dataset.densityOption
      if (value === 'compact' || value === 'comfortable') {
        window.__rinaDensity?.set?.(value)
        sync()
      }
    })
  }

  const workspacePath = container.querySelector<HTMLElement>('#rw-general-workspace-path')
  const workspaceStatus = container.querySelector<HTMLElement>('#rw-general-workspace-status')
  container.querySelector<HTMLButtonElement>('#rw-general-pick-workspace')?.addEventListener('click', async () => {
    const result = await requestWorkspaceSelection({
      source: 'settings_general',
      onStatus: (message) => {
        if (workspaceStatus) workspaceStatus.textContent = message
      },
    })
    if (result.ok && result.path) {
      if (workspacePath) workspacePath.textContent = String(result.path)
    }
  })

  sync()
}

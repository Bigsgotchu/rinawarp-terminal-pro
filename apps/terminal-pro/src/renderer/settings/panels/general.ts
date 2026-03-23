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
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>General</h2>
      <p class="rw-sub">App behavior and defaults.</p>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-settings-density">
        <div class="rw-settings-density-copy">
          <div class="rw-label">Density</div>
          <div class="rw-muted">Choose whether the app feels tighter or more relaxed.</div>
        </div>
        <div class="rw-settings-density-actions" role="group" aria-label="Density">
          <button type="button" class="rw-btn rw-btn-ghost" data-density-option="compact">Compact</button>
          <button type="button" class="rw-btn rw-btn-ghost" data-density-option="comfortable">Comfortable</button>
        </div>
      </div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Keyboard shortcuts</div>
          <div class="rw-muted">Open Settings: Ctrl/⌘ + ,</div>
        </div>
      </div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Safety mode</div>
          <div class="rw-muted">High-impact commands require explicit confirmation.</div>
        </div>
      </div>
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Workspace</div>
          <div class="rw-muted" id="rw-general-workspace-path">${workspaceLabel}</div>
          <div class="rw-muted">Pick the folder Rina should use as the current workspace for runs, receipts, and code context.</div>
        </div>
        <button type="button" class="rw-btn rw-btn-primary" id="rw-general-pick-workspace">Choose workspace</button>
      </div>
      <div id="rw-general-workspace-status" class="rw-muted" aria-live="polite"></div>
    </div>
  `

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
import { requestWorkspaceSelection } from '../../actions/workspaceOwnership.js'

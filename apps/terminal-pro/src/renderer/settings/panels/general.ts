declare global {
  interface Window {
    __rinaDensity?: {
      get: () => 'compact' | 'comfortable'
      set: (value: 'compact' | 'comfortable') => void
      toggle: () => 'compact' | 'comfortable'
    }
  }
}

export function mountGeneralPanel(container: HTMLElement): void {
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

  sync()
}

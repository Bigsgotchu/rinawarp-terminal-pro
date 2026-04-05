// apps/terminal-pro/src/renderer/services/updateNotice.ts
type UpdateStatus = 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'downloading' | 'downloaded' | 'unsupported' | 'error'

type UpdateState = {
  status: UpdateStatus
  latestVersion: string | null
  installReady: boolean
  channel: 'stable' | 'beta' | 'alpha'
}

type SettingsHandle = {
  open?: (tabId?: string) => void
}

function getRina(): any {
  return (window as unknown as { rina?: any }).rina
}

function getSettingsHandle(): SettingsHandle | undefined {
  return (window as unknown as { __rinaSettings?: SettingsHandle }).__rinaSettings
}

function ensureNoticeHost(): HTMLElement {
  let host = document.querySelector<HTMLElement>('#rw-update-notice')
  if (host) return host
  host = document.createElement('div')
  host.id = 'rw-update-notice'
  host.hidden = true
  document.body.appendChild(host)
  return host
}

function renderNotice(host: HTMLElement, state: UpdateState): void {
  const title =
    state.status === 'downloaded'
      ? `Update ready: ${state.latestVersion || 'new version'}`
      : `Update available: ${state.latestVersion || 'new version'}`
  const detail =
    state.status === 'downloaded'
      ? 'The update is downloaded and ready to install.'
      : state.channel === 'stable'
        ? 'A newer stable build is available for this app.'
        : `A newer ${state.channel} build is available for this app.`

  host.innerHTML = `
    <div class="rw-update-notice-card" role="status" aria-live="polite">
      <div class="rw-update-notice-copy">
        <strong>${title}</strong>
        <span>${detail}</span>
      </div>
      <div class="rw-update-notice-actions">
        <button type="button" class="rw-btn rw-btn-primary" data-update-action="open-settings">
          ${state.installReady ? 'Install update' : 'Open updates'}
        </button>
        <button type="button" class="rw-btn rw-btn-ghost" data-update-action="dismiss">Dismiss</button>
      </div>
    </div>
  `
  host.hidden = false

  const openBtn = host.querySelector<HTMLElement>('[data-update-action="open-settings"]')
  const dismissBtn = host.querySelector<HTMLElement>('[data-update-action="dismiss"]')
  openBtn?.addEventListener('click', () => {
    getSettingsHandle()?.open?.('updates')
  })
  dismissBtn?.addEventListener('click', () => {
    host.hidden = true
  })
}

export function initUpdateNotice(): void {
  const host = ensureNoticeHost()
  const rina = getRina()
  if (!rina?.updateState) return

  const renderIfNeeded = async () => {
    try {
      const state = (await rina.updateState()) as UpdateState | null
      if (!state) return
      if (state.status !== 'update_available' && state.status !== 'downloaded') return
      renderNotice(host, state)
    } catch {
      // Ignore updater notice failures; the settings panel remains the source of truth.
    }
  }

  void renderIfNeeded()
  window.setTimeout(() => void renderIfNeeded(), 6500)
}

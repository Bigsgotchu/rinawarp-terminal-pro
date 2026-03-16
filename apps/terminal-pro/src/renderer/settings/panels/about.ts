function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

type UpdateState = {
  status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'error'
  currentVersion: string
  latestVersion: string | null
  checkedAt: string | null
  manifestUrl: string
  releaseUrl: string
  error: string | null
}

function formatStatus(state: UpdateState | null): string {
  if (!state) return 'Not checked yet.'
  switch (state.status) {
    case 'checking':
      return 'Checking for updates...'
    case 'update_available':
      return `Update available: ${state.latestVersion || 'new version'}`
    case 'up_to_date':
      return 'You are on the latest version.'
    case 'error':
      return `Check failed: ${state.error || 'Unknown error'}`
    default:
      return 'Not checked yet.'
  }
}

async function loadAppVersion(rina: any): Promise<string> {
  try {
    return (await rina?.appVersion?.()) || '—'
  } catch {
    return '—'
  }
}

async function loadUpdateState(rina: any): Promise<UpdateState | null> {
  try {
    return (await rina?.updateState?.()) || null
  } catch {
    return null
  }
}

function toErrorUpdateState(version: string, error: unknown): UpdateState {
  return {
    status: 'error',
    currentVersion: version,
    latestVersion: null,
    checkedAt: new Date().toISOString(),
    manifestUrl: '',
    releaseUrl: 'https://www.rinawarptech.com/account/',
    error: error instanceof Error ? error.message : 'Failed to check updates',
  }
}

export async function mountAboutPanel(container: HTMLElement): Promise<void> {
  const rina = getRina()
  const version = await loadAppVersion(rina)
  let updateState = await loadUpdateState(rina)

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>About</h2>
      <p class="rw-sub">RinaWarp Terminal Pro</p>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div class="rw-label">Version</div>
        <div class="rw-pill">${String(version)}</div>
      </div>
      <div class="rw-row">
        <div class="rw-muted">
          Built to feel fast, safe, and fun. ✨
        </div>
      </div>
    </div>
    <div class="rw-card rw-flex rw-gap">
      <div class="rw-row rw-space">
        <div class="rw-label">Updates</div>
        <div id="rw-update-status" class="rw-muted">${formatStatus(updateState)}</div>
      </div>
      <div class="rw-row rw-gap">
        <button id="rw-update-check" class="rw-btn">Check Now</button>
        <button id="rw-update-download" class="rw-btn rw-btn-ghost">Open Download</button>
      </div>
      <div class="rw-row">
        <div id="rw-update-meta" class="rw-muted"></div>
      </div>
    </div>
  `

  const statusEl = container.querySelector<HTMLElement>('#rw-update-status')
  const metaEl = container.querySelector<HTMLElement>('#rw-update-meta')
  const checkBtn = container.querySelector<HTMLButtonElement>('#rw-update-check')
  const downloadBtn = container.querySelector<HTMLButtonElement>('#rw-update-download')
  if (!statusEl || !metaEl || !checkBtn || !downloadBtn) return

  const renderUpdateState = (state: UpdateState | null) => {
    statusEl.textContent = formatStatus(state)
    const checkedAt = state?.checkedAt ? new Date(state.checkedAt).toLocaleString() : 'never'
    metaEl.textContent = `Last checked: ${checkedAt}`
    downloadBtn.disabled = state?.status !== 'update_available'
  }

  renderUpdateState(updateState)

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true
    statusEl.textContent = 'Checking for updates...'
    try {
      const next = (await rina?.checkForUpdate?.()) as UpdateState | undefined
      updateState = next || null
    } catch (error) {
      updateState = toErrorUpdateState(version, error)
    } finally {
      renderUpdateState(updateState)
      checkBtn.disabled = false
    }
  })

  downloadBtn.addEventListener('click', async () => {
    try {
      await rina?.openUpdateDownload?.()
    } catch {
      statusEl.textContent = 'Could not open download page.'
    }
  })
}

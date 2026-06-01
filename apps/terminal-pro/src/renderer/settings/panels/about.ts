import { buildAboutPanelModel, formatAboutUpdateStatus, type AboutUpdateState } from './aboutModel.js'
import { renderAboutPanel } from './aboutSurface.js'

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

async function loadAppVersion(rina: any): Promise<string> {
  try {
    return (await rina?.appVersion?.()) || '—'
  } catch {
    return '—'
  }
}

async function loadUpdateState(rina: any): Promise<AboutUpdateState | null> {
  try {
    return (await rina?.updateState?.()) || null
  } catch {
    return null
  }
}

function toErrorUpdateState(version: string, error: unknown): AboutUpdateState {
  return {
    status: 'error',
    currentVersion: version,
    latestVersion: null,
    checkedAt: new Date().toISOString(),
    manifestUrl: '',
    releaseUrl: 'https://rinawarptech.com/account/',
    error: error instanceof Error ? error.message : 'Failed to check updates',
    downloadProgress: null,
    downloadedAt: null,
    supported: false,
    installReady: false,
    channel: 'stable',
  }
}

export async function mountAboutPanel(container: HTMLElement): Promise<void> {
  const rina = getRina()
  const version = await loadAppVersion(rina)
  let updateState = await loadUpdateState(rina)

  container.innerHTML = renderAboutPanel(version, updateState)

  const statusEl = container.querySelector<HTMLElement>('#rw-update-status')
  const metaEl = container.querySelector<HTMLElement>('#rw-update-meta')
  const checkBtn = container.querySelector<HTMLButtonElement>('#rw-update-check')
  const downloadBtn = container.querySelector<HTMLButtonElement>('#rw-update-download')
  const installBtn = container.querySelector<HTMLButtonElement>('#rw-update-install')
  const copyBtn = container.querySelector<HTMLButtonElement>('#rw-copy-version-info')
  const copyStatus = container.querySelector<HTMLElement>('#rw-copy-version-status')
  if (!statusEl || !metaEl || !checkBtn || !downloadBtn || !installBtn || !copyBtn || !copyStatus) return

  const renderUpdateState = (state: AboutUpdateState | null) => {
    const model = buildAboutPanelModel(version, state)
    statusEl.textContent = formatAboutUpdateStatus(state)
    metaEl.textContent = `Last checked: ${model.lastCheckedLabel}`
    downloadBtn.disabled = !model.canOpenDownload
    installBtn.disabled = !model.canInstall
  }

  renderUpdateState(updateState)

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true
    statusEl.textContent = 'Checking for updates...'
    try {
      const next = (await rina?.checkForUpdate?.()) as AboutUpdateState | undefined
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
      const result = await rina?.downloadUpdate?.()
      if (result && result.ok === false) {
        const fallback = await rina?.openUpdateDownload?.()
        statusEl.textContent = fallback?.ok ? 'Opened the update download.' : result.error || 'Could not start update download.'
      } else {
        statusEl.textContent = 'Download started.'
      }
    } catch {
      statusEl.textContent = 'Could not open download page.'
    }
  })

  installBtn.addEventListener('click', async () => {
    try {
      const result = await rina?.installUpdate?.()
      statusEl.textContent = result?.ok ? 'Installing update and restarting…' : result?.error || 'Install unavailable.'
    } catch {
      statusEl.textContent = 'Could not start the install.'
    }
  })

  copyBtn.addEventListener('click', async () => {
    const model = buildAboutPanelModel(version, updateState)
    const text = [`Version: ${model.version}`, `Platform: ${model.platform}`, `Channel: ${model.channel}`].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      copyStatus.textContent = 'Version info copied.'
    } catch {
      copyStatus.textContent = text
    }
  })
}

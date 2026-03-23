/**
 * Updates & Trust Settings Panel
 * Desktop trust + auto-update configuration and release verification.
 */

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

type UpdateConfig = {
  channel: 'stable' | 'beta' | 'nightly'
  autoCheck: boolean
  autoDownload: boolean
}

type ReleaseInfo = {
  version: string
  platform: string
  arch: string
  signatureOk: boolean | null
  checksumOk: boolean | null
  signedBy: string | null
  publishedAt: string | null
}

type UpdateState = {
  status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'downloading' | 'downloaded' | 'unsupported' | 'error'
  currentVersion: string
  latestVersion: string | null
  checkedAt: string | null
  manifestUrl: string
  releaseUrl: string
  error: string | null
  downloadProgress: number | null
  downloadedAt: string | null
  supported: boolean
  installReady: boolean
  channel: 'stable' | 'beta' | 'nightly'
}

function renderUpdateConfig(config: UpdateConfig): string {
  const channel = config?.channel || 'stable'
  const autoCheck = config?.autoCheck ?? true
  const autoDownload = config?.autoDownload ?? false

  return `
    <div class="rw-panel-section">
      <h3>Update Channel</h3>
      <div class="rw-radio-group">
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="stable" ${channel === 'stable' ? 'checked' : ''}>
          <span>Stable (Recommended)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="beta" ${channel === 'beta' ? 'checked' : ''}>
          <span>Beta (Manual preview)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="nightly" ${channel === 'nightly' ? 'checked' : ''}>
          <span>Nightly (Manual preview)</span>
        </label>
      </div>
    </div>

    <div class="rw-panel-section">
      <h3>Auto-Update</h3>
      <div class="rw-kv"><div class="rw-k">Auto-check for updates</div><div class="rw-v"><input type="checkbox" id="rw-update-auto-check" ${autoCheck ? 'checked' : ''}></div></div>
      <div class="rw-kv"><div class="rw-k">Auto-download updates</div><div class="rw-v"><input type="checkbox" id="rw-update-auto-download" ${autoDownload ? 'checked' : ''}></div></div>
    </div>
  `
}

function renderReleaseInfo(info: ReleaseInfo | null): string {
  if (!info) {
    return `<div class="rw-muted">No release info available.</div>`
  }

  const sigBadge =
    info.signatureOk === true
      ? `<span class="rw-badge rw-ok">Verified</span>`
      : info.signatureOk === false
        ? `<span class="rw-badge rw-bad">Invalid</span>`
        : `<span class="rw-badge rw-muted">Managed by release flow</span>`

  const sumBadge =
    info.checksumOk === true
      ? `<span class="rw-badge rw-ok">OK</span>`
      : info.checksumOk === false
        ? `<span class="rw-badge rw-bad">Mismatch</span>`
        : `<span class="rw-badge rw-muted">Published metadata</span>`

  const publishedDate = info.publishedAt ? new Date(info.publishedAt).toLocaleDateString() : 'Unknown'

  return `
    <div class="rw-panel-section">
      <h3>Current Release</h3>
      <div class="rw-kv"><div class="rw-k">Version</div><div class="rw-v">${esc(info.version)}</div></div>
      <div class="rw-kv"><div class="rw-k">Platform</div><div class="rw-v">${esc(info.platform)} / ${esc(info.arch)}</div></div>
      <div class="rw-kv"><div class="rw-k">Published</div><div class="rw-v">${publishedDate}</div></div>
    </div>

    <div class="rw-panel-section">
      <h3>Trust & Verification</h3>
      <div class="rw-kv"><div class="rw-k">Installer trust</div><div class="rw-v">${sigBadge}</div></div>
      <div class="rw-kv"><div class="rw-k">Release metadata</div><div class="rw-v">${sumBadge}</div></div>
      ${info.signedBy ? `<div class="rw-kv"><div class="rw-k">Verification path</div><div class="rw-v">${esc(info.signedBy)}</div></div>` : ''}
    </div>
  `
}

function renderRuntimeState(state: UpdateState | null): string {
  if (!state) {
    return `<div class="rw-panel-section"><div class="rw-muted">Not checked yet.</div></div>`
  }

  const statusLabel =
    state.status === 'downloaded'
      ? 'Ready to install'
      : state.status === 'downloading'
        ? 'Downloading'
        : state.status === 'unsupported'
          ? 'Manual update only'
          : state.status.replaceAll('_', ' ')

  const progress =
    state.status === 'downloading' && state.downloadProgress !== null
      ? `<div class="rw-kv"><div class="rw-k">Download</div><div class="rw-v">${Math.round(state.downloadProgress)}%</div></div>`
      : ''

  return `
    <div class="rw-panel-section">
      <h3>Runtime Status</h3>
      <div class="rw-kv"><div class="rw-k">Status</div><div class="rw-v">${esc(statusLabel)}</div></div>
      <div class="rw-kv"><div class="rw-k">Channel</div><div class="rw-v">${esc(state.channel)}</div></div>
      <div class="rw-kv"><div class="rw-k">Auto updates</div><div class="rw-v">${state.supported ? 'Supported on this install' : 'Manual download on this install'}</div></div>
      <div class="rw-kv"><div class="rw-k">Current version</div><div class="rw-v">${esc(state.currentVersion)}</div></div>
      <div class="rw-kv"><div class="rw-k">Latest version</div><div class="rw-v">${esc(state.latestVersion || '—')}</div></div>
      <div class="rw-kv"><div class="rw-k">Last checked</div><div class="rw-v">${state.checkedAt ? new Date(state.checkedAt).toLocaleString() : 'Never'}</div></div>
      ${progress}
      ${state.error ? `<div class="rw-kv"><div class="rw-k">Note</div><div class="rw-v">${esc(state.error)}</div></div>` : ''}
    </div>
  `
}

export async function mountUpdatesPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Updates & Trust</h2>
      <p class="rw-sub">Configure automatic updates where supported and keep the release story honest.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-gap">
        <button id="rw-updates-check" class="rw-btn">Check for Updates</button>
        <button id="rw-updates-install" class="rw-btn rw-btn-primary" disabled>Install & Restart</button>
        <button id="rw-updates-verify" class="rw-btn rw-btn-ghost">Verify Release</button>
        <button id="rw-updates-save" class="rw-btn">Save Settings</button>
        <div id="rw-updates-status" class="rw-muted"></div>
      </div>

      <div id="rw-updates-config"></div>
      <div id="rw-updates-runtime"></div>
      <div id="rw-updates-release"></div>
    </div>

    <div class="rw-card">
      <h3>How Updates Work</h3>
      <div class="rw-prose">
        <p>RinaWarp Terminal Pro supports real in-app updates on the install types we can prove today:</p>
        <ul>
          <li><strong>Windows NSIS</strong>: check, download, and install from the app</li>
          <li><strong>Linux AppImage</strong>: check, download, and apply on restart</li>
          <li><strong>Linux .deb</strong>: manual/package-manager update path</li>
          <li><strong>Beta / Nightly</strong>: preview channels still use manual download until their release feeds are promoted</li>
        </ul>
        <p>The release site publishes public manifests and checksums so the app and the website point to the same artifact truth.</p>
      </div>
    </div>
  `

  const rina = getRina()
  const checkBtn = container.querySelector<HTMLButtonElement>('#rw-updates-check')
  const installBtn = container.querySelector<HTMLButtonElement>('#rw-updates-install')
  const verifyBtn = container.querySelector<HTMLButtonElement>('#rw-updates-verify')
  const saveBtn = container.querySelector<HTMLButtonElement>('#rw-updates-save')
  const statusEl = container.querySelector<HTMLElement>('#rw-updates-status')
  const configEl = container.querySelector<HTMLElement>('#rw-updates-config')
  const runtimeEl = container.querySelector<HTMLElement>('#rw-updates-runtime')
  const releaseEl = container.querySelector<HTMLElement>('#rw-updates-release')

  if (!checkBtn || !installBtn || !verifyBtn || !saveBtn || !statusEl || !configEl || !runtimeEl || !releaseEl) {
    return
  }

  let currentConfig: UpdateConfig = { channel: 'stable', autoCheck: true, autoDownload: false }
  let releaseInfo: ReleaseInfo | null = null
  let updateState: UpdateState | null = null

  const syncRuntime = () => {
    runtimeEl.innerHTML = renderRuntimeState(updateState)
    installBtn.disabled = !updateState?.installReady
  }

  const loadConfig = async () => {
    try {
      if (rina?.updateConfig) {
        currentConfig = await rina.updateConfig()
      }
    } catch {
      // Use defaults
    }
    configEl.innerHTML = renderUpdateConfig(currentConfig)
  }

  const loadReleaseInfo = async () => {
    try {
      if (rina?.releaseInfo) {
        releaseInfo = await rina.releaseInfo()
      } else {
        const version = (await rina?.appVersion?.()) || 'unknown'
        releaseInfo = {
          version,
          platform: navigator.platform,
          arch: navigator.userAgent,
          signatureOk: null,
          checksumOk: null,
          signedBy: null,
          publishedAt: null,
        }
      }
    } catch {
      releaseInfo = null
    }
    releaseEl.innerHTML = renderReleaseInfo(releaseInfo)
  }

  const loadUpdateState = async () => {
    try {
      if (rina?.updateState) {
        updateState = await rina.updateState()
      }
    } catch {
      updateState = null
    }
    syncRuntime()
  }

  const saveConfig = async () => {
    const channelEl = container.querySelector<HTMLInputElement>('input[name="updateChannel"]:checked')
    const autoCheckEl = container.querySelector<HTMLInputElement>('#rw-update-auto-check')
    const autoDownloadEl = container.querySelector<HTMLInputElement>('#rw-update-auto-download')

    const config: UpdateConfig = {
      channel: (channelEl?.value as UpdateConfig['channel']) || 'stable',
      autoCheck: autoCheckEl?.checked ?? true,
      autoDownload: autoDownloadEl?.checked ?? false,
    }

    try {
      if (rina?.setUpdateConfig) await rina.setUpdateConfig(config)
      currentConfig = config
      statusEl.textContent = 'Settings saved.'
      await loadUpdateState()
    } catch (e) {
      statusEl.textContent = `Save failed: ${String(e)}`
    }
  }

  const checkForUpdates = async () => {
    statusEl.textContent = 'Checking for updates...'
    checkBtn.disabled = true

    try {
      if (rina?.checkForUpdate) {
        updateState = (await rina.checkForUpdate()) as UpdateState
        syncRuntime()
        statusEl.textContent =
          updateState.status === 'downloaded'
            ? `Update downloaded: ${updateState.latestVersion || 'new version'}. Install when ready.`
            : updateState.status === 'downloading'
              ? `Downloading update: ${Math.round(updateState.downloadProgress || 0)}%`
              : updateState.status === 'update_available'
                ? `Update available: ${updateState.latestVersion || 'new version'}`
                : updateState.status === 'unsupported'
                  ? updateState.error || 'Automatic updates are not available on this install type.'
                  : updateState.status === 'error'
                    ? `Check failed: ${updateState.error || 'Unknown error'}`
                    : 'You are on the latest version.'
      } else {
        statusEl.textContent = 'Update API not available.'
      }
    } catch (e) {
      statusEl.textContent = `Check failed: ${String(e)}`
    } finally {
      checkBtn.disabled = false
    }
  }

  const verifyRelease = async () => {
    statusEl.textContent = 'Verifying release...'
    verifyBtn.disabled = true

    try {
      if (rina?.verifyRelease) {
        const result = await rina.verifyRelease()
        releaseInfo = {
          ...(releaseInfo || { version: 'unknown', platform: '', arch: '' }),
          signatureOk: result?.signatureOk ?? null,
          checksumOk: result?.checksumOk ?? null,
          signedBy: result?.signedBy ?? null,
          publishedAt: releaseInfo?.publishedAt ?? null,
        }
        releaseEl.innerHTML = renderReleaseInfo(releaseInfo)
        statusEl.textContent =
          result?.performed && result?.signatureOk === true
            ? 'Release verified successfully.'
            : result?.performed && result?.signatureOk === false
              ? 'Release verification failed.'
              : result?.error || 'Release verification is managed by the installer and published metadata.'
      } else {
        statusEl.textContent = 'Verify API not available.'
      }
    } catch (e) {
      statusEl.textContent = `Verify failed: ${String(e)}`
    } finally {
      verifyBtn.disabled = false
    }
  }

  const installUpdate = async () => {
    statusEl.textContent = 'Installing update...'
    installBtn.disabled = true

    try {
      if (rina?.installUpdate) {
        const result = await rina.installUpdate()
        statusEl.textContent = result?.ok
          ? 'Update install started. The app will restart to finish applying it.'
          : `Install unavailable: ${result?.error || 'Unknown error'}`
      } else {
        statusEl.textContent = 'Install API not available.'
      }
    } catch (e) {
      statusEl.textContent = `Install failed: ${String(e)}`
    } finally {
      await loadUpdateState()
    }
  }

  checkBtn.addEventListener('click', () => void checkForUpdates())
  installBtn.addEventListener('click', () => void installUpdate())
  verifyBtn.addEventListener('click', () => void verifyRelease())
  saveBtn.addEventListener('click', () => void saveConfig())

  await loadConfig()
  await loadUpdateState()
  await loadReleaseInfo()
}

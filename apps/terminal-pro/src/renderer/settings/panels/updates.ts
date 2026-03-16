/**
 * Updates & Trust Settings Panel
 * Desktop trust + auto-update configuration and release verification.
 */

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
}

type UpdateConfig = {
  channel: 'stable' | 'beta' | 'nightly'
  autoCheck: boolean
  autoDownload: boolean
}

type UpdateState = {
  status: 'idle' | 'checking' | 'up_to_date' | 'update_available' | 'error'
  currentVersion: string
  latestVersion: string | null
  checkedAt: string | null
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
          <span>Beta (Preview features)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="updateChannel" value="nightly" ${channel === 'nightly' ? 'checked' : ''}>
          <span>Nightly (Latest, less tested)</span>
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
        : `<span class="rw-badge rw-muted">Not verified</span>`

  const sumBadge =
    info.checksumOk === true
      ? `<span class="rw-badge rw-ok">OK</span>`
      : info.checksumOk === false
        ? `<span class="rw-badge rw-bad">Mismatch</span>`
        : `<span class="rw-badge rw-muted">Not verified</span>`

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
      <div class="rw-kv"><div class="rw-k">GPG Signature</div><div class="rw-v">${sigBadge}</div></div>
      <div class="rw-kv"><div class="rw-k">Checksum</div><div class="rw-v">${sumBadge}</div></div>
      ${info.signedBy ? `<div class="rw-kv"><div class="rw-k">Signed by</div><div class="rw-v">${esc(info.signedBy)}</div></div>` : ''}
    </div>
  `
}

export async function mountUpdatesPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Updates & Trust</h2>
      <p class="rw-sub">Configure auto-update behavior and verify release integrity.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-gap">
        <button id="rw-updates-check" class="rw-btn">Check for Updates</button>
        <button id="rw-updates-verify" class="rw-btn rw-btn-ghost">Verify Release</button>
        <button id="rw-updates-save" class="rw-btn rw-btn-primary">Save Settings</button>
        <div id="rw-updates-status" class="rw-muted"></div>
      </div>

      <div id="rw-updates-config"></div>
      <div id="rw-updates-release"></div>
    </div>

    <div class="rw-card">
      <h3>How Updates Work</h3>
      <div class="rw-prose">
        <p>RinaWarp uses secure update channels with cryptographic verification:</p>
        <ul>
          <li><strong>Stable</strong>: Fully tested releases, recommended for production</li>
          <li><strong>Beta</strong>: Pre-release features, may have bugs</li>
          <li><strong>Nightly</strong>: Latest development builds, least tested</li>
        </ul>
        <p>Every release is signed with GPG and includes SHA256 checksums for verification.</p>
      </div>
    </div>

    <div class="rw-card">
      <h3>Verify a Release</h3>
      <div class="rw-prose">
        <p>To manually verify a release:</p>
        <ol>
          <li>Download the release and signature (.asc) files</li>
          <li>Import the RinaWarp GPG key: <code>gpg --keyserver keyserver.ubuntu.com --recv-keys YOUR_KEY_ID</code></li>
          <li>Verify: <code>gpg --verify filename.asc filename</code></li>
          <li>Check checksum: <code>sha256sum -c SHASUMS256.txt</code></li>
        </ol>
        <p>Public keys are available at: <a href="https://www.rinawarptech.com/security" target="_blank">rinawarptech.com/security</a></p>
      </div>
    </div>
  `

  const rina = getRina()
  const checkBtn = container.querySelector<HTMLButtonElement>('#rw-updates-check')
  const verifyBtn = container.querySelector<HTMLButtonElement>('#rw-updates-verify')
  const saveBtn = container.querySelector<HTMLButtonElement>('#rw-updates-save')
  const statusEl = container.querySelector<HTMLElement>('#rw-updates-status')
  const configEl = container.querySelector<HTMLElement>('#rw-updates-config')
  const releaseEl = container.querySelector<HTMLElement>('#rw-updates-release')

  if (!checkBtn || !verifyBtn || !saveBtn || !statusEl || !configEl || !releaseEl) {
    return
  }

  let currentConfig: UpdateConfig = { channel: 'stable', autoCheck: true, autoDownload: false }
  let releaseInfo: ReleaseInfo | null = null

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
        // Build from available info
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
      if (rina?.setUpdateConfig) {
        await rina.setUpdateConfig(config)
      }
      currentConfig = config
      statusEl.textContent = 'Settings saved.'
    } catch (e) {
      statusEl.textContent = `Save failed: ${String(e)}`
    }
  }

  const checkForUpdates = async () => {
    statusEl.textContent = 'Checking for updates...'
    checkBtn.disabled = true

    try {
      if (rina?.checkForUpdate) {
        const result = await rina.checkForUpdate()
        statusEl.textContent = result?.updateAvailable
          ? `Update available: ${result.version}`
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
        statusEl.textContent = result?.signatureOk ? 'Release verified successfully.' : 'Release verification failed.'
      } else {
        statusEl.textContent = 'Verify API not available.'
      }
    } catch (e) {
      statusEl.textContent = `Verify failed: ${String(e)}`
    } finally {
      verifyBtn.disabled = false
    }
  }

  checkBtn.addEventListener('click', () => void checkForUpdates())
  verifyBtn.addEventListener('click', () => void verifyRelease())
  saveBtn.addEventListener('click', () => void saveConfig())

  // Initial load
  await loadConfig()
  await loadReleaseInfo()
}

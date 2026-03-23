/**
 * Updates & Trust Settings Panel
 * Desktop trust + auto-update configuration and release verification.
 */
import {
  renderReleaseInfo,
  renderRuntimeState,
  renderUpdateConfig,
  renderUpdatesPanelShell,
} from './updatesSurface.js'
import type { ReleaseInfo, UpdateConfig, UpdateState } from './updatesModel.js'

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

export async function mountUpdatesPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = renderUpdatesPanelShell()

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

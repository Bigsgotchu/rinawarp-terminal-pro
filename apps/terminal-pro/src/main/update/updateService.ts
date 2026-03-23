import type { App } from 'electron'
import type { shell } from 'electron'
import electronUpdater from 'electron-updater'

export type UpdateChannel = 'stable' | 'beta' | 'nightly'

export type UpdateConfig = {
  channel: UpdateChannel
  autoCheck: boolean
  autoDownload: boolean
}

export type UpdateState = {
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
  channel: UpdateChannel
}

export type ReleaseInfo = {
  version: string
  platform: string
  arch: string
  signatureOk: boolean | null
  checksumOk: boolean | null
  signedBy: string | null
  publishedAt: string | null
}

type ReleaseManifest = {
  version?: string
  pub_date?: string
}

type CreateUpdateServiceDeps = {
  app: App
  shell: Pick<typeof shell, 'openExternal'>
}

const SITE_BASE = 'https://rinawarptech.com'
const UPDATES_BASE = 'https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev'

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part))
  const rightParts = right.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part))
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index]
    const b = rightParts[index]
    if (a === undefined && b === undefined) return 0
    if (a === undefined) return -1
    if (b === undefined) return 1
    if (a === b) continue
    if (typeof a === 'number' && typeof b === 'number') return a > b ? 1 : -1
    return String(a).localeCompare(String(b))
  }
  return 0
}

function urlsForChannel(channel: UpdateChannel): { manifestUrl: string; feedUrl: string; releaseUrl: string } {
  if (channel === 'stable') {
    return {
      manifestUrl: `${UPDATES_BASE}/latest.json`,
      feedUrl: UPDATES_BASE,
      releaseUrl: `${SITE_BASE}/download`,
    }
  }
  return {
    manifestUrl: `${UPDATES_BASE}/${channel}/latest.json`,
    feedUrl: `${UPDATES_BASE}/${channel}`,
    releaseUrl: `${SITE_BASE}/download?channel=${channel}`,
  }
}

function linuxAutoUpdateSupported(): boolean {
  return Boolean(process.env.APPIMAGE)
}

function autoUpdateSupported(app: App): boolean {
  if (!app.isPackaged) return false
  if (process.platform === 'win32') return true
  if (process.platform === 'linux') return linuxAutoUpdateSupported()
  return false
}

export function createUpdateService(deps: CreateUpdateServiceDeps) {
  let config: UpdateConfig = {
    channel: 'stable',
    autoCheck: true,
    autoDownload: false,
  }

  let state: UpdateState = {
    status: autoUpdateSupported(deps.app) ? 'idle' : 'unsupported',
    currentVersion: deps.app.getVersion(),
    latestVersion: null,
    checkedAt: null,
    manifestUrl: `${UPDATES_BASE}/latest.json`,
    releaseUrl: `${SITE_BASE}/download`,
    error: autoUpdateSupported(deps.app)
      ? null
      : deps.app.isPackaged
        ? 'Automatic updates are available for Windows NSIS installs and Linux AppImage installs.'
        : 'Automatic updates are disabled in development builds.',
    downloadProgress: null,
    downloadedAt: null,
    supported: autoUpdateSupported(deps.app),
    installReady: false,
    channel: 'stable',
  }

  let cachedReleaseManifest: ReleaseManifest | null = null
  const updater = electronUpdater.autoUpdater

  updater.autoInstallOnAppQuit = true
  updater.allowDowngrade = false
  updater.disableWebInstaller = true
  updater.logger = console

  function refreshStaticState(): void {
    const urls = urlsForChannel(config.channel)
    state = {
      ...state,
      currentVersion: deps.app.getVersion(),
      manifestUrl: urls.manifestUrl,
      releaseUrl: urls.releaseUrl,
      supported: autoUpdateSupported(deps.app),
      channel: config.channel,
    }
  }

  function configureNativeUpdater(): void {
    const urls = urlsForChannel(config.channel)
    updater.autoDownload = config.autoDownload
    updater.allowPrerelease = config.channel !== 'stable'
    updater.setFeedURL({ provider: 'generic', url: urls.feedUrl })
  }

  async function fetchManifest(): Promise<ReleaseManifest | null> {
    refreshStaticState()
    try {
      const response = await fetch(state.manifestUrl, { headers: { Accept: 'application/json' } })
      if (!response.ok) return null
      const parsed = (await response.json()) as ReleaseManifest
      cachedReleaseManifest = parsed
      return parsed
    } catch {
      return null
    }
  }

  async function manualCheck(): Promise<UpdateState> {
    refreshStaticState()
    const manifest = await fetchManifest()
    const checkedAt = new Date().toISOString()
    if (!manifest?.version) {
      state = {
        ...state,
        status: state.supported ? 'error' : 'unsupported',
        checkedAt,
        error: state.supported
          ? 'Release manifest could not be loaded.'
          : state.error || 'Automatic updates are not available for this install type.',
      }
      return state
    }

    const latestVersion = String(manifest.version)
    const hasUpdate = compareVersions(latestVersion, deps.app.getVersion()) > 0
    state = {
      ...state,
      status: hasUpdate ? 'update_available' : state.supported ? 'up_to_date' : 'unsupported',
      latestVersion,
      checkedAt,
      error: state.supported ? null : state.error,
      installReady: false,
      downloadProgress: null,
      downloadedAt: null,
    }
    return state
  }

  updater.on('checking-for-update', () => {
    refreshStaticState()
    state = {
      ...state,
      status: 'checking',
      checkedAt: new Date().toISOString(),
      error: null,
      installReady: false,
    }
  })

  updater.on('update-available', (info) => {
    refreshStaticState()
    state = {
      ...state,
      status: config.autoDownload ? 'downloading' : 'update_available',
      latestVersion: info.version || state.latestVersion,
      checkedAt: new Date().toISOString(),
      error: null,
      downloadProgress: config.autoDownload ? 0 : null,
      installReady: false,
    }
  })

  updater.on('update-not-available', (info) => {
    refreshStaticState()
    state = {
      ...state,
      status: 'up_to_date',
      latestVersion: info.version || deps.app.getVersion(),
      checkedAt: new Date().toISOString(),
      error: null,
      downloadProgress: null,
      installReady: false,
    }
  })

  updater.on('download-progress', (progress) => {
    refreshStaticState()
    state = {
      ...state,
      status: 'downloading',
      downloadProgress: Number(progress.percent || 0),
      error: null,
      installReady: false,
    }
  })

  updater.on('update-downloaded', (info) => {
    refreshStaticState()
    state = {
      ...state,
      status: 'downloaded',
      latestVersion: info.version || state.latestVersion,
      checkedAt: new Date().toISOString(),
      downloadedAt: new Date().toISOString(),
      downloadProgress: 100,
      error: null,
      installReady: true,
    }
  })

  updater.on('error', (error) => {
    refreshStaticState()
    state = {
      ...state,
      status: 'error',
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      installReady: false,
    }
  })

  function getConfig(): UpdateConfig {
    return { ...config }
  }

  function setConfig(next: UpdateConfig): UpdateConfig {
    config = { ...next }
    refreshStaticState()
    if (state.supported && config.channel === 'stable') {
      configureNativeUpdater()
    }
    return getConfig()
  }

  function getState(): UpdateState {
    refreshStaticState()
    return { ...state }
  }

  async function checkForUpdate(): Promise<UpdateState> {
    refreshStaticState()

    if (config.channel !== 'stable') {
      return manualCheck()
    }

    if (!state.supported) {
      return manualCheck()
    }

    configureNativeUpdater()
    try {
      await updater.checkForUpdates()
      return getState()
    } catch (error) {
      state = {
        ...state,
        status: 'error',
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }
      return getState()
    }
  }

  async function openUpdateDownload(): Promise<{ ok: boolean; url: string; error?: string }> {
    refreshStaticState()
    try {
      await deps.shell.openExternal(state.releaseUrl)
      return { ok: true, url: state.releaseUrl }
    } catch (error) {
      return {
        ok: false,
        url: state.releaseUrl,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async function installUpdate(): Promise<{ ok: boolean; immediate: boolean; error?: string }> {
    if (!state.supported) {
      return { ok: false, immediate: false, error: state.error || 'Automatic install is not available for this install type.' }
    }
    if (!state.installReady) {
      return { ok: false, immediate: false, error: 'No downloaded update is ready to install yet.' }
    }
    try {
      updater.quitAndInstall(false, true)
      return { ok: true, immediate: true }
    } catch (error) {
      return { ok: false, immediate: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async function getReleaseInfo(): Promise<ReleaseInfo> {
    const manifest = cachedReleaseManifest || (await fetchManifest())
    return {
      version: deps.app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      signatureOk: null,
      checksumOk: null,
      signedBy: state.supported
        ? 'Automatic updates use signed platform installers plus published release metadata.'
        : 'Manual verification uses the published release metadata and checksums.',
      publishedAt: manifest?.pub_date || null,
    }
  }

  async function verifyRelease(): Promise<{
    ok: boolean
    performed: boolean
    degraded: boolean
    signatureOk: boolean | null
    checksumOk: boolean | null
    signedBy: string | null
    error?: string
  }> {
    return {
      ok: false,
      performed: false,
      degraded: true,
      signatureOk: null,
      checksumOk: null,
      signedBy: state.supported
        ? 'Verification is handled by the signed installer flow and published update metadata.'
        : 'This install type uses manual verification via the published release metadata.',
      error: 'Release verification details are informational only; no direct signature or checksum verification was performed in-app.',
    }
  }

  function scheduleStartupCheck(): void {
    if (!config.autoCheck) return
    setTimeout(() => {
      void checkForUpdate()
    }, 5000)
  }

  return {
    getConfig,
    setConfig,
    getState,
    checkForUpdate,
    openUpdateDownload,
    installUpdate,
    getReleaseInfo,
    verifyRelease,
    scheduleStartupCheck,
  }
}

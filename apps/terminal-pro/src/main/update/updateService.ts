import type { App } from 'electron'
import type { shell } from 'electron'
import electronUpdater from 'electron-updater'
import fs from 'node:fs'
import path from 'node:path'
import { getOperationalTelemetry, type OperationalTelemetryEvent } from '../telemetry/operationalTelemetry.js'

export type UpdateChannel = 'stable' | 'beta' | 'alpha'

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
  files?: {
    linux?: { path?: string }
    deb?: { path?: string }
    windows?: { path?: string }
  }
}

type ChannelReleaseInfo = {
  version: string
  url: string
  manifestUrl: string
  publishedAt: string | null
  downloads: {
    linux?: string
    deb?: string
    windows?: string
  }
}

type ReleaseChannelsManifest = Partial<Record<UpdateChannel, ChannelReleaseInfo>>

type CreateUpdateServiceDeps = {
  app: App
  shell: Pick<typeof shell, 'openExternal'>
}

const SITE_BASE = 'https://rinawarptech.com'
const UPDATES_BASE = 'https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases/latest/download'
const CHANNELS_MANIFEST_URL = `${SITE_BASE}/releases.json`

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
  return {
    manifestUrl: `${UPDATES_BASE}/latest.json`,
    feedUrl: UPDATES_BASE,
    releaseUrl: channel === 'stable' ? `${SITE_BASE}/download` : `${SITE_BASE}/download/?channel=${channel}`,
  }
}

function toAbsoluteSiteUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_BASE}/${path.replace(/^\/+/, '')}`
}

function pickPlatformDownload(info: ChannelReleaseInfo): string {
  if (process.platform === 'win32' && info.downloads.windows) return info.downloads.windows
  if (process.platform === 'linux') {
    if (linuxAutoUpdateSupported() && info.downloads.linux) return info.downloads.linux
    if (info.downloads.deb) return info.downloads.deb
    if (info.downloads.linux) return info.downloads.linux
  }
  return info.url
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
  let cachedChannelsManifest: ReleaseChannelsManifest | null = null
  const updater = electronUpdater.autoUpdater
  const successMarkerPath = path.join(deps.app.getPath('userData'), 'update-success-marker.json')

  function recordUpdateTelemetry(event: OperationalTelemetryEvent): void {
    const telemetry = getOperationalTelemetry()
    if (!telemetry) return
    void telemetry.recordCounter(event)
  }

  function recordUpdateSuccessIfMarked(): void {
    try {
      const raw = fs.readFileSync(successMarkerPath, 'utf8')
      const marker = JSON.parse(raw) as { targetVersion?: string }
      if (marker?.targetVersion === deps.app.getVersion()) {
        recordUpdateTelemetry('update_success')
        fs.rmSync(successMarkerPath, { force: true })
      }
    } catch {
      // Missing or malformed update markers should never block startup.
    }
  }

  function markPendingUpdateSuccess(): void {
    try {
      fs.writeFileSync(
        successMarkerPath,
        JSON.stringify({ targetVersion: state.latestVersion, requestedAt: new Date().toISOString() }, null, 2),
        'utf8'
      )
    } catch {
      // Operational telemetry must never block update installation.
    }
  }

  recordUpdateSuccessIfMarked()

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

  async function fetchChannelsManifest(): Promise<ReleaseChannelsManifest | null> {
    try {
      const response = await fetch(CHANNELS_MANIFEST_URL, { headers: { Accept: 'application/json' } })
      if (!response.ok) return null
      const parsed = (await response.json()) as ReleaseChannelsManifest
      cachedChannelsManifest = parsed
      return parsed
    } catch {
      return null
    }
  }

  async function getChannelRelease(channel: UpdateChannel): Promise<ChannelReleaseInfo | null> {
    const channels = cachedChannelsManifest || (await fetchChannelsManifest())
    return channels?.[channel] ?? null
  }

  async function manualCheck(): Promise<UpdateState> {
    refreshStaticState()
    const channelRelease = await getChannelRelease(config.channel)
    const checkedAt = new Date().toISOString()
    if (channelRelease?.version) {
      const latestVersion = String(channelRelease.version)
      const hasUpdate = compareVersions(latestVersion, deps.app.getVersion()) > 0
      state = {
        ...state,
        status: hasUpdate ? 'update_available' : state.supported ? 'up_to_date' : 'unsupported',
        latestVersion,
        checkedAt,
        manifestUrl: channelRelease.manifestUrl || state.manifestUrl,
        releaseUrl: pickPlatformDownload(channelRelease),
        error: state.supported ? null : state.error,
        installReady: false,
        downloadProgress: null,
        downloadedAt: null,
      }
      if (hasUpdate) recordUpdateTelemetry('update_available')
      return state
    }

    const manifest = await fetchManifest()
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
    if (hasUpdate) recordUpdateTelemetry('update_available')
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
    recordUpdateTelemetry('update_available')
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
    recordUpdateTelemetry('update_downloaded')
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
    recordUpdateTelemetry('update_check_started')
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

  async function downloadUpdate(): Promise<{ ok: boolean; state: UpdateState; error?: string }> {
    refreshStaticState()

    if (config.channel !== 'stable') {
      const result = await openUpdateDownload()
      return { ok: result.ok, state: getState(), error: result.error }
    }

    if (!state.supported) {
      return { ok: false, state: getState(), error: state.error || 'Automatic download is not available for this install type.' }
    }

    if (state.status !== 'update_available' && state.status !== 'downloading') {
      return { ok: false, state: getState(), error: 'No update is available to download yet.' }
    }

    try {
      state = {
        ...state,
        status: 'downloading',
        downloadProgress: state.downloadProgress ?? 0,
        error: null,
      }
      await updater.downloadUpdate()
      return { ok: true, state: getState() }
    } catch (error) {
      state = {
        ...state,
        status: 'error',
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }
      return { ok: false, state: getState(), error: state.error || 'Download failed.' }
    }
  }

  async function openUpdateDownload(): Promise<{ ok: boolean; url: string; error?: string }> {
    refreshStaticState()
    const channelRelease = await getChannelRelease(config.channel)
    const releaseUrl = channelRelease ? pickPlatformDownload(channelRelease) : state.releaseUrl
    try {
      await deps.shell.openExternal(releaseUrl)
      state = { ...state, releaseUrl }
      return { ok: true, url: releaseUrl }
    } catch (error) {
      return {
        ok: false,
        url: releaseUrl,
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
      recordUpdateTelemetry('update_restart_requested')
      markPendingUpdateSuccess()
      updater.quitAndInstall(false, true)
      return { ok: true, immediate: true }
    } catch (error) {
      return { ok: false, immediate: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async function getReleaseInfo(): Promise<ReleaseInfo> {
    const channelRelease = await getChannelRelease(config.channel)
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
      publishedAt: channelRelease?.publishedAt || manifest?.pub_date || null,
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
    downloadUpdate,
    openUpdateDownload,
    installUpdate,
    getReleaseInfo,
    verifyRelease,
    scheduleStartupCheck,
  }
}

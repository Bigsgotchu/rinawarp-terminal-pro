export type UpdateConfig = {
  channel: 'stable' | 'beta' | 'alpha'
  autoCheck: boolean
  autoDownload: boolean
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
  channel: 'stable' | 'beta' | 'alpha'
}

export type UpdatesConfigModel = {
  channel: UpdateConfig['channel']
  autoCheck: boolean
  autoDownload: boolean
}

export type UpdatesReleaseModel =
  | { state: 'empty' }
  | {
      state: 'ready'
      version: string
      platformLabel: string
      publishedLabel: string
      installerTrustLabel: string
      installerTrustTone: 'ok' | 'bad' | 'muted'
      releaseMetadataLabel: string
      releaseMetadataTone: 'ok' | 'bad' | 'muted'
      verificationPath?: string
    }

export type UpdatesRuntimeModel =
  | { state: 'empty' }
  | {
      state: 'ready'
      statusLabel: string
      channel: string
      autoUpdatesLabel: string
      currentVersion: string
      latestVersion: string
      lastChecked: string
      downloadLabel?: string
      note?: string
      installReady: boolean
    }

export function buildUpdatesConfigModel(config: UpdateConfig): UpdatesConfigModel {
  return {
    channel: config?.channel || 'stable',
    autoCheck: config?.autoCheck ?? true,
    autoDownload: config?.autoDownload ?? false,
  }
}

export function buildUpdatesReleaseModel(info: ReleaseInfo | null): UpdatesReleaseModel {
  if (!info) return { state: 'empty' }
  return {
    state: 'ready',
    version: info.version,
    platformLabel: `${info.platform} / ${info.arch}`,
    publishedLabel: info.publishedAt ? new Date(info.publishedAt).toLocaleDateString() : 'Unknown',
    installerTrustLabel:
      info.signatureOk === true ? 'Verified' : info.signatureOk === false ? 'Invalid' : 'Managed by release flow',
    installerTrustTone: info.signatureOk === true ? 'ok' : info.signatureOk === false ? 'bad' : 'muted',
    releaseMetadataLabel:
      info.checksumOk === true ? 'OK' : info.checksumOk === false ? 'Mismatch' : 'Published metadata',
    releaseMetadataTone: info.checksumOk === true ? 'ok' : info.checksumOk === false ? 'bad' : 'muted',
    verificationPath: info.signedBy || undefined,
  }
}

export function buildUpdatesRuntimeModel(state: UpdateState | null): UpdatesRuntimeModel {
  if (!state) return { state: 'empty' }
  const statusLabel =
    state.status === 'downloaded'
      ? 'Ready to install'
      : state.status === 'downloading'
        ? 'Downloading'
        : state.status === 'unsupported'
          ? 'Manual update only'
          : state.status.replaceAll('_', ' ')

  return {
    state: 'ready',
    statusLabel,
    channel: state.channel,
    autoUpdatesLabel: state.supported ? 'Supported on this install' : 'Manual download on this install',
    currentVersion: state.currentVersion,
    latestVersion: state.latestVersion || '—',
    lastChecked: state.checkedAt ? new Date(state.checkedAt).toLocaleString() : 'Never',
    downloadLabel:
      state.status === 'downloading' && state.downloadProgress !== null ? `${Math.round(state.downloadProgress)}%` : undefined,
    note: state.error || undefined,
    installReady: Boolean(state.installReady),
  }
}

export type AboutUpdateState = {
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

export type AboutPanelModel = {
  version: string
  productName: string
  productTagline: string
  updateStatusLabel: string
  lastCheckedLabel: string
  canOpenDownload: boolean
  canInstall: boolean
}

export function formatAboutUpdateStatus(state: AboutUpdateState | null): string {
  if (!state) return 'Not checked yet.'
  switch (state.status) {
    case 'checking':
      return 'Checking for updates...'
    case 'update_available':
      return `Update available: ${state.latestVersion || 'new version'}`
    case 'downloading':
      return `Downloading update: ${Math.round(state.downloadProgress || 0)}%`
    case 'downloaded':
      return `Update ready: ${state.latestVersion || 'new version'}`
    case 'unsupported':
      return state.error || 'This install uses manual updates.'
    case 'up_to_date':
      return 'You are on the latest version.'
    case 'error':
      return `Check failed: ${state.error || 'Unknown error'}`
    default:
      return 'Not checked yet.'
  }
}

export function buildAboutPanelModel(version: string, state: AboutUpdateState | null): AboutPanelModel {
  return {
    version: version || '\u2014',
    productName: 'RinaWarp Terminal Pro',
    productTagline: 'Agent-first desktop workflow with background execution and proof.',
    updateStatusLabel: formatAboutUpdateStatus(state),
    lastCheckedLabel: state?.checkedAt ? new Date(state.checkedAt).toLocaleString() : 'never',
    canOpenDownload: state?.status === 'update_available' || state?.status === 'unsupported',
    canInstall: Boolean(state?.installReady),
  }
}

type UpdateConfig = {
  channel?: 'stable' | 'beta' | 'alpha'
}

type RinaApi = {
  appVersion?: () => Promise<string>
  updateConfig?: () => Promise<UpdateConfig>
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

function formatVersion(version: string | null): string {
  const value = String(version || '').trim()
  if (!value) return 'vunknown'
  return value.startsWith('v') ? value : `v${value}`
}

export async function initOperationalChrome(): Promise<void> {
  const rina = (window as unknown as { rina?: RinaApi }).rina
  let version = 'unknown'
  let channel: UpdateConfig['channel'] = 'stable'

  try {
    version = (await rina?.appVersion?.()) || version
  } catch {
    version = 'unknown'
  }

  try {
    channel = (await rina?.updateConfig?.())?.channel || channel
  } catch {
    channel = 'stable'
  }

  setText('rw-chrome-version', formatVersion(version))
  setText('rw-chrome-channel', channel)
}

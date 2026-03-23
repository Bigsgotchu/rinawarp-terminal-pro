type FileRow = { exists?: boolean; sizeBytes?: number; path?: string; sha256?: string }

export type DiagnosticsRuntimeRow = {
  label: string
  value: string
}

export type DiagnosticsFileRow = {
  label: string
  exists: boolean
  sizeLabel: string
  path: string
  sha256: string
}

export type DiagnosticsPanelModel = {
  runtimeRows: DiagnosticsRuntimeRow[]
  fileRows: DiagnosticsFileRow[]
  notes: string[]
  rawJson: string
}

export function formatDiagnosticsBytes(n: number | null | undefined): string {
  if (!Number.isFinite(n as number)) return '—'
  const v = n as number
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let x = v
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024
    i += 1
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function toFileRow(label: string, rv: FileRow | undefined): DiagnosticsFileRow {
  return {
    label,
    exists: Boolean(rv?.exists),
    sizeLabel: formatDiagnosticsBytes(rv?.sizeBytes),
    path: String(rv?.path || ''),
    sha256: String(rv?.sha256 || '—'),
  }
}

export function buildDiagnosticsPanelModel(payload: any): DiagnosticsPanelModel {
  return {
    runtimeRows: [
      { label: 'Packaged', value: String(payload?.app?.isPackaged ?? '') },
      { label: 'Platform', value: String(payload?.app?.platform ?? '') },
      { label: 'Arch', value: String(payload?.app?.arch ?? '') },
      { label: 'AppPath', value: String(payload?.app?.appPath ?? '') },
      { label: 'Resources', value: String(payload?.app?.resourcesPath ?? '') },
      { label: 'CWD', value: String(payload?.app?.cwd ?? '') },
    ],
    fileRows: [
      toFileRow('Main', payload?.resolved?.main),
      toFileRow('Preload', payload?.resolved?.preload),
      toFileRow('Renderer', payload?.resolved?.renderer),
      toFileRow('Themes', payload?.resolved?.themeRegistry),
      toFileRow('Policy', payload?.resolved?.policyYaml),
    ],
    notes: Array.isArray(payload?.notes) ? payload.notes.map((note: unknown) => String(note)) : [],
    rawJson: JSON.stringify(payload, null, 2),
  }
}

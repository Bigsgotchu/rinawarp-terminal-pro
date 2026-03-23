type LegacyRendererFallbackOptions = {
  storage?: Pick<Storage, 'getItem'>
  documentElement?: Pick<HTMLElement, 'dataset'>
}

const STORAGE_KEY = 'rinawarp.legacyRendererFallback'

// Temporary emergency rollback only. If one stable release cycle passes without
// needing this switch for a blocker, delete the fallback entirely instead of
// carrying two renderer paths forward.

function normalizeFlag(value: string | null | undefined): boolean | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on', 'enabled', 'legacy'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off', 'disabled', 'modern'].includes(normalized)) return false
  return null
}

export function resolveLegacyRendererFallbackEnabled(options: LegacyRendererFallbackOptions = {}): boolean {
  const documentFlag = normalizeFlag(options.documentElement?.dataset?.rwLegacyRendererFallback)
  if (documentFlag !== null) return documentFlag

  try {
    const storedFlag = normalizeFlag(options.storage?.getItem(STORAGE_KEY))
    if (storedFlag !== null) return storedFlag
  } catch {
    // ignore storage access issues
  }

  return false
}

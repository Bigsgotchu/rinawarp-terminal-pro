type ThemeSpec = {
  id: string
  vars?: Record<string, string>
}

function applyThemeVars(vars: Record<string, string> | undefined): void {
  if (!vars) return
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    if (!key.startsWith('--rw-')) continue
    root.style.setProperty(key, String(value))
  }
}

export async function applySelectedThemeFromApi(): Promise<void> {
  const rina = window.rina
  if (!rina?.themesGet || !rina?.themesList) return

  try {
    const [{ id }, registry] = await Promise.all([rina.themesGet(), rina.themesList()])
    const theme = (registry?.themes || []).find((entry: ThemeSpec) => entry?.id === id)
    if (theme?.vars) {
      applyThemeVars(theme.vars)
    }
  } catch (error) {
    console.warn('[theme] failed to apply selected theme from API', error)
  }
}

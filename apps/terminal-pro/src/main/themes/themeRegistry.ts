import { createRequire } from 'node:module'
import path from 'node:path'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'
const require = createRequire(import.meta.url)
const electron = require('electron/main') as typeof import('electron')
const { app } = electron

type ThemeRegistry = {
  themes: Array<{
    id: string
    name: string
    group?: string
    vars: Record<string, string>
    terminal?: {
      background: string
      foreground: string
      cursor: string
      selection: string
      ansi: string[]
    }
  }>
}

type ThemeRegistryEntry = ThemeRegistry['themes'][number]

type ThemeRegistryDeps = {
  resolveResourcePath: (relPath: string, devBase: 'app' | 'repo') => string
  warnIfUnexpectedPackagedResource: (resourceName: string, resolvedPath: string) => void
  readJsonIfExists: (filePath: string) => any
  writeJsonFile: (filePath: string, value: unknown) => void
  setLastLoadedThemePath: (filePath: string | null) => void
}

const ALLOWED_THEME_VAR_KEYS = new Set([
  '--rw-bg',
  '--rw-panel',
  '--rw-border',
  '--rw-text',
  '--rw-muted',
  '--rw-accent',
  '--rw-accent2',
  '--rw-danger',
  '--rw-success',
])

const THEME_SELECTION_FILE = () => path.join(app.getPath('userData'), 'theme.json')
const CUSTOM_THEMES_FILE = () => path.join(app.getPath('userData'), 'themes.custom.json')

export function fallbackThemeRegistry(): ThemeRegistry {
  return {
    themes: [
      {
        id: 'mermaid-teal',
        name: 'Mermaid - Teal',
        group: 'Mermaid',
        vars: {
          '--rw-bg': '#061013',
          '--rw-panel': 'rgba(255,255,255,0.03)',
          '--rw-border': 'rgba(255,255,255,0.10)',
          '--rw-text': 'rgba(255,255,255,0.92)',
          '--rw-muted': 'rgba(255,255,255,0.68)',
          '--rw-accent': '#2de2e6',
          '--rw-accent2': '#7af3f5',
          '--rw-danger': '#ff4d6d',
          '--rw-success': '#3cffb5',
        },
        terminal: {
          background: '#061013',
          foreground: '#eaffff',
          cursor: '#2de2e6',
          selection: 'rgba(45, 226, 230, 0.18)',
          ansi: [
            '#07161a',
            '#ff4d6d',
            '#3cffb5',
            '#ffd166',
            '#61a0ff',
            '#b57bff',
            '#2de2e6',
            '#eaffff',
            '#23454f',
            '#ff7aa2',
            '#7bffd9',
            '#ffe199',
            '#92c0ff',
            '#d3a8ff',
            '#7af3f5',
            '#ffffff',
          ],
        },
      },
      {
        id: 'unicorn',
        name: 'Unicorn',
        group: 'Fantasy',
        vars: {
          '--rw-bg': '#070614',
          '--rw-panel': 'rgba(255,255,255,0.035)',
          '--rw-border': 'rgba(255,255,255,0.11)',
          '--rw-text': 'rgba(255,255,255,0.93)',
          '--rw-muted': 'rgba(255,255,255,0.70)',
          '--rw-accent': '#b57bff',
          '--rw-accent2': '#ff3bbf',
          '--rw-danger': '#ff4d6d',
          '--rw-success': '#3cffb5',
        },
        terminal: {
          background: '#070614',
          foreground: '#f7e9ff',
          cursor: '#ff3bbf',
          selection: 'rgba(181, 123, 255, 0.20)',
          ansi: [
            '#12102a',
            '#ff4d6d',
            '#3cffb5',
            '#ffd166',
            '#61a0ff',
            '#b57bff',
            '#ff3bbf',
            '#f7e9ff',
            '#3b2a4a',
            '#ff7aa2',
            '#7bffd9',
            '#ffe199',
            '#92c0ff',
            '#d3a8ff',
            '#ff7ad9',
            '#ffffff',
          ],
        },
      },
    ],
  }
}

function loadBaseThemeRegistry(deps: ThemeRegistryDeps): ThemeRegistry {
  const file = deps.resolveResourcePath('themes/themes.json', 'app')
  deps.warnIfUnexpectedPackagedResource('theme registry', file)
  const parsed = deps.readJsonIfExists(file)
  if (parsed?.themes?.length) {
    deps.setLastLoadedThemePath(file)
    return parsed
  }
  deps.setLastLoadedThemePath(null)
  return fallbackThemeRegistry()
}

function loadCustomThemeRegistry(deps: ThemeRegistryDeps): ThemeRegistry {
  return deps.readJsonIfExists(CUSTOM_THEMES_FILE()) ?? { themes: [] }
}

function loadThemeRegistryMerged(deps: ThemeRegistryDeps): ThemeRegistry {
  const base = loadBaseThemeRegistry(deps)
  const custom = loadCustomThemeRegistry(deps)
  const map = new Map()
  for (const theme of base.themes || []) map.set(theme.id, theme)
  for (const theme of custom.themes || []) map.set(theme.id, theme)
  return { themes: Array.from(map.values()) }
}

function loadSelectedThemeId(deps: ThemeRegistryDeps): string {
  const data = deps.readJsonIfExists(THEME_SELECTION_FILE())
  return data?.id || 'mermaid-teal'
}

function saveSelectedThemeId(deps: ThemeRegistryDeps, id: string): void {
  deps.writeJsonFile(THEME_SELECTION_FILE(), { id })
}

function saveCustomThemeRegistry(deps: ThemeRegistryDeps, registry: ThemeRegistry): void {
  deps.writeJsonFile(CUSTOM_THEMES_FILE(), registry)
}

function validateTheme(theme: any): { ok: true } | { ok: false; error: string } {
  if (!theme?.id || !/^[a-z0-9-]{3,64}$/i.test(theme.id)) return { ok: false, error: 'Invalid id' }
  if (!theme?.name || theme.name.length < 2) return { ok: false, error: 'Invalid name' }
  if (!theme?.vars || typeof theme.vars !== 'object') return { ok: false, error: 'Missing vars' }
  for (const key of Object.keys(theme.vars)) {
    if (!ALLOWED_THEME_VAR_KEYS.has(key)) return { ok: false, error: `Disallowed var: ${key}` }
    if (typeof theme.vars[key] !== 'string') return { ok: false, error: `Var not string: ${key}` }
  }
  if (theme.terminal) {
    if (!theme.terminal.background || !theme.terminal.foreground) {
      return { ok: false, error: 'Terminal bg/fg required' }
    }
    if (!Array.isArray(theme.terminal.ansi) || theme.terminal.ansi.length !== 16) {
      return { ok: false, error: 'Terminal ansi must have 16 colors' }
    }
  }
  return { ok: true }
}

export function registerThemeHandlers(ipcMain: IpcMain, deps: ThemeRegistryDeps): void {
  ipcMain.removeHandler('themes:list')
  ipcMain.handle('themes:list', async () => {
    try {
      return loadThemeRegistryMerged(deps)
    } catch (error) {
      console.error('[Themes] Failed to list themes:', error)
      return fallbackThemeRegistry()
    }
  })

  ipcMain.removeHandler('themes:get')
  ipcMain.handle('themes:get', async () => ({ id: loadSelectedThemeId(deps) }))

  ipcMain.removeHandler('themes:set')
  ipcMain.handle('themes:set', async (_event: IpcMainInvokeEvent, id: unknown) => {
    const themeId = String(id || '').trim()
    const registry = loadThemeRegistryMerged(deps)
    const exists = (registry?.themes || []).some((theme) => theme?.id === themeId)
    if (!themeId || !exists) {
      return { ok: false, error: 'Unknown theme' }
    }
    saveSelectedThemeId(deps, themeId)
    return { ok: true }
  })

  ipcMain.removeHandler('themes:custom:get')
  ipcMain.handle('themes:custom:get', async () => loadCustomThemeRegistry(deps))

  ipcMain.removeHandler('themes:custom:upsert')
  ipcMain.handle('themes:custom:upsert', async (_event: IpcMainInvokeEvent, theme: unknown) => {
    const candidate: ThemeRegistryEntry | null = theme && typeof theme === 'object' ? { ...(theme as Record<string, unknown>) } as ThemeRegistryEntry : null
    if (!candidate) {
      return { ok: false, error: 'Missing theme' }
    }
    const validation = validateTheme(candidate)
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }
    const custom = loadCustomThemeRegistry(deps)
    const nextThemes = (custom?.themes || []).filter((entry) => entry?.id !== candidate.id)
    nextThemes.push(candidate)
    saveCustomThemeRegistry(deps, { themes: nextThemes })
    return { ok: true }
  })

  ipcMain.removeHandler('themes:custom:delete')
  ipcMain.handle('themes:custom:delete', async (_event: IpcMainInvokeEvent, id: unknown) => {
    const themeId = String(id || '').trim()
    if (!themeId) {
      return { ok: false, error: 'Missing theme id' }
    }
    const custom = loadCustomThemeRegistry(deps)
    const nextThemes = (custom?.themes || []).filter((entry) => entry?.id !== themeId)
    saveCustomThemeRegistry(deps, { themes: nextThemes })
    return { ok: true }
  })
}

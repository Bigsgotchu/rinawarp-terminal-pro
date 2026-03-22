import { applyDensityToDocument, getStoredDensity, setStoredDensity } from './density.js'
import { applySkinToDocument, getStoredSkin } from './skins.js'
import type { Density, Skin } from './tokens.js'

export function initRendererThemeCompat(): void {
  const density = ensureDensity(getStoredDensity())
  const skin = getStoredSkin()
  applySkinToDocument(skin)
  syncSkinUi(skin)
  syncDensityUi(density)
}

export function getCurrentDensity(): Density {
  return (document.documentElement.getAttribute('data-density') as Density | null) ?? getStoredDensity()
}

export function setRendererDensity(value: Density): void {
  setStoredDensity(value)
  ensureDensity(value)
}

export function toggleRendererDensity(): Density {
  const current = getCurrentDensity()
  const next: Density = current === 'compact' ? 'comfortable' : 'compact'
  setRendererDensity(next)
  return next
}

function ensureDensity(force?: Density): Density {
  const density = force ?? getStoredDensity()
  applyDensityToDocument(density)
  syncDensityUi(density)
  return density
}

function syncSkinUi(value: Skin): void {
  const btn = document.querySelector<HTMLElement>('[data-action="toggle-skin"]')
  if (!btn) return
  btn.textContent = value === 'vscode' ? 'Skin: VS Code' : 'Skin: Default'
  btn.setAttribute('aria-pressed', String(value === 'vscode'))
}

function syncDensityUi(value: Density): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-action="toggle-density"]'))
  for (const btn of buttons) {
    btn.textContent = value === 'compact' ? 'Density: Compact' : 'Density: Comfortable'
    btn.setAttribute('aria-pressed', String(value === 'compact'))
  }
}

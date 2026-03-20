/**
 * Theme Controller
 *
 * Central controller for theme state management, persistence, and application.
 */

import { getStoredDensity, setStoredDensity, applyDensityToDocument } from './density.js'
import { getStoredSkin, setStoredSkin, applySkinToDocument } from './skins.js'
import { generateThemeCSS, injectThemeCSS } from './runtimeStyles.js'
import type { Density, Skin } from './tokens.js'

export class ThemeController {
  private currentDensity: Density
  private currentSkin: Skin

  constructor() {
    this.currentDensity = getStoredDensity()
    this.currentSkin = getStoredSkin()
  }

  get density(): Density {
    return this.currentDensity
  }

  get skin(): Skin {
    return this.currentSkin
  }

  applyTheme(): void {
    applyDensityToDocument(this.currentDensity)
    applySkinToDocument(this.currentSkin)
    const css = generateThemeCSS(this.currentDensity, this.currentSkin)
    injectThemeCSS(css)
  }

  setDensity(density: Density): void {
    if (density === this.currentDensity) return
    this.currentDensity = density
    setStoredDensity(density)
    this.applyTheme()
  }

  setSkin(skin: Skin): void {
    if (skin === this.currentSkin) return
    this.currentSkin = skin
    setStoredSkin(skin)
    this.applyTheme()
  }

  toggleDensity(): Density {
    const newDensity = this.currentDensity === 'compact' ? 'comfortable' : 'compact'
    this.setDensity(newDensity)
    return newDensity
  }
}
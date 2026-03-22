/**
 * Skin Management
 *
 * Handles skin settings (default/vscode) and persistence.
 */

import type { Skin } from './tokens.js'

const STORAGE_KEY = 'rinawarp-skin'
const LEGACY_STORAGE_KEY = 'rw-skin'

export function getStoredSkin(): Skin {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim() || localStorage.getItem(LEGACY_STORAGE_KEY)?.trim() || ''
    if (stored === 'default' || stored === 'legacy') {
      return 'default'
    }
    if (stored === 'vscode') {
      return 'vscode'
    }
  } catch (error) {
    console.warn('Failed to read skin from storage:', error)
  }
  return 'vscode'
}

export function setStoredSkin(skin: Skin): void {
  try {
    localStorage.setItem(STORAGE_KEY, skin)
    localStorage.setItem(LEGACY_STORAGE_KEY, skin === 'default' ? 'legacy' : skin)
  } catch (error) {
    console.warn('Failed to store skin:', error)
  }
}

export function applySkinToDocument(skin: Skin): void {
  document.documentElement.setAttribute('data-skin', skin)
}

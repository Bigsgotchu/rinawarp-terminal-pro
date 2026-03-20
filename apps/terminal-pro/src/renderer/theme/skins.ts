/**
 * Skin Management
 *
 * Handles skin settings (default/vscode) and persistence.
 */

import type { Skin } from './tokens.js'

const STORAGE_KEY = 'rinawarp-skin'

export function getStoredSkin(): Skin {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'default' || stored === 'vscode') {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read skin from storage:', error)
  }
  return 'default' // default
}

export function setStoredSkin(skin: Skin): void {
  try {
    localStorage.setItem(STORAGE_KEY, skin)
  } catch (error) {
    console.warn('Failed to store skin:', error)
  }
}

export function applySkinToDocument(skin: Skin): void {
  document.documentElement.setAttribute('data-skin', skin)
}
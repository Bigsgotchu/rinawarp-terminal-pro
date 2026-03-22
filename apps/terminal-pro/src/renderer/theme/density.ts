/**
 * Density Management
 *
 * Handles density settings (compact/comfortable) and persistence.
 */

import type { Density } from './tokens.js'

const STORAGE_KEY = 'rinawarp-density'
const LEGACY_STORAGE_KEY = 'rw-density'

export function getStoredDensity(): Density {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim() || localStorage.getItem(LEGACY_STORAGE_KEY)?.trim() || ''
    if (stored === 'compact' || stored === 'comfortable') {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read density from storage:', error)
  }
  return 'compact' // default
}

export function setStoredDensity(density: Density): void {
  try {
    localStorage.setItem(STORAGE_KEY, density)
    localStorage.setItem(LEGACY_STORAGE_KEY, density)
  } catch (error) {
    console.warn('Failed to store density:', error)
  }
}

export function applyDensityToDocument(density: Density): void {
  document.documentElement.setAttribute('data-density', density)
}

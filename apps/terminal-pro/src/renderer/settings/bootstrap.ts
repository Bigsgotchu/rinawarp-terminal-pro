import {
  initSettingsTabs,
  openSettings as openSettingsUi,
  closeSettings as closeSettingsUi,
  type SettingsTabsOptions,
  type SettingsTabId,
} from './tabs.js'
import { SETTINGS_TABS } from './settingsRegistry.js'
import { createSettingsShellModel } from './settingsShellModel.js'
import { renderSettingsShell } from './settingsShellSurface.js'

declare global {
  interface Window {
    __rinaSettings?: {
      open: (tabId?: SettingsTabId) => void
      close: () => void
      isOpen: () => boolean
    }
  }
}

function ensureSettingsHost(): HTMLElement {
  const shellMarkup = renderSettingsShell(createSettingsShellModel(SETTINGS_TABS))

  const existing = document.querySelector<HTMLElement>('#rw-settings')
  if (existing) {
    // If host already exists from static HTML, ensure expected shell is present.
    if (
      !existing.querySelector('#rw-settings-rail') ||
      !existing.querySelector('#rw-settings-content') ||
      !existing.querySelector('[data-settings-shell="true"]')
    ) {
      existing.innerHTML = shellMarkup
    }
    return existing
  }

  const host = document.createElement('div')
  host.id = 'rw-settings'
  host.innerHTML = shellMarkup
  document.body.appendChild(host)
  return host
}

function ensureSettingsOpenButton(): HTMLElement {
  const existing =
    document.querySelector<HTMLElement>('#rw-open-settings') ||
    document.querySelector<HTMLElement>('[data-action="open-settings"]')
  if (existing) {
    existing.hidden = true
    existing.setAttribute('aria-hidden', 'true')
    return existing
  }

  const btn = document.createElement('button')
  btn.id = 'rw-open-settings'
  btn.type = 'button'
  btn.className = 'rw-settings-fab'
  btn.title = 'Settings'
  btn.setAttribute('aria-label', 'Open Settings')
  btn.textContent = '⚙'
  btn.hidden = true
  btn.setAttribute('aria-hidden', 'true')
  document.body.appendChild(btn)
  return btn
}

export function initSettingsUi(): void {
  const root = ensureSettingsHost()
  const openBtn = ensureSettingsOpenButton()
  const rail = root.querySelector<HTMLElement>('#rw-settings-rail')
  const content = root.querySelector<HTMLElement>('#rw-settings-content')
  const closeBtn = root.querySelector<HTMLElement>('#rw-settings-close')
  if (!rail || !content) return

  const opts: SettingsTabsOptions = {
    root,
    rail,
    content,
    openButton: openBtn,
    closeButton: closeBtn,
    defaultTab: 'general',
    storageKey: 'rinawarp.settings.activeTab.v1',
  }

  const tabsApi = initSettingsTabs(
    SETTINGS_TABS,
    opts
  )

  const directOpen = (tabId?: SettingsTabId): void => {
    if (tabId) tabsApi.selectTab(tabId)
    root.removeAttribute('hidden')
    root.setAttribute('aria-hidden', 'false')
    root.classList.add('rw-settings-open')
    window.dispatchEvent(new CustomEvent('rina:settings-visibility', { detail: { open: true } }))
    const active =
      (tabId && rail.querySelector<HTMLElement>(`[data-settings-tab="${tabId}"]`)) ||
      rail.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ||
      rail.querySelector<HTMLElement>('[data-settings-tab]')
    active?.focus()
  }

  const directClose = (): void => {
    root.classList.remove('rw-settings-open')
    root.setAttribute('aria-hidden', 'true')
    root.setAttribute('hidden', '')
    window.dispatchEvent(new CustomEvent('rina:settings-visibility', { detail: { open: false } }))
  }

  if (openBtn && !openBtn.dataset.rwSettingsBound) {
    openBtn.dataset.rwSettingsBound = 'true'
    openBtn.onclick = () => directOpen()
  }

  if (closeBtn && !closeBtn.dataset.rwSettingsBound) {
    closeBtn.dataset.rwSettingsBound = 'true'
    closeBtn.onclick = () => directClose()
  }

  // Expose __rinaSettings API for palette integration
  window.__rinaSettings = {
    open: (tabId?: SettingsTabId) => {
      try {
        if (tabId) tabsApi.selectTab(tabId)
        openSettingsUi(opts, undefined)
      } catch {
        directOpen(tabId)
      }
      if (!root.classList.contains('rw-settings-open')) directOpen(tabId)
    },
    close: () => {
      try {
        closeSettingsUi(opts, undefined)
      } catch {
        directClose()
      }
      if (root.classList.contains('rw-settings-open')) directClose()
    },
    isOpen: () => root.classList.contains('rw-settings-open'),
  }

  openBtn.hidden = false
  openBtn.removeAttribute('aria-hidden')
}

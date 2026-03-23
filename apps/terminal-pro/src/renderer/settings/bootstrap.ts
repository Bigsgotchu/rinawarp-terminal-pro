import {
  initSettingsTabs,
  openSettings as openSettingsUi,
  closeSettings as closeSettingsUi,
  type SettingsTabsOptions,
  type SettingsTabId,
} from './tabs.js'
import { mountGeneralPanel } from './panels/general.js'
import { mountAccountPanel } from './panels/account.js'
import { mountTeamPanel } from './panels/team.js'
import { mountMemoryPanel } from './panels/memory.js'
import { mountThemesPanel } from './panels/themes.js'
import { mountDiagnosticsPanel } from './panels/diagnostics.js'
import { mountAboutPanel } from './panels/about.js'
import { mountLicensePanel } from './panels/license.js'
import { mountRetrievalPanel } from './panels/retrieval.js'
import { mountResearchPanel } from './panels/research.js'
import { mountUpdatesPanel } from './panels/updates.js'

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
  const shellMarkup = `
    <div class="rw-settings-shell">
      <div class="rw-settings-rail" id="rw-settings-rail"></div>
      <div class="rw-settings-body">
        <div class="rw-settings-top">
          <div class="rw-settings-title">Settings</div>
          <button type="button" class="rw-btn rw-btn-ghost" id="rw-settings-close">Close</button>
        </div>
        <div class="rw-settings-content" id="rw-settings-content"></div>
      </div>
    </div>
  `

  const existing = document.querySelector<HTMLElement>('#rw-settings')
  if (existing) {
    // If host already exists from static HTML, ensure expected shell is present.
    if (!existing.querySelector('#rw-settings-rail') || !existing.querySelector('#rw-settings-content')) {
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
    [
      { id: 'account', label: 'Account', icon: '👤', mount: (el: HTMLElement) => void mountAccountPanel(el) },
      { id: 'team', label: 'Team', icon: '👥', mount: (el: HTMLElement) => void mountTeamPanel(el) },
      { id: 'general', label: 'General', icon: '⚡', mount: (el: HTMLElement) => mountGeneralPanel(el) },
      { id: 'memory', label: 'Memory', icon: '🧠', mount: (el: HTMLElement) => void mountMemoryPanel(el) },
      { id: 'themes', label: 'Themes', icon: '🎨', mount: (el: HTMLElement) => void mountThemesPanel(el) },
      { id: 'retrieval', label: 'Retrieval', icon: '🔍', mount: (el: HTMLElement) => void mountRetrievalPanel(el) },
      { id: 'research', label: 'Research', icon: '🌐', mount: (el: HTMLElement) => void mountResearchPanel(el) },
      { id: 'updates', label: 'Updates', icon: '🔄', mount: (el: HTMLElement) => void mountUpdatesPanel(el) },
      { id: 'license', label: 'License', icon: '🔑', mount: (el: HTMLElement) => void mountLicensePanel(el) },
      {
        id: 'diagnostics',
        label: 'Diagnostics',
        icon: '🧪',
        mount: (el: HTMLElement) => void mountDiagnosticsPanel(el),
      },
      { id: 'about', label: 'About', icon: 'ℹ️', mount: (el: HTMLElement) => void mountAboutPanel(el) },
    ],
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

import {
  initSettingsTabs,
  openSettings as openSettingsUi,
  closeSettings as closeSettingsUi,
  type SettingsTabsOptions,
  type SettingsTabId,
} from './tabs.js'
import { mountGeneralPanel } from './panels/general.js'
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
  if (existing) return existing

  const btn = document.createElement('button')
  btn.id = 'rw-open-settings'
  btn.type = 'button'
  btn.className = 'rw-settings-fab'
  btn.title = 'Settings'
  btn.setAttribute('aria-label', 'Open Settings')
  btn.textContent = '⚙'
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
      { id: 'general', label: 'General', icon: '⚡', mount: (el: HTMLElement) => mountGeneralPanel(el) },
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

  // Expose __rinaSettings API for palette integration
  window.__rinaSettings = {
    open: (tabId?: SettingsTabId) => {
      if (tabId) tabsApi.selectTab(tabId)
      openSettingsUi(opts, undefined)
    },
    close: () => closeSettingsUi(opts, undefined),
    isOpen: () => root.classList.contains('rw-settings-open'),
  }
}

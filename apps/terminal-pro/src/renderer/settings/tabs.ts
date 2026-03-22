/**
 * Warp-style Settings tabs (vertical rail) with keyboard navigation + persistence.
 * Hardened: IME-safe, editable-aware, single global listener, Cmd+, toggle.
 */

export type SettingsTabId =
  | 'account'
  | 'team'
  | 'general'
  | 'memory'
  | 'license'
  | 'themes'
  | 'diagnostics'
  | 'about'
  | 'retrieval'
  | 'research'
  | 'updates'

export type SettingsTab = {
  id: SettingsTabId
  label: string
  icon?: string
  mount: (container: HTMLElement) => void | Promise<void>
}

export type SettingsTabsOptions = {
  root: HTMLElement
  rail: HTMLElement
  content: HTMLElement
  closeButton?: HTMLElement | null
  openButton?: HTMLElement | null
  defaultTab?: SettingsTabId
  storageKey?: string
}

type InternalState = {
  tabs: SettingsTab[]
  selected: SettingsTabId
  mounted: Set<SettingsTabId>
  previousFocus: HTMLElement | null
  open: boolean
}

const DEFAULT_STORAGE_KEY = 'rinawarp.settings.activeTab.v1'

function shouldIgnoreKey(ev: KeyboardEvent): boolean {
  if (ev.defaultPrevented) return true
  if (ev.isComposing) return true
  return false
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return true
  }
  return Boolean(el.closest('[contenteditable="true"], [contenteditable=""], input, textarea, select'))
}

function clampIndex(i: number, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  return Math.max(0, Math.min(i, maxExclusive - 1))
}

function readStoredTab(storageKey: string): SettingsTabId | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    if (
      raw === 'account' ||
      raw === 'team' ||
      raw === 'general' ||
      raw === 'memory' ||
      raw === 'license' ||
      raw === 'themes' ||
      raw === 'diagnostics' ||
      raw === 'about' ||
      raw === 'retrieval' ||
      raw === 'research' ||
      raw === 'updates'
    )
      return raw
    return null
  } catch {
    return null
  }
}

function writeStoredTab(storageKey: string, id: SettingsTabId): void {
  try {
    localStorage.setItem(storageKey, id)
  } catch {
    // ignore
  }
}

function setHidden(el: HTMLElement, hidden: boolean): void {
  el.setAttribute('aria-hidden', hidden ? 'true' : 'false')
  if (hidden) {
    el.setAttribute('hidden', '')
  } else {
    el.removeAttribute('hidden')
  }
  el.style.display = hidden ? 'none' : ''
}

function ensureFocusable(el: HTMLElement): void {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
}

function findTabButton(rail: HTMLElement, id: SettingsTabId): HTMLElement | null {
  return rail.querySelector<HTMLElement>(`[data-settings-tab="${id}"]`)
}

function focusTabButton(rail: HTMLElement, id: SettingsTabId): void {
  const btn = findTabButton(rail, id)
  if (btn) btn.focus()
}

function qsa<T extends Element>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll(sel)) as T[]
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  return qsa<HTMLElement>(root, selector).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  )
}

function trapTabKey(ev: KeyboardEvent, root: HTMLElement): boolean {
  if (ev.key !== 'Tab') return false
  const focusable = getFocusableElements(root)
  if (focusable.length === 0) return false
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (!ev.shiftKey && active === last) {
    ev.preventDefault()
    first.focus()
    return true
  }
  if (ev.shiftKey && active === first) {
    ev.preventDefault()
    last.focus()
    return true
  }
  return false
}

async function mountTabOnce(state: InternalState, tabId: SettingsTabId, content: HTMLElement): Promise<void> {
  if (state.mounted.has(tabId)) return
  const tab = state.tabs.find((t) => t.id === tabId)
  if (!tab) return
  const panel = content.querySelector<HTMLElement>(`[data-settings-panel="${tabId}"]`)
  if (!panel) return
  await tab.mount(panel)
  state.mounted.add(tabId)
}

function updateTabButton(btn: HTMLElement, tabId: SettingsTabId, selectedId: SettingsTabId): void {
  const isActive = tabId === selectedId
  btn.setAttribute('aria-selected', isActive ? 'true' : 'false')
  btn.classList.toggle('rw-tab-active', isActive)
  btn.classList.toggle('rw-tab', true)
  btn.setAttribute('role', 'tab')
  btn.setAttribute('tabindex', isActive ? '0' : '-1')
}

function updatePanel(panel: HTMLElement, tabId: SettingsTabId, selectedId: SettingsTabId): void {
  const isActive = tabId === selectedId
  panel.setAttribute('role', 'tabpanel')
  panel.setAttribute('aria-labelledby', `rw-settings-tab-${tabId}`)
  setHidden(panel, !isActive)
}

function setSelected(state: InternalState, opts: SettingsTabsOptions, tabId: SettingsTabId): void {
  state.selected = tabId
  writeStoredTab(opts.storageKey || DEFAULT_STORAGE_KEY, tabId)

  for (const tab of state.tabs) {
    const btn = findTabButton(opts.rail, tab.id)
    if (btn) updateTabButton(btn, tab.id, tabId)
    const panel = opts.content.querySelector<HTMLElement>(`[data-settings-panel="${tab.id}"]`)
    if (panel) updatePanel(panel, tab.id, tabId)
  }

  void mountTabOnce(state, tabId, opts.content)
}

function handleRailKeydown(state: InternalState, opts: SettingsTabsOptions, ev: KeyboardEvent): void {
  const ids = state.tabs.map((t) => t.id)
  const currentIndex = Math.max(0, ids.indexOf(state.selected))

  const go = (nextIndex: number) => {
    const idx = clampIndex(nextIndex, ids.length)
    const next = ids[idx]
    setSelected(state, opts, next)
    focusTabButton(opts.rail, next)
  }

  switch (ev.key) {
    case 'ArrowUp':
      ev.preventDefault()
      go(currentIndex - 1)
      break
    case 'ArrowDown':
      ev.preventDefault()
      go(currentIndex + 1)
      break
    case 'Home':
      ev.preventDefault()
      go(0)
      break
    case 'End':
      ev.preventDefault()
      go(ids.length - 1)
      break
    case 'Enter':
    case ' ':
      ev.preventDefault()
      focusTabButton(opts.rail, state.selected)
      break
    default:
      break
  }
}

function renderRailButtons(tabs: SettingsTab[], rail: HTMLElement): void {
  if (rail.querySelector('[data-settings-tab]')) return
  rail.innerHTML = ''
  for (const tab of tabs) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.id = `rw-settings-tab-${tab.id}`
    btn.setAttribute('data-settings-tab', tab.id)
    btn.setAttribute('role', 'tab')
    btn.setAttribute('aria-selected', 'false')
    btn.className = 'rw-tab'
    btn.innerHTML = `<span class="rw-tab-ico" aria-hidden="true">${tab.icon || '•'}</span><span class="rw-tab-label">${tab.label}</span>`
    rail.appendChild(btn)
  }
}

function ensurePanels(tabs: SettingsTab[], content: HTMLElement): void {
  for (const tab of tabs) {
    let panel = content.querySelector<HTMLElement>(`[data-settings-panel="${tab.id}"]`)
    if (!panel) {
      panel = document.createElement('section')
      panel.setAttribute('data-settings-panel', tab.id)
      panel.className = 'rw-settings-panel'
      content.appendChild(panel)
    }
  }
}

function attachTabClickHandlers(
  tabs: SettingsTab[],
  rail: HTMLElement,
  ctx: { state: InternalState; opts: SettingsTabsOptions }
): void {
  for (const tab of tabs) {
    const btn = findTabButton(rail, tab.id)
    if (!btn) continue
    ensureFocusable(btn)
    btn.addEventListener('click', () => setSelected(ctx.state, ctx.opts, tab.id))
  }
}

export function openSettings(opts: SettingsTabsOptions, state?: InternalState): void {
  if (state) {
    state.open = true
    state.previousFocus = document.activeElement as HTMLElement | null
  }
  setHidden(opts.root, false)
  opts.root.classList.add('rw-settings-open')
  window.dispatchEvent(new CustomEvent('rina:settings-visibility', { detail: { open: true } }))
  const stored = readStoredTab(opts.storageKey || DEFAULT_STORAGE_KEY)
  const activeBtn = findTabButton(opts.rail, stored || opts.defaultTab || 'general')
  if (activeBtn) activeBtn.focus()
}

export function closeSettings(opts: SettingsTabsOptions, state?: InternalState): void {
  if (state) {
    state.open = false
  }
  opts.root.classList.remove('rw-settings-open')
  setHidden(opts.root, true)
  window.dispatchEvent(new CustomEvent('rina:settings-visibility', { detail: { open: false } }))
  if (state?.previousFocus && typeof state.previousFocus.focus === 'function') {
    state.previousFocus.focus()
    state.previousFocus = null
  }
}

export function initSettingsTabs(
  tabs: SettingsTab[],
  opts: SettingsTabsOptions
): { selectTab: (id: SettingsTabId) => void } {
  // Verify DOM exists first (handles HMR/dev reload edge cases)
  if (!opts.root || !opts.rail || !opts.content) {
    return { selectTab: () => {} }
  }

  // One-time guard to prevent double-registration
  if ((window as any).__rwSettingsBootstrapped) {
    return { selectTab: () => {} }
  }
  ;(window as any).__rwSettingsBootstrapped = true

  const storageKey = opts.storageKey || DEFAULT_STORAGE_KEY
  const stored = readStoredTab(storageKey)
  const initial = stored || opts.defaultTab || 'general'

  const state: InternalState = {
    tabs,
    selected: initial,
    mounted: new Set<SettingsTabId>(),
    previousFocus: null,
    open: false,
  }

  opts.root.setAttribute('role', 'dialog')
  opts.root.setAttribute('aria-label', 'Settings')
  opts.root.setAttribute('aria-modal', 'true')
  setHidden(opts.root, true)

  renderRailButtons(tabs, opts.rail)
  ensurePanels(tabs, opts.content)

  opts.rail.setAttribute('role', 'tablist')
  opts.rail.addEventListener('keydown', (ev) => handleRailKeydown(state, opts, ev))

  attachTabClickHandlers(tabs, opts.rail, { state, opts })

  if (opts.closeButton) {
    opts.closeButton.addEventListener('click', () => closeSettings(opts, state))
  }

  if (opts.openButton) {
    opts.openButton.addEventListener('click', () => openSettings(opts, state))
  }

  opts.root.addEventListener('click', (ev) => {
    if (ev.target === opts.root) closeSettings(opts, state)
  })

  // Single global keydown listener (capture) to avoid double-fire
  const onGlobalKeydown = (ev: KeyboardEvent): void => {
    if (shouldIgnoreKey(ev)) return

    const isOpenShortcut = (ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey && ev.key === ','
    if (!state.open && isOpenShortcut) {
      if (isEditableTarget(ev.target)) return
      ev.preventDefault()
      openSettings(opts, state)
      ev.stopPropagation()
      return
    }

    if (!state.open) return

    if (ev.key === 'Escape') {
      ev.preventDefault()
      closeSettings(opts, state)
      ev.stopPropagation()
      return
    }

    // Focus trap
    if (trapTabKey(ev, opts.root)) {
      ev.stopPropagation()
      return
    }
  }

  document.addEventListener('keydown', onGlobalKeydown, { capture: true })

  setSelected(state, opts, initial)

  return {
    selectTab: (id: SettingsTabId) => setSelected(state, opts, id),
  }
}

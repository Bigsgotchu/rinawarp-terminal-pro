import type {
  WorkbenchShellActionModel,
  WorkbenchShellActivityItemModel,
  WorkbenchShellFrameModel,
  WorkbenchShellPanelModel,
  WorkbenchShellTabModel,
} from './workbenchShellFrameModel.js'

function renderActivityItem(item: WorkbenchShellActivityItemModel): string {
  return `<button class="rw-activitybtn" data-tab="${item.tab}" data-shell-owned="true" data-shell-nav="${item.tab}" data-shell-source="shell_activitybar" type="button" aria-label="${item.ariaLabel}" title="${item.label}">
    <span class="rw-activitybtn-glyph" aria-hidden="true">${item.glyph}</span>
    <span class="rw-activitybtn-label">${item.label}</span>
  </button>`
}

function renderTab(tab: WorkbenchShellTabModel): string {
  const toneClass = tab.tone === 'primary' ? 'rw-workbench-tab-primary' : 'rw-workbench-tab-secondary'
  const activeClass = tab.active ? ' active' : ''
  return `<button class="rw-workbench-tab ${toneClass}${activeClass}" data-tab="${tab.id}" data-shell-owned="true" data-shell-nav="${tab.id}" data-shell-source="shell_topbar" type="button" aria-label="${tab.ariaLabel}">${tab.label}</button>`
}

function renderAction(action: WorkbenchShellActionModel): string {
  const toneClass = action.tone === 'primary' ? '' : ' rw-topbar-action-secondary'
  const idAttr = action.id ? ` id="${action.id}"` : ''
  const actionAttr = action.action ? ` data-action="${action.action}"` : ''
  const tabAttr = action.tab ? ` data-tab="${action.tab}"` : ''
  const shellNavAttr = action.tab ? ` data-shell-nav="${action.tab}"` : ''
  const hiddenAttr = action.hidden ? ' hidden aria-hidden="true"' : ''
  return `<button${idAttr} class="rw-topbar-action${toneClass}"${tabAttr}${actionAttr}${shellNavAttr} data-shell-owned="true" data-shell-source="shell_topbar" type="button" aria-label="${action.ariaLabel}"${hiddenAttr}>${action.label}</button>`
}

function renderPanelHead(panel: WorkbenchShellPanelModel): string {
  if (panel.title.length === 0 && panel.subtitle.length === 0) return ''
  const closeButton = panel.includeCloseButton === false
    ? ''
    : '<button class="rw-panel-close" data-close-drawer type="button" aria-label="Close inspector drawer">Close</button>'
  return `
    <div class="rw-panel-head">
      <div class="rw-panel-title-group">
        <span class="rw-panel-title">${panel.title}</span>
        <span class="rw-panel-subtitle">${panel.subtitle}</span>
      </div>
      ${closeButton}
      ${panel.extraHeadMarkup || ''}
    </div>
  `
}

function renderPanel(panel: WorkbenchShellPanelModel): string {
  const activeClass = panel.active ? ' active' : ''
  const extraClass = panel.className ? ` ${panel.className}` : ''
  const bodyMarkup = panel.bodyMarkup ?? (panel.bodyId ? `<div class="rw-panel-body" id="${panel.bodyId}"></div>` : '<div class="rw-panel-body"></div>')
  return `
    <section id="${panel.id}" class="rw-panel rw-view${activeClass}${extraClass}" data-view="${panel.view}">
      ${renderPanelHead(panel)}
      ${bodyMarkup}
    </section>
  `
}

function renderExtensionsCard(): string {
  return `
    <div class="rw-sidebar-section rw-sidebar-extensions" data-sidebar-section="extensions">
      <div class="rw-sidebar-section-title">Extensions</div>
      <div class="rw-sidebar-extension-card">
        <div class="rw-sidebar-extension-title">Extensions available</div>
        <div class="rw-sidebar-extension-copy">Discover tools, linters, and integrations to power your workflows.</div>
        <button
          class="rw-sidebar-extension-action"
          data-tab="marketplace"
          data-shell-owned="true"
          data-shell-nav="marketplace"
          data-shell-source="shell_extensions"
          type="button"
          aria-label="Browse Marketplace"
        >
          Browse Marketplace
        </button>
      </div>
    </div>
  `
}

export function renderWorkbenchShellFrame(model: WorkbenchShellFrameModel): string {
  const primaryActivityItems = model.activityItems.filter((item) => item.placement === 'primary')
  const footerActivityItems = model.activityItems.filter((item) => item.placement === 'footer')
  const primarySections = [...new Set(primaryActivityItems.map((item) => item.section || 'project'))]
  return `
    <div id="rw-app">
      <aside class="rw-activitybar" aria-label="Agent Shell activity">
        <div class="rw-sidebar-account">
          <div class="rw-activitybar-logo" aria-hidden="true">
            <span class="rw-activitybar-logo-mark">✦</span>
          </div>
          <div class="rw-sidebar-account-copy">
            <div class="rw-sidebar-account-title">Mermaid Auth</div>
            <div class="rw-sidebar-account-meta">Production Project</div>
          </div>
        </div>
        ${primarySections.map((section) => `
          <div class="rw-sidebar-section" data-sidebar-section="${section}">
            ${section === 'advanced' ? '<div class="rw-sidebar-section-title">Dev Mode</div>' : ''}
            ${primaryActivityItems.filter((item) => (item.section || 'project') === section).map(renderActivityItem).join('')}
          </div>
        `).join('')}
        ${renderExtensionsCard()}
        <div class="rw-activitybar-spacer"></div>
        <div class="rw-sidebar-status">
          <span class="status-dot"></span>
          <span>Sandboxed</span>
        </div>
        <div class="rw-sidebar-footer">
          ${footerActivityItems.map(renderActivityItem).join('')}
          <div class="rw-sidebar-user">
            <span class="rw-sidebar-user-avatar">R</span>
            <span>
              <strong>Rina</strong>
              <small>mermaid@rina.dev</small>
            </span>
          </div>
        </div>
      </aside>

      <main class="rw-workbench-shell">
        <header class="rw-workbench-topbar">
          <nav class="rw-workbench-tabs" aria-label="Agent Shell">
            ${renderTab(model.tabs[0])}
            ${model.tabs.slice(1).map(renderTab).join('')}
          </nav>
          <div class="rw-workbench-brand" aria-label="Application version">
            <div class="rw-workbench-brand-name">RinaWarp Terminal Pro</div>
            <div class="rw-workbench-brand-meta">
              <span id="rw-chrome-version">v...</span>
              <span aria-hidden="true">·</span>
              <span id="rw-chrome-channel">channel ...</span>
            </div>
          </div>
          <div class="rw-workbench-topbar-project">
            <button
id="workspace-picker"
               class="rw-topbar-project"
              data-pick-workspace="topbar"
              data-shell-project="true"
              data-shell-workspace="true"
              data-shell-owned="true"
              data-shell-source="shell_project"
              type="button"
              aria-label="Choose project"
              title="Choose project"
            >
              Choose project
            </button>
          </div>
          <div class="rw-workbench-topbar-actions">
            <span class="rw-runtime-pill"><span class="status-dot"></span>Rina ready</span>
            ${model.actions.map(renderAction).join('')}
          </div>
        </header>

        <section class="rw-workbench">
          <section class="rw-center">
            <section class="rw-center-stack">
              ${model.centerPanels.map(renderPanel).join('')}
            </section>
          </section>
          <aside class="rw-inspector">
            <aside class="rw-right-stack">
              ${model.rightPanels.map(renderPanel).join('')}
            </aside>
          </aside>
        </section>
      </main>
    </div>

    <div id="status-bar" class="rw-statusbar">
      <span class="rw-status-item">
        <span class="status-dot disconnected" id="autonomy-dot"></span>
        <span id="mode-status-bar">Mode: assist</span>
      </span>
      <span class="rw-status-item" id="project-status">Project: -</span>
      <span class="rw-status-item" id="activity-status">0 commands · 0 tools</span>
      <span class="rw-status-item rw-status-item-right" id="status-summary">Starting…</span>
    </div>

    <div id="command-palette" class="rw-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="palette-inner">
        <div class="palette-header">
          <input
            type="text"
            id="palette-input"
            class="rw-palette-input"
            placeholder="Quick actions: ask Rina or open an inspector…"
            autocomplete="off"
            spellcheck="false"
          >
        </div>
        <div class="suggestions" id="palette-results"></div>
        <div class="palette-footer">
          <span>Ctrl+K quick actions</span>
          <span>Enter ask Rina</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  `
}

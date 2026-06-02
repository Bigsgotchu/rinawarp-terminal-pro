export type WorkbenchShellTabModel = {
  id: string
  label: string
  ariaLabel: string
  tone: 'primary' | 'secondary'
  active?: boolean
}

export type WorkbenchShellActivityItemModel = {
  id: string
  label: string
  glyph: string
  ariaLabel: string
  tab: string
  placement: 'primary' | 'footer'
  section?: string
  meta?: string
}

export type WorkbenchShellActionModel = {
  id?: string
  action?: string
  tab?: string
  label: string
  ariaLabel: string
  tone: 'primary' | 'secondary'
  hidden?: boolean
}

export type WorkbenchShellPanelModel = {
  id: string
  view: string
  title: string
  subtitle: string
  bodyId?: string
  active?: boolean
  className?: string
  includeCloseButton?: boolean
  extraHeadMarkup?: string
  bodyMarkup?: string
}

export type WorkbenchShellFrameModel = {
  activityItems: WorkbenchShellActivityItemModel[]
  tabs: WorkbenchShellTabModel[]
  actions: WorkbenchShellActionModel[]
  centerPanels: WorkbenchShellPanelModel[]
  rightPanels: WorkbenchShellPanelModel[]
}

export function createWorkbenchShellFrameModel(): WorkbenchShellFrameModel {
  return {
    activityItems: [
      { id: 'agent', label: 'Agent', glyph: '✦', ariaLabel: 'Agent thread', tab: 'agent', placement: 'primary', section: 'workspace' },
      { id: 'history', label: 'History', glyph: '◷', ariaLabel: 'History', tab: 'runs', placement: 'primary', section: 'workspace' },
      { id: 'receipts', label: 'Receipts', glyph: '▤', ariaLabel: 'Receipts', tab: 'receipt', placement: 'primary', section: 'workspace' },
      { id: 'marketplace', label: 'Marketplace', glyph: '◇', ariaLabel: 'Marketplace', tab: 'marketplace', placement: 'primary', section: 'workspace' },
      { id: 'settings', label: 'Settings', glyph: '⚙', ariaLabel: 'Settings', tab: 'settings', placement: 'primary', section: 'workspace' },
      { id: 'build-release', label: 'Build & Release', glyph: '⌁', ariaLabel: 'Build and release', tab: 'code', placement: 'primary', section: 'favorites' },
      { id: 'security-audit', label: 'Security Audit', glyph: '◌', ariaLabel: 'Security audit', tab: 'diagnostics', placement: 'primary', section: 'favorites' },
      { id: 'database-migrate', label: 'Database Migrate', glyph: '⌑', ariaLabel: 'Database migrate', tab: 'brain', placement: 'primary', section: 'favorites' },
    ],
    tabs: [
      { id: 'agent', label: 'Rina', ariaLabel: 'Rina workbench', tone: 'primary', active: true },
      { id: 'runs', label: 'History', ariaLabel: 'Run history', tone: 'secondary' },
    ],
    actions: [
      { id: 'recovery-toggle', tab: 'runs', label: 'Recovered work', ariaLabel: 'Recovered work', tone: 'secondary', hidden: true },
      {
        action: 'open-updates',
        tab: 'settings',
        label: 'Updates',
        ariaLabel: 'Open update settings',
        tone: 'secondary',
      },
      {
        action: 'open-settings',
        tab: 'settings',
        label: '⚙ Settings',
        ariaLabel: 'Open settings',
        tone: 'primary',
      },
    ],
    centerPanels: [
      {
        id: 'panel-agent',
        view: 'agent',
        title: 'Agent Thread',
        subtitle: 'Thread ARTIFACTS',
        active: true,
        className: 'rw-agent-panel',
        includeCloseButton: false,
        bodyMarkup: `
          <div class="rw-panel-body rw-agent-body is-empty">
            <section class="rw-agent-launch-empty" data-agent-section="empty-state" aria-label="RinaWarp launch">
              <h1 class="rw-agent-launch-title">RinaWarp Terminal Pro</h1>
              <p class="rw-agent-launch-subtitle">What would you like me to do?</p>
            </section>
            <div id="agent-recovery"></div>
            <div id="agent-output"></div>
            <div id="agent-plan-container"></div>
            <div class="rw-agent-composer">
              <textarea
                id="agent-input"
                class="rw-agent-input"
                rows="3"
                placeholder="Ask Rina to fix, build, test, or explain..."
                data-testid="rina-chat-input"
                spellcheck="false"
              ></textarea>
              <div id="agent-starter-prompts" class="rw-agent-prompts"></div>
              <div class="rw-agent-composer-actions">
                <button class="rw-agent-tool-btn" type="button" data-agent-prompt="Run tests" data-intent-key="test">Run tests</button>
                <button class="rw-agent-tool-btn" type="button" data-agent-prompt="Build project" data-intent-key="build">Build project</button>
                <button class="rw-agent-tool-btn" type="button" data-agent-prompt="Fix project" data-intent-key="fix">Fix project</button>
                <button id="agent-send" class="rw-agent-send" type="button" data-testid="rina-chat-send">Send</button>
              </div>
            </div>
          </div>
        `,
      },
      {
        id: 'panel-code',
        view: 'code',
        title: 'Workspace Inspector',
        subtitle: 'Project files and code context when you want to inspect them',
        bodyId: 'workspace-files',
      },
      {
        id: 'panel-runs',
        view: 'runs',
        title: 'Runs Inspector',
        subtitle: 'Receipts, sessions, and proof when you want to inspect execution.',
        bodyId: 'runs-output',
      },
      {
        id: 'panel-receipt',
        view: 'receipt',
        title: 'Receipt Viewer',
        subtitle: 'Detailed proof of execution with commands, timestamps, and next actions.',
        bodyId: 'receipt-output',
      },
      {
        id: 'panel-marketplace',
        view: 'marketplace',
        title: 'Marketplace',
        subtitle: 'Capability packs and installable workflows when you need to expand what Rina can do',
        bodyId: 'marketplace-output',
      },
      {
        id: 'panel-brain',
        view: 'brain',
        title: 'Brain Inspector',
        subtitle: 'Planning, tools, memory, and results',
        bodyId: 'brain-visualization',
        extraHeadMarkup: '<div id="brain-stats" class="rw-brain-stats"></div>',
      },
    ],
    rightPanels: [
      {
        id: 'panel-execution-trace',
        view: 'execution-trace',
        title: 'Inspect',
        subtitle: 'Terminal',
        active: true,
        includeCloseButton: false,
        bodyMarkup: `
          <div class="rw-panel-body rw-execution-trace-body">
            <div id="thinking-stream" class="rw-stream-strip"></div>
            <div id="execution-trace-output"></div>
          </div>
        `,
        extraHeadMarkup: `
          <div class="rw-inspector-tabs" aria-label="Inspector views">
            <button class="active" type="button">Terminal</button>
            <button type="button">Logs</button>
            <button type="button">Proof</button>
          </div>
          <div id="thinking-indicator" class="rw-thinking" style="display:none;">
            <div class="rw-thinking-dots">
              <span class="rw-thinking-dot"></span>
              <span class="rw-thinking-dot"></span>
              <span class="rw-thinking-dot"></span>
            </div>
            <span>Rina is figuring it out</span>
          </div>
        `,
      },
      {
        id: 'panel-diagnostics',
        view: 'diagnostics',
        title: 'Diagnostics Inspector',
        subtitle: 'Open this drawer when you want health, status, and observability details.',
        bodyId: 'diagnostics-output',
      },
    ],
  }
}

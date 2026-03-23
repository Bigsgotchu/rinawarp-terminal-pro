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
      { id: 'agent', label: 'Agent', glyph: 'A', ariaLabel: 'Agent thread', tab: 'agent', placement: 'primary' },
      { id: 'runs', label: 'Runs', glyph: 'R', ariaLabel: 'Runs inspector', tab: 'runs', placement: 'primary' },
      { id: 'marketplace', label: 'Capabilities', glyph: 'C', ariaLabel: 'Capabilities', tab: 'marketplace', placement: 'primary' },
      { id: 'diagnostics', label: 'Diagnostics', glyph: 'D', ariaLabel: 'Diagnostics', tab: 'diagnostics', placement: 'primary' },
      { id: 'settings', label: 'Settings', glyph: 'S', ariaLabel: 'Settings', tab: 'settings', placement: 'footer' },
    ],
    tabs: [
      { id: 'agent', label: 'Agent', ariaLabel: 'Agent', tone: 'primary', active: true },
      { id: 'runs', label: 'Runs', ariaLabel: 'Runs Inspector', tone: 'secondary' },
    ],
    actions: [
      { id: 'recovery-toggle', tab: 'runs', label: 'Recovered runs', ariaLabel: 'Recovered runs', tone: 'secondary', hidden: true },
      { tab: 'marketplace', label: 'Capabilities', ariaLabel: 'Capabilities', tone: 'secondary' },
      { tab: 'diagnostics', label: 'Diagnostics', ariaLabel: 'Diagnostics', tone: 'secondary' },
      {
        action: 'open-settings',
        tab: 'settings',
        label: 'Settings',
        ariaLabel: 'Settings',
        tone: 'primary',
        hidden: true,
      },
    ],
    centerPanels: [
      {
        id: 'panel-execution-trace',
        view: 'execution-trace',
        title: 'Execution Trace',
        subtitle: 'Background-only execution stream. Rina uses this internally while the thread stays primary.',
        bodyId: 'execution-trace-output',
        bodyMarkup: '<div id="thinking-stream" class="rw-stream-strip"></div>',
        extraHeadMarkup: `
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
        id: 'panel-agent',
        view: 'agent',
        title: '',
        subtitle: '',
        active: true,
        className: 'rw-agent-panel',
        includeCloseButton: false,
        bodyMarkup: `
          <div class="rw-panel-body rw-agent-body">
            <section class="rw-agent-hero">
              <div class="rw-agent-hero-copy">
                <div class="rw-agent-kicker">Rina-first developer workflow</div>
                <h2>Tell Rina what to do. She can diagnose, build, test, deploy, and leave proof behind.</h2>
                <p>
                  Start with what feels off, what failed, or what you want to ship. Rina will explain the plan, take action through the trusted runner,
                  and keep proof attached to the thread when real work happens.
                </p>
              </div>
            </section>
            <div id="agent-recovery"></div>
            <div id="agent-output"></div>
            <div id="agent-plan-container"></div>
            <div class="rw-agent-composer">
              <textarea
                id="agent-input"
                class="rw-agent-input"
                rows="3"
                placeholder="Tell Rina what to do."
                spellcheck="false"
              ></textarea>
              <div id="agent-starter-prompts" class="rw-agent-prompts"></div>
              <div class="rw-agent-composer-actions">
                <div class="rw-agent-hint">Ask in plain language. Enter sends.</div>
                <button id="agent-send" class="rw-agent-send" type="button">Ask Rina</button>
              </div>
            </div>
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

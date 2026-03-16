/**
 * RinaWarp Terminal Pro - Production Renderer
 *
 * This module handles all DOM queries, event listeners, and panel logic
 * for the production build. It uses the window.rina API exposed via preload
 * to communicate with the main process.
 *
 * No inline scripts - all logic is in this module for CSP compliance.
 */

import { BasePanel } from './components/basePanel.js'

// ============================================================
// Type Definitions for window.rina API
// ============================================================

interface RinaWindow {
  rina: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    on: (channel: string, handler: (...args: unknown[]) => void) => () => void
    setMode: (mode: string) => Promise<{ ok: boolean; mode: string }>
    getMode: () => Promise<string>
    getStatus: () => Promise<unknown>
    getPlans: () => Promise<unknown[]>
    runAgent: (command: string) => Promise<unknown>
    getTools: () => Promise<unknown[]>
    getBrainStats: () => Promise<BrainStats>
    onBrainEvent: (cb: (event: BrainEvent) => void) => void
    onThinking: (cb: (step: ThinkingStep) => void) => void
    onStreamChunk: (cb: (evt: unknown) => void) => void
    onStreamEnd: (cb: (evt: unknown) => void) => void
    onPlanStepStart: (cb: (evt: unknown) => void) => void
    onPlanRunStart: (cb: (p: { planRunId: string }) => void) => void
    onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) => void
    onCustomEvent: (eventName: string, cb: (evt: unknown) => void) => void
    autonomy: { enabled: boolean; level: string }
  }
}

interface BrainStats {
  total: number
  intent: number
  planning: number
  reasoning: number
  tool: number
  memory: number
  action: number
  result: number
  error: number
}

interface BrainEvent {
  type: string
  message: string
  progress?: number
}

interface ThinkingStep {
  time: number
  message: string
}

declare const window: RinaWindow

// ============================================================
// Panel Classes extending BasePanel
// ============================================================

class TerminalPanel extends BasePanel {
  private inputElement: HTMLInputElement | null = null
  private outputElement: HTMLElement | null = null

  constructor(selector: string) {
    super(selector)
    this.inputElement = this.root.querySelector('#terminal-input')
    this.outputElement = this.root.querySelector('#terminal-output')

    if (this.inputElement) {
      this.inputElement.addEventListener('keydown', this.handleInput.bind(this))
    }
  }

  private async handleInput(e: KeyboardEvent): Promise<void> {
    if (e.key !== 'Enter' || !this.inputElement) return

    const command = this.inputElement.value.trim()
    if (!command) return

    // Display user command
    this.appendOutput(`$ ${command}`, 'user-command')
    this.inputElement.value = ''

    try {
      // Execute via Rina Controller
      const result = (await window.rina.runAgent(command)) as { text?: string; plan?: unknown }

      if (result.text) {
        this.appendOutput(result.text, 'response')
      }
    } catch (error) {
      this.appendOutput(`Error: ${error}`, 'error')
    }
  }

  appendOutput(output: string, className = ''): void {
    if (!this.outputElement) return

    const line = document.createElement('div')
    line.className = className
    line.textContent = output
    this.outputElement.appendChild(line)
    this.outputElement.scrollTop = this.outputElement.scrollHeight
  }
}

class AgentPanel extends BasePanel {
  constructor(selector: string) {
    super(selector)

    // Listen for agent step events
    window.rina.onPlanStepStart((step) => {
      this.showAgentStep(step)
    })

    window.rina.onPlanRunStart(({ planRunId }) => {
      this.appendContent(`<div class="agent-step start">Starting plan: ${planRunId}</div>`)
    })

    window.rina.onPlanRunEnd(({ planRunId, ok, haltedBecause }) => {
      const status = ok ? 'completed' : `halted: ${haltedBecause || 'unknown'}`
      this.appendContent(`<div class="agent-step end">Plan ${planRunId} ${status}</div>`)
    })
  }

  showAgentStep(step: unknown): void {
    const stepData = step as { stepIndex?: number; name?: string; status?: string }
    this.appendContent(`<div class="agent-step running">Step ${stepData.stepIndex}: ${stepData.name}</div>`)
  }
}

class CodePanel extends BasePanel {
  constructor(selector: string) {
    super(selector)
  }

  async refresh(): Promise<void> {
    try {
      const files = (await window.rina.invoke('rina:code:listFiles', { projectRoot: '.', limit: 100 })) as {
        ok: boolean
        files?: string[]
      }
      if (files.ok && files.files) {
        this.clearContent()
        files.files.forEach((file: string) => {
          this.appendContent(`<div class="code-file">${file}</div>`)
        })
      }
    } catch (error) {
      console.error('Failed to list files:', error)
    }
  }
}

class DiagnosticsPanel extends BasePanel {
  constructor(selector: string) {
    super(selector)
    this.updateStats()
  }

  async updateStats(): Promise<void> {
    try {
      const stats = (await window.rina.invoke('rina:getStatus')) as {
        mode?: string
        tools?: unknown[]
        agentRunning?: boolean
        memoryStats?: {
          conversationCount?: number
          learnedCommandsCount?: number
          projectsCount?: number
        }
      }

      const content = `
        <div class="stat-item">
          <span class="stat-label">Mode:</span>
          <span class="stat-value">${stats.mode || 'unknown'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Tools:</span>
          <span class="stat-value">${stats.tools?.length || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Agent Running:</span>
          <span class="stat-value">${stats.agentRunning ? 'Yes' : 'No'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Conversations:</span>
          <span class="stat-value">${stats.memoryStats?.conversationCount || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Learned Commands:</span>
          <span class="stat-value">${stats.memoryStats?.learnedCommandsCount || 0}</span>
        </div>
      `

      this.clearContent()
      this.appendContent(content)
    } catch (error) {
      console.error('Failed to update diagnostics:', error)
    }
  }
}

class BrainPanel extends BasePanel {
  private visualizationElement: HTMLElement | null = null
  private statsElement: HTMLElement | null = null

  constructor(selector: string) {
    super(selector)

    // Get visualization and stats elements
    this.visualizationElement = this.root.querySelector('#brain-visualization')
    this.statsElement = this.root.querySelector('#brain-stats')

    // Listen for brain events
    window.rina.onBrainEvent((event) => {
      this.addBrainThought(event)
    })

    // Update stats periodically
    this.updateStats()
    setInterval(() => this.updateStats(), 5000)
  }

  addBrainThought(event: BrainEvent): void {
    const icons: Record<string, string> = {
      intent: '🎯',
      planning: '📋',
      reasoning: '🧠',
      tool: '🔧',
      memory: '💾',
      action: '⚡',
      result: '✅',
      error: '❌',
    }

    const icon = icons[event.type] || '•'
    const truncatedMessage = event.message.length > 60 ? event.message.substring(0, 60) + '...' : event.message

    const thoughtHtml = `
      <div class="brain-flow">
        <div class="brain-icon ${event.type}">${icon}</div>
        <div class="brain-step">
          <div class="brain-label">${event.type.toUpperCase()}</div>
          <div class="brain-text">${truncatedMessage}</div>
          ${
            event.progress !== undefined
              ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${event.progress}%"></div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `

    this.appendContent(`<div class="brain-flow-wrapper">${thoughtHtml}</div>`)

    // Keep only last 10 thoughts
    const wrapper = this.root.querySelector('.rw-panel-body')
    if (wrapper && wrapper.children.length > 10) {
      wrapper.removeChild(wrapper.firstChild!)
    }
  }

  async updateStats(): Promise<void> {
    try {
      const stats = await window.rina.getBrainStats()

      if (this.statsElement) {
        this.statsElement.innerHTML = `
          <div class="brain-stat">
            <div class="brain-stat-value text-teal">${stats.total}</div>
            <div class="brain-stat-label">Total Thoughts</div>
          </div>
          <div class="brain-stat">
            <div class="brain-stat-value text-hot-pink">${stats.intent}</div>
            <div class="brain-stat-label">Intent</div>
          </div>
          <div class="brain-stat">
            <div class="brain-stat-value text-coral">${stats.planning}</div>
            <div class="brain-stat-label">Planning</div>
          </div>
          <div class="brain-stat">
            <div class="brain-stat-value text-babyblue">${stats.tool}</div>
            <div class="brain-stat-label">Tools</div>
          </div>
          <div class="brain-stat">
            <div class="brain-stat-value text-purple">${stats.memory}</div>
            <div class="brain-stat-label">Memory</div>
          </div>
          <div class="brain-stat">
            <div class="brain-stat-value text-green">${stats.result}</div>
            <div class="brain-stat-label">Results</div>
          </div>
        `
      }
    } catch (error) {
      console.error('Failed to update brain stats:', error)
    }
  }
}

// ============================================================
// Command Palette
// ============================================================

class CommandPalette {
  private root: HTMLElement | null = null
  private inputElement: HTMLInputElement | null = null
  private suggestionsElement: HTMLElement | null = null
  private isVisible = false

  constructor(selector: string) {
    this.root = document.querySelector(selector)
    if (!this.root) {
      console.warn(`Command palette root ${selector} not found`)
      return
    }

    this.init()
  }

  private init(): void {
    this.inputElement = this.root!.querySelector('input')
    this.suggestionsElement = this.root!.querySelector('.suggestions')

    // Global keyboard shortcut
    document.addEventListener('keydown', this.handleKeydown.bind(this))

    // Input handler
    this.inputElement?.addEventListener('input', this.handleInput.bind(this))

    // Close on Escape
    this.root?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide()
    })

    // Close on background click
    this.root?.addEventListener('click', (e) => {
      if (e.target === this.root) this.hide()
    })
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Ctrl+K to open
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault()
      this.toggle()
    }

    // Escape to close
    if (e.key === 'Escape' && this.isVisible) {
      this.hide()
    }
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    if (!this.root) return
    this.root.classList.add('visible')
    this.isVisible = true
    this.inputElement?.focus()
  }

  hide(): void {
    if (!this.root) return
    this.root.classList.remove('visible')
    this.isVisible = false
    if (this.inputElement) this.inputElement.value = ''
    if (this.suggestionsElement) this.suggestionsElement.innerHTML = ''
  }

  private async handleInput(): Promise<void> {
    const query = this.inputElement?.value.toLowerCase() || ''
    const commands = await this.getCommands()

    const filtered = commands.filter(
      (cmd) => cmd.cmd.toLowerCase().includes(query) || cmd.desc.toLowerCase().includes(query)
    )

    this.renderSuggestions(filtered)
  }

  private async getCommands(): Promise<Array<{ cmd: string; desc: string; action: string }>> {
    const baseCommands = [
      { cmd: 'deploy', desc: 'Deploy project', action: 'execute' },
      { cmd: 'build', desc: 'Build project', action: 'execute' },
      { cmd: 'test', desc: 'Run tests', action: 'execute' },
      { cmd: 'analyze', desc: 'Analyze code quality', action: 'execute' },
      { cmd: 'lint', desc: 'Run linter', action: 'execute' },
      { cmd: 'refactor', desc: 'Refactor code', action: 'execute' },
      { cmd: 'brain', desc: 'Open AI Brain panel', action: 'panel-brain' },
      { cmd: 'diagnostics', desc: 'Open Diagnostics panel', action: 'panel-diagnostics' },
      { cmd: 'agent', desc: 'Open Agent panel', action: 'panel-agent' },
      { cmd: 'terminal', desc: 'Open Terminal panel', action: 'panel-terminal' },
      { cmd: 'code', desc: 'Open Code panel', action: 'panel-code' },
      { cmd: 'mode auto', desc: 'Set auto mode', action: 'mode-auto' },
      { cmd: 'mode assist', desc: 'Set assist mode', action: 'mode-assist' },
      { cmd: 'mode explain', desc: 'Set explain mode', action: 'mode-explain' },
      { cmd: 'status', desc: 'Show system status', action: 'execute' },
      { cmd: 'help', desc: 'Show available commands', action: 'execute' },
    ]

    // Try to get additional commands from Rina
    try {
      const plans = (await window.rina.getPlans()) as Array<{ id: string; description?: string }>
      if (plans && plans.length > 0) {
        plans.forEach((plan) => {
          baseCommands.push({
            cmd: plan.id,
            desc: plan.description || plan.id,
            action: 'execute',
          })
        })
      }
    } catch {
      // Use base commands only
    }

    return baseCommands
  }

  private renderSuggestions(commands: Array<{ cmd: string; desc: string; action: string }>): void {
    if (!this.suggestionsElement) return

    this.suggestionsElement.innerHTML = ''

    commands.forEach((cmd) => {
      const item = document.createElement('div')
      item.className = 'palette-item'
      const icon = cmd.action?.startsWith('panel-') ? '📋' : cmd.action?.startsWith('mode-') ? '⚙️' : '▶️'
      item.innerHTML = `<span class="text-teal">${icon} ${cmd.cmd}</span> <span class="text-gray-400">- ${cmd.desc}</span>`
      item.addEventListener('click', () => this.executeCommand(cmd.cmd, cmd.action))
      this.suggestionsElement?.appendChild(item)
    })

    if (commands.length === 0 && this.inputElement?.value) {
      this.suggestionsElement.innerHTML = '<div class="palette-item text-gray-400">Press Enter to send to AI...</div>'
    }
  }

  private async executeCommand(cmd: string, action: string): Promise<void> {
    // Handle panel switching
    if (action?.startsWith('panel-')) {
      const panelName = action.replace('panel-', '')
      const tabButton = document.querySelector(`[data-tab="${panelName}"]`)
      if (tabButton) {
        ;(tabButton as HTMLElement).click()
      }
      this.hide()
      return
    }

    // Handle mode changes
    if (action?.startsWith('mode-')) {
      const mode = action.replace('mode-', '')
      await window.rina.setMode(mode)
      this.hide()
      return
    }

    // Execute command
    try {
      await window.rina.runAgent(cmd)
    } catch (error) {
      console.error('Command execution failed:', error)
    }

    this.hide()
  }
}

// ============================================================
// Rina Controller Bridge (for event subscriptions)
// ============================================================

const rinaController = {
  /**
   * Execute a terminal command via Rina
   */
  executeTerminalCommand: async (command: string): Promise<string> => {
    try {
      const result = (await window.rina.runAgent(command)) as { text?: string; error?: string }
      return result.text || result.error || 'Command executed'
    } catch (error) {
      return `Error: ${error}`
    }
  },

  /**
   * Get available live commands
   */
  getLiveCommands: async (): Promise<Array<{ cmd: string; desc: string; action: string }>> => {
    const commands = [
      { cmd: 'deploy', desc: 'Deploy project', action: 'execute' },
      { cmd: 'build', desc: 'Build project', action: 'execute' },
      { cmd: 'test', desc: 'Run tests', action: 'execute' },
      { cmd: 'analyze', desc: 'Analyze code quality', action: 'execute' },
      { cmd: 'lint', desc: 'Run linter', action: 'execute' },
      { cmd: 'refactor', desc: 'Refactor code', action: 'execute' },
      { cmd: 'status', desc: 'Show system status', action: 'execute' },
      { cmd: 'help', desc: 'Show available commands', action: 'execute' },
    ]

    try {
      const plans = (await window.rina.getPlans()) as Array<{ id: string; description?: string }>
      plans.forEach((plan) => {
        commands.push({
          cmd: plan.id,
          desc: plan.description || plan.id,
          action: 'execute',
        })
      })
    } catch {
      // Use base commands
    }

    return commands
  },

  /**
   * Subscribe to Rina events
   */
  on: (event: string, handler: (...args: unknown[]) => void): (() => void) => {
    return window.rina.on(event, handler)
  },
}

// ============================================================
// Main Initialization
// ============================================================

// Export for external access
export { BasePanel, TerminalPanel, AgentPanel, CodePanel, DiagnosticsPanel, BrainPanel, CommandPalette, rinaController }

// Initialize when DOM is ready
async function init(): Promise<void> {
  console.log('Initializing RinaWarp Terminal Pro - Production Renderer')

  // Create panel instances
  const terminalPanel = new TerminalPanel('#panel-shell')
  const agentPanel = new AgentPanel('#panel-agent')
  const codePanel = new CodePanel('#panel-code')
  const diagnosticsPanel = new DiagnosticsPanel('#panel-diagnostics')
  const brainPanel = new BrainPanel('#panel-brain')

  // Create command palette
  const commandPalette = new CommandPalette('#command-palette')

  // Subscribe to thinking stream
  window.rina.onThinking((step) => {
    console.log('Rina thinking:', step.message)
  })

  // Subscribe to stream chunks
  window.rina.onStreamChunk((chunk: unknown) => {
    const data = chunk as { data?: string; stream?: string }
    if (data?.stream === 'stdout' || data?.stream === 'stderr') {
      terminalPanel.appendOutput(data.data || '', 'stream-output')
    }
  })

  // Subscribe to stream end
  window.rina.onStreamEnd((result: unknown) => {
    const res = result as { ok?: boolean; error?: string }
    if (res?.error) {
      terminalPanel.appendOutput(`Error: ${res.error}`, 'error')
    } else if (res?.ok === false) {
      terminalPanel.appendOutput('Command failed', 'error')
    }
  })

  // Telemetry: track session start
  try {
    await window.rina.invoke('telemetry:sessionStart')
  } catch {
    // Telemetry is optional
  }

  // Telemetry: track session end on page unload
  // Use global Window type
  const globalWindow = window as unknown as Window
  globalWindow.addEventListener('beforeunload', async () => {
    try {
      await window.rina.invoke('telemetry:sessionEnd')
    } catch {
      // Ignore
    }
  })

  // Command palette hotkey (Ctrl+K)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      commandPalette.toggle()
    }

    // Settings hotkey (Ctrl+,)
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault()
      const settingsBtn = document.querySelector('[data-tab="settings"]')
      if (settingsBtn) {
        (settingsBtn as HTMLElement).click()
      } else {
        // Fallback: toggle settings panel class
        document.body.classList.toggle('settings-open')
      }
    }

    // Escape closes panels
    if (e.key === 'Escape') {
      commandPalette.hide()
      document.body.classList.remove('palette-open', 'settings-open')
    }
  })

  // Update status bar
  const statusBar = document.getElementById('status-bar')
  if (statusBar) {
    statusBar.textContent = '🟢 Ready'
  }

  // Welcome message in terminal
  terminalPanel.appendOutput('Welcome to RinaWarp Terminal Pro', 'welcome')
  terminalPanel.appendOutput('Type a command or press Ctrl+K for command palette', 'hint')

  console.log('RinaWarp Terminal Pro initialized successfully')

  // Signal renderer ready for E2E tests
  ;(window as any).RINAWARP_READY = true
}

// Run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

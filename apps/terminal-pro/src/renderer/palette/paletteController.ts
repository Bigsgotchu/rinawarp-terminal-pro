import type { WorkbenchStore } from '../workbench/store.js'

type PalettePlansApi = {
  getPlans?: () => Promise<Array<{ id: string; description?: string }>>
  setMode?: (mode: string) => Promise<unknown>
  runAgent?: (command: string, opts?: { workspaceRoot?: string | null }) => Promise<unknown>
}

// ============================================================
// Command Palette Controller
// ============================================================

class CommandPalette {
  private root: HTMLElement | null = null
  private inputElement: HTMLInputElement | null = null
  private suggestionsElement: HTMLElement | null = null
  private isVisible = false
  private store: WorkbenchStore

  constructor(selector: string, store: WorkbenchStore) {
    this.root = document.querySelector(selector)
    this.store = store
    if (!this.root) {
      console.warn(`Command palette root ${selector} not found`)
      return
    }

    this.init()
  }

  private init(): void {
    this.inputElement = this.root!.querySelector('input')
    this.suggestionsElement = this.root!.querySelector('.suggestions')

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

  visible(): boolean {
    return this.isVisible
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
      { cmd: 'deploy', desc: 'Ask Rina to help you deploy', action: 'execute' },
      { cmd: 'build', desc: 'Ask Rina to build the project', action: 'execute' },
      { cmd: 'test', desc: 'Ask Rina to run the tests', action: 'execute' },
      { cmd: 'analyze', desc: 'Ask Rina to analyze the project', action: 'execute' },
      { cmd: 'lint', desc: 'Ask Rina to run lint', action: 'execute' },
      { cmd: 'refactor', desc: 'Ask Rina to help refactor', action: 'execute' },
      { cmd: 'brain', desc: 'Open Brain inspector', action: 'panel-brain' },
      { cmd: 'diagnostics', desc: 'Open Diagnostics inspector', action: 'panel-diagnostics' },
      { cmd: 'agent', desc: 'Open Agent thread', action: 'panel-agent' },
      { cmd: 'execution trace', desc: 'Open execution trace inspector', action: 'panel-execution-trace' },
      { cmd: 'code', desc: 'Open Workspace inspector', action: 'panel-code' },
      { cmd: 'mode auto', desc: 'Set auto mode', action: 'mode-auto' },
      { cmd: 'mode assist', desc: 'Set assist mode', action: 'mode-assist' },
      { cmd: 'mode explain', desc: 'Set explain mode', action: 'mode-explain' },
      { cmd: 'status', desc: 'Ask Rina for system status', action: 'execute' },
      { cmd: 'help', desc: 'Ask Rina what she can do here', action: 'execute' },
    ]

    // Try to get additional commands from Rina
    try {
      const plans = await (window.rina as PalettePlansApi).getPlans?.()
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
      const icon = cmd.action?.startsWith('panel-') ? '📋' : cmd.action?.startsWith('mode-') ? '⚙️' : '✦'
      item.innerHTML = `<span class="text-teal">${icon} ${cmd.cmd}</span> <span class="text-gray-400">- ${cmd.desc}</span>`
      item.addEventListener('click', () => this.executeCommand(cmd.cmd, cmd.action))
      this.suggestionsElement?.appendChild(item)
    })

    if (commands.length === 0 && this.inputElement?.value) {
      this.suggestionsElement.innerHTML = '<div class="palette-item text-gray-400">Press Enter to ask Rina…</div>'
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
      await (window.rina as PalettePlansApi).setMode?.(mode)
      this.hide()
      return
    }

    // Ask Rina through the canonical thread path
    try {
      await sendPromptToRina(this.store, cmd)
    } catch (error) {
      console.error('Command execution failed:', error)
    }

    this.hide()
  }
}

// Helper function for sending prompts to Rina
async function sendPromptToRina(store: WorkbenchStore, prompt: string): Promise<void> {
  const workspaceRoot = store.getState().workspaceKey !== '__none__' ? store.getState().workspaceKey : null
  await (window.rina as PalettePlansApi).runAgent?.(prompt, { workspaceRoot })
}

// ============================================================
// Palette Controller Interface
// ============================================================

export interface PaletteController {
  mount(): void
  unmount(): void
  toggle(): void
  hide(): void
  isVisible(): boolean
}

// ============================================================
// Palette Controller Implementation
// ============================================================

export function createPaletteController(store: WorkbenchStore): PaletteController {
  let commandPalette: CommandPalette | null = null

  return {
    mount(): void {
      if (commandPalette) {
        console.warn('[palette] already mounted')
        return
      }
      commandPalette = new CommandPalette('#command-palette', store)
    },

    unmount(): void {
      if (!commandPalette) {
        console.warn('[palette] not mounted')
        return
      }
      // Clean up any resources if needed
      commandPalette = null
    },

    toggle(): void {
      commandPalette?.toggle()
    },

    hide(): void {
      commandPalette?.hide()
    },

    isVisible(): boolean {
      return commandPalette?.visible() || false
    },
  }
}

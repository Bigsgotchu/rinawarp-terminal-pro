type PalettePlansApi = {
  getPlans?: () => Promise<Array<{ id: string; description?: string }>>
  setMode?: (mode: string) => Promise<unknown>
}

type PaletteCommand = { cmd: string; desc: string; action: string }
type PaletteDeps = {
  sendPrompt: (prompt: string) => Promise<void>
  navigateToPanel: (panel: 'agent' | 'diagnostics' | 'execution-trace' | 'code' | 'brain' | 'runs' | 'marketplace' | 'settings') => Promise<void> | void
  setRuntimeMode: (mode: 'auto' | 'assist' | 'explain') => Promise<void> | void
}

// ============================================================
// Command Palette Controller
// ============================================================

class CommandPalette {
  private root: HTMLElement | null = null
  private inputElement: HTMLInputElement | null = null
  private suggestionsElement: HTMLElement | null = null
  private isVisible = false
  private deps: PaletteDeps
  private readonly onInput = () => {
    void this.handleInput()
  }
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.hide()
  }
  private readonly onBackdropClick = (e: MouseEvent) => {
    if (e.target === this.root) this.hide()
  }
  private itemCleanup = new Set<() => void>()

  constructor(selector: string, deps: PaletteDeps) {
    this.root = document.querySelector(selector)
    this.deps = deps
    if (!this.root) {
      console.warn(`Command palette root ${selector} not found`)
      return
    }

    this.init()
  }

  private init(): void {
    this.inputElement = this.root!.querySelector('input')
    this.suggestionsElement = this.root!.querySelector('.suggestions')

    this.inputElement?.addEventListener('input', this.onInput)
    this.root?.addEventListener('keydown', this.onKeyDown)
    this.root?.addEventListener('click', this.onBackdropClick)
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
    this.clearSuggestions()
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

  private async getCommands(): Promise<PaletteCommand[]> {
    const baseCommands: PaletteCommand[] = [
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

  private renderSuggestions(commands: PaletteCommand[]): void {
    if (!this.suggestionsElement) return

    this.clearSuggestions()

    commands.forEach((cmd) => {
      const item = document.createElement('div')
      item.className = 'palette-item'
      const icon = cmd.action?.startsWith('panel-') ? '📋' : cmd.action?.startsWith('mode-') ? '⚙️' : '✦'
      const primary = document.createElement('span')
      primary.className = 'text-teal'
      primary.textContent = `${icon} ${cmd.cmd}`
      const secondary = document.createElement('span')
      secondary.className = 'text-gray-400'
      secondary.textContent = `- ${cmd.desc}`
      item.append(primary, document.createTextNode(' '), secondary)
      const onClick = () => {
        void this.executeCommand(cmd.cmd, cmd.action)
      }
      item.addEventListener('click', onClick)
      this.itemCleanup.add(() => item.removeEventListener('click', onClick))
      this.suggestionsElement?.appendChild(item)
    })

    if (commands.length === 0 && this.inputElement?.value) {
      const empty = document.createElement('div')
      empty.className = 'palette-item text-gray-400'
      empty.textContent = 'Press Enter to ask Rina…'
      this.suggestionsElement.appendChild(empty)
    }
  }

  private async executeCommand(cmd: string, action: string): Promise<void> {
    await executePaletteCommand(cmd, action, this.deps)
    this.hide()
  }

  dispose(): void {
    this.clearSuggestions()
    this.inputElement?.removeEventListener('input', this.onInput)
    this.root?.removeEventListener('keydown', this.onKeyDown)
    this.root?.removeEventListener('click', this.onBackdropClick)
  }

  private clearSuggestions(): void {
    for (const cleanup of this.itemCleanup) cleanup()
    this.itemCleanup.clear()
    if (this.suggestionsElement) this.suggestionsElement.textContent = ''
  }
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

export function createPaletteController(deps: PaletteDeps): PaletteController {
  let commandPalette: CommandPalette | null = null

  return {
    mount(): void {
      if (commandPalette) {
        console.warn('[palette] already mounted')
        return
      }
      commandPalette = new CommandPalette('#command-palette', deps)
    },

    unmount(): void {
      if (!commandPalette) {
        console.warn('[palette] not mounted')
        return
      }
      commandPalette.dispose()
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

export async function executePaletteCommand(cmd: string, action: string, deps: PaletteDeps): Promise<void> {
  if (action?.startsWith('panel-')) {
    const panelName = action.replace('panel-', '') as Parameters<PaletteDeps['navigateToPanel']>[0]
    await deps.navigateToPanel(panelName)
    return
  }

  if (action?.startsWith('mode-')) {
    const mode = action.replace('mode-', '') as Parameters<PaletteDeps['setRuntimeMode']>[0]
    await deps.setRuntimeMode(mode)
    return
  }

  try {
    await deps.sendPrompt(cmd)
  } catch (error) {
    console.error('Command execution failed:', error)
  }
}

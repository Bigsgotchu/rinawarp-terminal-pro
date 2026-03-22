import { BasePanel } from '../components/basePanel.js'

type BrainStats = {
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

type BrainEvent = {
  type: string
  message: string
  progress?: number
}

type BrainPanelDeps = {
  getBrainStats: () => Promise<BrainStats>
}

export class BrainPanel extends BasePanel {
  private statsElement: HTMLElement | null = null
  private statsIntervalId: ReturnType<typeof setInterval> | null = null
  private deps: BrainPanelDeps

  constructor(selector: string, deps: BrainPanelDeps) {
    super(selector)
    this.deps = deps

    this.statsElement = this.root.querySelector('#brain-stats')

    this.registerCleanup(
      window.rina.onBrainEvent((event) => {
        this.addBrainThought(event)
      })
    )

    this.updateStats()
    this.statsIntervalId = setInterval(() => this.updateStats(), 5000)
    this.registerCleanup(() => {
      if (this.statsIntervalId) {
        clearInterval(this.statsIntervalId)
        this.statsIntervalId = null
      }
    })
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
    const wrapper = document.createElement('div')
    wrapper.className = 'brain-flow-wrapper'

    const flow = document.createElement('div')
    flow.className = 'brain-flow'

    const iconEl = document.createElement('div')
    iconEl.className = `brain-icon ${event.type}`
    iconEl.textContent = icon

    const stepEl = document.createElement('div')
    stepEl.className = 'brain-step'

    const labelEl = document.createElement('div')
    labelEl.className = 'brain-label'
    labelEl.textContent = event.type.toUpperCase()

    const textEl = document.createElement('div')
    textEl.className = 'brain-text'
    textEl.textContent = truncatedMessage

    stepEl.appendChild(labelEl)
    stepEl.appendChild(textEl)

    if (event.progress !== undefined) {
      const progressBar = document.createElement('div')
      progressBar.className = 'progress-bar'
      const progressFill = document.createElement('div')
      progressFill.className = 'progress-fill'
      progressFill.style.width = `${event.progress}%`
      progressBar.appendChild(progressFill)
      stepEl.appendChild(progressBar)
    }

    flow.appendChild(iconEl)
    flow.appendChild(stepEl)
    wrapper.appendChild(flow)
    this.appendContent(wrapper)

    const panelBody = this.root.querySelector('.rw-panel-body')
    if (panelBody && panelBody.children.length > 10) {
      panelBody.removeChild(panelBody.firstChild!)
    }
  }

  async updateStats(): Promise<void> {
    try {
      const stats = await this.deps.getBrainStats()

      if (this.statsElement) {
        this.statsElement.replaceChildren()
        ;[
          ['text-teal', String(stats.total), 'Total Thoughts'],
          ['text-hot-pink', String(stats.intent), 'Intent'],
          ['text-coral', String(stats.planning), 'Planning'],
          ['text-babyblue', String(stats.tool), 'Tools'],
          ['text-purple', String(stats.memory), 'Memory'],
          ['text-green', String(stats.result), 'Results'],
        ].forEach(([valueClass, value, label]) => {
          const stat = document.createElement('div')
          stat.className = 'brain-stat'

          const valueEl = document.createElement('div')
          valueEl.className = `brain-stat-value ${valueClass}`
          valueEl.textContent = value

          const labelEl = document.createElement('div')
          labelEl.className = 'brain-stat-label'
          labelEl.textContent = label

          stat.appendChild(valueEl)
          stat.appendChild(labelEl)
          this.statsElement!.appendChild(stat)
        })
      }
    } catch (error) {
      console.error('Failed to update brain stats:', error)
    }
  }
}

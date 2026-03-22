import { BasePanel } from '../components/basePanel.js'

export class DiagnosticsPanel extends BasePanel {
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

      this.clearContent()
      ;[
        ['Mode', stats.mode || 'unknown'],
        ['Tools', String(stats.tools?.length || 0)],
        ['Agent Running', stats.agentRunning ? 'Yes' : 'No'],
        ['Conversations', String(stats.memoryStats?.conversationCount || 0)],
        ['Learned Commands', String(stats.memoryStats?.learnedCommandsCount || 0)],
      ].forEach(([label, value]) => {
        const item = document.createElement('div')
        item.className = 'stat-item'

        const labelEl = document.createElement('span')
        labelEl.className = 'stat-label'
        labelEl.textContent = `${label}:`

        const valueEl = document.createElement('span')
        valueEl.className = 'stat-value'
        valueEl.textContent = value

        item.appendChild(labelEl)
        item.appendChild(valueEl)
        this.appendContent(item)
      })
    } catch (error) {
      console.error('Failed to update diagnostics:', error)
    }
  }
}

import { BasePanel } from '../components/basePanel.js'
import { describeAgentPlanStep, describeAgentTimelineEvent } from './agentNarration.js'
import { type FixBlockModel, type MessageBlock, WorkbenchStore } from '../workbench/store.js'

type AgentPanelDeps = {
  getWorkspaceKey: (store: WorkbenchStore) => string
  renderAgentStepBlock: (statusClass: 'start' | 'running' | 'end', text: string) => MessageBlock
}

export class AgentPanel extends BasePanel {
  private store: WorkbenchStore
  private deps: AgentPanelDeps

  constructor(selector: string, store: WorkbenchStore, deps: AgentPanelDeps) {
    super(selector)
    this.store = store
    this.deps = deps

    this.registerCleanup(
      window.rina.onTimelineEvent((event) => {
        this.showTimelineEvent(event)
      })
    )

    this.registerCleanup(
      window.rina.onPlanStepStart((step) => {
        this.showAgentStep(step)
      })
    )
  }

  showAgentStep(step: unknown): void {
    const stepData = step as { stepIndex?: number; name?: string; status?: string; step?: { input?: { command?: string } }; input?: { command?: string } }
    this.appendAgentOutput([this.deps.renderAgentStepBlock('running', describeAgentPlanStep(stepData))])
  }

  showTimelineEvent(event: unknown): void {
    const entry = event as {
      type?: string
    }
    const narration = describeAgentTimelineEvent(event as never)
    if (!narration) return
    const statusClass = entry.type === 'task.failed' || entry.type === 'permission.required' || entry.type === 'task.completed' ? 'end' : 'start'
    this.appendAgentOutput([this.deps.renderAgentStepBlock(statusClass, narration)])
  }

  appendAgentOutput(content?: MessageBlock[]): void {
    this.store.dispatch({
      type: 'chat/add',
      msg: {
        id: `agent:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        role: 'system',
        content,
        ts: Date.now(),
        workspaceKey: this.deps.getWorkspaceKey(this.store),
      },
    })
  }

  mountFixBlock(fix: FixBlockModel): void {
    this.store.dispatch({ type: 'fix/upsert', fix })
  }
}

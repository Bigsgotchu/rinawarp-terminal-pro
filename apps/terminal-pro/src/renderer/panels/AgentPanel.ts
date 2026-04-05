import { BasePanel } from '../components/basePanel.js'
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
    const stepData = step as { stepIndex?: number; name?: string; status?: string }
    this.appendAgentOutput([this.deps.renderAgentStepBlock('running', `Step ${stepData.stepIndex ?? '?'}: ${stepData.name ?? 'running'}`)])
  }

  showTimelineEvent(event: unknown): void {
    const entry = event as { type?: string; mode?: string; intent?: string; reason?: string; goal?: string; stepCount?: number; summary?: string; error?: string }
    switch (entry.type) {
      case 'agent.mode.changed':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('running', `Rina is ${entry.mode || 'working'}...`)])
        return
      case 'intent.resolved':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('start', `Intent: ${entry.intent || 'unknown'}`)])
        return
      case 'plan.created':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('start', `Plan ready: ${entry.goal || 'task'} (${entry.stepCount || 0} steps)`)]);
        return
      case 'permission.required':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', `Approval needed: ${entry.reason || 'Review required before execution.'}`)])
        return
      case 'task.completed':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', entry.summary || 'Task completed.')])
        return
      case 'task.failed':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', entry.error || 'Task failed.')])
        return
      default:
        return
    }
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

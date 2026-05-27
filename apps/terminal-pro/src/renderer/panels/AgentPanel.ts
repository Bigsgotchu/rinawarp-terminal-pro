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
      window.rina.on('rina:stream', (event: any) => {
        this.showStreamEvent(event)
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

  showStreamEvent(event: unknown): void {
    const e = event as { type?: string; plan?: string; id?: string }
    if (!e?.type) return

    const type = e.type
    let statusClass: 'start' | 'running' | 'end' = 'start'
    let narration: string | null = null

    switch (type) {
      case 'intent.received':
        narration = 'Understanding your request...'
        statusClass = 'start'
        break
      case 'policy.checking':
        narration = 'Checking safety constraints...'
        statusClass = 'start'
        break
      case 'plan.generated':
        narration = e.plan || 'Adjusting approach based on past runs...'
        statusClass = 'running'
        break
      case 'transaction.created':
        narration = 'Preparing safe changes...'
        statusClass = 'start'
        break
      case 'execution.running':
        narration = 'Applying changes...'
        statusClass = 'running'
        break
      case 'execution.complete':
        narration = 'Completed successfully'
        statusClass = 'end'
        break
      case 'rollback.triggered':
        narration = 'Reverting unsafe changes...'
        statusClass = 'end'
        break
      default:
        narration = null
    }

    if (!narration) return
    // Keep raw events (do not remove); we just render a narrative string over them.
    this.appendAgentOutput([this.deps.renderAgentStepBlock(statusClass, `${narration}`)])
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

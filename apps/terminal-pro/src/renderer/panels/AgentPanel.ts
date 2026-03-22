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
      window.rina.onPlanStepStart((step) => {
        this.showAgentStep(step)
      })
    )

    this.registerCleanup(
      window.rina.onPlanRunStart(({ planRunId }) => {
        this.appendAgentOutput([
          this.deps.renderAgentStepBlock('start', `Starting plan: ${planRunId}`),
        ])
      })
    )

    this.registerCleanup(
      window.rina.onPlanRunEnd(({ planRunId, ok, haltedBecause }) => {
        const status = ok ? 'completed' : `halted: ${haltedBecause || 'unknown'}`
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', `Plan ${planRunId} ${status}`)])
      })
    )
  }

  showAgentStep(step: unknown): void {
    const stepData = step as { stepIndex?: number; name?: string; status?: string }
    this.appendAgentOutput([this.deps.renderAgentStepBlock('running', `Step ${stepData.stepIndex ?? '?'}: ${stepData.name ?? 'running'}`)])
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

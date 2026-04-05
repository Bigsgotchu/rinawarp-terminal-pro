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

  private describePlanStep(step: { stepIndex?: number; name?: string; step?: { input?: { command?: string } }; input?: { command?: string } }): string {
    const rawName = String(step.name || '').trim()
    const command = String(step.step?.input?.command || step.input?.command || '').trim()
    const combined = `${rawName} ${command}`.toLowerCase()

    if (/\bgit status\b/.test(combined)) return 'I’m checking the workspace state first.'
    if (/\bnpm test\b|\bpnpm test\b|\byarn test\b|\bbun test\b/.test(combined)) return 'I’m running the tests to see what fails.'
    if (/\bnpm run build\b|\bpnpm build\b|\byarn build\b|\bbun run build\b|\bnext build\b|\btsc\b/.test(combined)) {
      return 'I’m running the build to verify the current state.'
    }
    if (/\bselfcheck\b|executeselfcheck/.test(combined)) return 'I’m checking the app and workspace health now.'
    if (/\binspect\b|\banaly[sz]e\b|\bdiagnos/.test(combined)) return 'I’m inspecting the project first.'
    if (rawName) return `I’m working through: ${rawName}.`
    if (command) return `I’m running: ${command}.`
    return 'I’m working through the next step now.'
  }

  showAgentStep(step: unknown): void {
    const stepData = step as { stepIndex?: number; name?: string; status?: string; step?: { input?: { command?: string } }; input?: { command?: string } }
    this.appendAgentOutput([this.deps.renderAgentStepBlock('running', this.describePlanStep(stepData))])
  }

  showTimelineEvent(event: unknown): void {
    const entry = event as {
      type?: string
      mode?: string
      intent?: string
      reason?: string
      goal?: string
      stepCount?: number
      summary?: string
      error?: string
      backend?: 'sqlite' | 'json-fallback'
      constraintCount?: number
    }
    switch (entry.type) {
      case 'agent.mode.changed':
        if (entry.mode === 'planning') {
          this.appendAgentOutput([this.deps.renderAgentStepBlock('running', 'I’m lining up the safest path first.')])
          return
        }
        if (entry.mode === 'executing') {
          this.appendAgentOutput([this.deps.renderAgentStepBlock('running', 'I’m working through it now.')])
          return
        }
        if (entry.mode === 'thinking' || entry.mode === 'responding') {
          return
        }
        this.appendAgentOutput([this.deps.renderAgentStepBlock('running', 'I’m still with you on this.')])
        return
      case 'intent.resolved':
        if (entry.intent === 'mixed') {
          this.appendAgentOutput([this.deps.renderAgentStepBlock('start', 'I understand the goal and I’m keeping explanation and action together.')])
          return
        }
        if (entry.intent === 'inspect' || entry.intent === 'question') {
          this.appendAgentOutput([this.deps.renderAgentStepBlock('start', 'I’m starting with inspection before I change anything.')])
          return
        }
        return
      case 'memory.context.applied': {
        const backend = entry.backend === 'json-fallback' ? 'JSON fallback' : 'SQLite'
        const count = Number(entry.constraintCount || 0)
        const summary = count <= 1
          ? `I’m using one remembered constraint from ${backend} memory for this turn.`
          : `I’m using ${count} remembered constraints from ${backend} memory for this turn.`
        this.appendAgentOutput([this.deps.renderAgentStepBlock('start', summary)])
        return
      }
      case 'plan.created':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('start', `I’ve got a plan for ${entry.goal || 'this task'}. ${entry.stepCount || 0} step${entry.stepCount === 1 ? '' : 's'}.`)]);
        return
      case 'permission.required':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', `I want your approval before I continue. ${entry.reason || 'Review required before execution.'}`)])
        return
      case 'task.completed':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', entry.summary || 'I finished that step cleanly.')])
        return
      case 'task.failed':
        this.appendAgentOutput([this.deps.renderAgentStepBlock('end', entry.error || 'That run failed. I can inspect it or try the next safe move.')])
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

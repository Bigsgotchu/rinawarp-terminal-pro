import { buildFixIntent, summarizeFailure, type FailedStepContext } from './fixHelpers.js'
import type { FixPlanStep } from '../replies/renderPlanReplies.js'
import { WorkbenchStore, type FixBlockModel, type FixIssueModel, type FixStepModel } from '../workbench/store.js'
import type { FixProjectResult } from '../../main/assistant/fixProjectFlow.js'

export class FixBlockManager {
  private store: WorkbenchStore
  private stepContextByStream = new Map<string, FailedStepContext>()
  private outputByStream = new Map<string, string>()
  private seenFailures = new Set<string>()

  constructor(store: WorkbenchStore) {
    this.store = store
  }

  recordPlanStepStart(payload: unknown): void {
    const stepPayload = payload as {
      runId?: string
      streamId?: string
      step?: { input?: { command?: string; cwd?: string } }
    }
    const streamId = String(stepPayload?.streamId || '')
    const command = String(stepPayload?.step?.input?.command || '')
    if (!streamId || !command) return
    const cwd = String(stepPayload?.step?.input?.cwd || '.')
    const runId = String(stepPayload?.runId || '')
    this.stepContextByStream.set(streamId, { runId, streamId, command, cwd })
    this.outputByStream.set(streamId, '')
  }

  recordChunk(payload: unknown): void {
    const chunk = payload as { streamId?: string; data?: string }
    const streamId = String(chunk?.streamId || '')
    if (!streamId) return
    const next = `${this.outputByStream.get(streamId) || ''}${String(chunk?.data || '')}`
    this.outputByStream.set(streamId, next.slice(-6000))
  }

  async recordStreamEnd(payload: unknown): Promise<void> {
    const end = payload as { streamId?: string; ok?: boolean; code?: number | null; error?: string }
    const streamId = String(end?.streamId || '')
    if (!streamId || end?.ok !== false || this.seenFailures.has(streamId)) return

    const ctx = this.stepContextByStream.get(streamId)
    if (!ctx?.command) return

    this.seenFailures.add(streamId)
    const outputTail = `${this.outputByStream.get(streamId) || ''}${end?.error ? `\n${String(end.error)}` : ''}`.trim()
    const fix = this.buildFixBlockModel(ctx, outputTail, typeof end?.code === 'number' ? end.code : null)
    this.store.dispatch({ type: 'fix/upsert', fix })
    await this.planIntoFix(fix, ctx, outputTail, typeof end?.code === 'number' ? end.code : null)
  }

  async ensureProAccess(): Promise<boolean> {
    const license = await window.rina.licenseState()
    if ((license?.tier || 'starter').toLowerCase() !== 'starter') return true
    await this.openUpgradeModal()
    return this.refreshProWithRetry()
  }

  async promptUpgradeToPro(): Promise<void> {
    await this.openUpgradeModal()
  }

  createPendingFixProjectBlock(projectRoot: string): FixBlockModel {
    const fixId = `fix:project:${Date.now()}`
    return {
      id: fixId,
      runId: fixId,
      streamId: fixId,
      command: 'fix project',
      cwd: projectRoot,
      status: 'planning',
      phase: 'detecting',
      whatBroke: 'RinaWarp is inspecting this workspace to find the safest repairable issues first.',
      whySafe: 'This phase is read-only. It only scans the project and builds a repair plan before any changes run.',
      steps: [],
      ts: Date.now(),
      statusText: 'Analyzing your project. This step is read-only while RinaWarp prepares the safest repair plan.',
      verificationStatus: 'pending',
      verificationText: 'Verification targets will appear once the repair plan is ready.',
      narration: [],
      changedFiles: [],
      diffHints: [],
    }
  }

  createFixProjectBlock(result: FixProjectResult, projectRoot: string, fixId?: string): FixBlockModel {
    const blockId = fixId || `fix:project:${Date.now()}`
    const issues: FixIssueModel[] = result.plan.issues.map((issue) => ({
      kind: issue.kind,
      summary: issue.summary,
      evidence: issue.evidence,
      proposedFixes: issue.proposedFixes,
    }))
    const commandSummary = result.executableSteps.map((step) => step.command).join(' && ') || 'fix project'
    return {
      id: blockId,
      runId: blockId,
      streamId: blockId,
      command: commandSummary,
      cwd: projectRoot,
      status: 'ready',
      phase: 'planning',
      whatBroke:
        result.plan.issues.map((issue) => issue.summary).join(' ') ||
        'RinaWarp identified a repairable project issue set.',
      whySafe: result.plan.reasoning || 'These steps were filtered through the project repair planner and policy gate.',
      steps: result.executableSteps.map((step, index) => ({
        title: step.description || `Step ${index + 1}`,
        command: step.command,
        cwd: projectRoot,
        risk: step.risk === 'high-impact' ? 'dangerous' : step.risk === 'safe-write' ? 'moderate' : 'safe',
        status: 'pending',
      })),
      ts: Date.now(),
      statusText: 'Repair plan ready. Starting a proof-backed repair run now…',
      verificationStatus: result.verification.status,
      verificationText: result.verification.message,
      verificationChecks: result.verification.checks,
      issues,
      narration: [],
      changedFiles: [],
      diffHints: [],
      explanation: result.explanation,
    }
  }

  private buildFixBlockModel(ctx: FailedStepContext, outputTail: string, exitCode: number | null): FixBlockModel {
    return {
      id: `fix:${ctx.runId || ctx.streamId}`,
      runId: ctx.runId || ctx.streamId,
      streamId: ctx.streamId,
      command: ctx.command,
      cwd: ctx.cwd,
      exitCode,
      status: 'planning',
      whatBroke: summarizeFailure(ctx.command, outputTail, exitCode),
      whySafe: 'RinaWarp is generating the lowest-risk runnable fix plan it can justify from the failed receipt context.',
      steps: [],
      ts: Date.now(),
      narration: [],
      changedFiles: [],
      diffHints: [],
    }
  }

  private async planIntoFix(
    fix: FixBlockModel,
    ctx: FailedStepContext,
    outputTail: string,
    exitCode: number | null
  ): Promise<void> {
    try {
      const plan = await window.rina.agentPlan({
        intentText: buildFixIntent(ctx, outputTail, exitCode),
        projectRoot: ctx.cwd,
      })
      const steps: FixPlanStep[] = Array.isArray(plan?.steps) ? plan.steps : []
      const nextFix: FixBlockModel = {
        ...fix,
        status: steps.length > 0 ? 'ready' : 'error',
        whySafe:
          plan?.reasoning ||
          (steps.length > 0
            ? 'These actions came from the planner using the failed command, recent output tail, and workspace root.'
            : 'No runnable fix steps were returned for this failure.'),
        steps: steps.map((step: FixPlanStep, index: number): FixStepModel => ({
          title: `Step ${index + 1}`,
          command: String(step.input?.command || '(missing command)'),
          cwd: String(step.input?.cwd || ctx.cwd),
          risk: this.mapFixRisk(step),
        })),
        error: steps.length > 0 ? undefined : 'No runnable actions available for this failure yet.',
      }
      this.store.dispatch({ type: 'fix/upsert', fix: nextFix })
    } catch (error) {
      this.store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          whySafe: 'RinaWarp could not produce a structured fix plan from this failure.',
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  private mapFixRisk(step: FixPlanStep): FixStepModel['risk'] {
    if (step.requires_confirmation || step.risk_level === 'high' || step.risk === 'high-impact') return 'dangerous'
    if (step.risk_level === 'medium' || step.risk === 'safe-write') return 'moderate'
    return 'safe'
  }

  private async refreshProWithRetry(deadlineMs = 60_000): Promise<boolean> {
    const deadline = Date.now() + deadlineMs
    while (Date.now() < deadline) {
      const state = window.rina.licenseRefresh ? await window.rina.licenseRefresh() : await window.rina.licenseState()
      const tier = (state?.tier || 'starter').toLowerCase()
      if (tier !== 'starter') return true
      await new Promise((resolve) => setTimeout(resolve, 3_000))
    }
    return false
  }

  private async openUpgradeModal(): Promise<void> {
    const cachedEmail = String((await window.rina.licenseCachedEmail?.())?.email || '').trim().toLowerCase()
    await new Promise<void>((resolve) => {
      const backdrop = document.createElement('div')
      backdrop.className = 'fix-upgrade-backdrop'
      backdrop.innerHTML = `
        <div class="fix-upgrade-modal" role="dialog" aria-modal="true" aria-label="Upgrade to Pro">
          <div class="fix-upgrade-title">Unlock premium execution</div>
          <div class="fix-upgrade-copy">
            Pro unlocks premium capability packs, installable agents, and one-click safe fixes while keeping proof attached to the thread.
          </div>
          <ul class="fix-upgrade-list">
            <li>Premium capability packs and agents</li>
            <li>One-click safe fixes when they are available</li>
            <li>Receipts and support bundles stay audit-backed</li>
          </ul>
          <label class="fix-upgrade-email-label" for="fix-upgrade-email">Billing email</label>
          <input
            id="fix-upgrade-email"
            class="fix-upgrade-email-input"
            type="email"
            placeholder="you@example.com"
            value="${cachedEmail.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"
            autocomplete="email"
          />
          <div class="fix-upgrade-status" data-upgrade-status></div>
          <div class="fix-upgrade-actions">
            <button class="fix-btn" data-upgrade-cancel>Not now</button>
            <button class="fix-btn" data-upgrade-refresh>I’ve paid — Refresh Pro status</button>
            <button class="fix-btn primary" data-upgrade-confirm>Upgrade to Pro</button>
          </div>
        </div>
      `
      const close = () => {
        backdrop.remove()
        resolve()
      }
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) close()
      })
      const emailInput = backdrop.querySelector<HTMLInputElement>('#fix-upgrade-email')
      const statusEl = backdrop.querySelector<HTMLElement>('[data-upgrade-status]')
      const readEmail = () => String(emailInput?.value || '').trim().toLowerCase()
      backdrop.querySelector<HTMLButtonElement>('[data-upgrade-cancel]')?.addEventListener('click', close)
      backdrop.querySelector<HTMLButtonElement>('[data-upgrade-refresh]')?.addEventListener('click', async () => {
        const refreshBtn = backdrop.querySelector<HTMLButtonElement>('[data-upgrade-refresh]')
        if (refreshBtn) {
          refreshBtn.disabled = true
          refreshBtn.textContent = 'Refreshing…'
        }
        if (statusEl) statusEl.textContent = ''
        try {
          const unlocked = await this.refreshProWithRetry()
          if (unlocked) {
            close()
            return
          }
          if (refreshBtn) refreshBtn.textContent = 'Still pending — try again'
          if (statusEl) statusEl.textContent = 'Still pending. If you just paid, webhook processing can take a minute.'
        } finally {
          if (refreshBtn) refreshBtn.disabled = false
        }
      })
      backdrop.querySelector<HTMLButtonElement>('[data-upgrade-confirm]')?.addEventListener('click', async () => {
        const confirmBtn = backdrop.querySelector<HTMLButtonElement>('[data-upgrade-confirm]')
        const email = readEmail()
        if (!email) {
          if (statusEl) statusEl.textContent = 'Enter your billing email to continue.'
          emailInput?.focus()
          return
        }
        if (confirmBtn) {
          confirmBtn.disabled = true
          confirmBtn.textContent = 'Opening checkout…'
        }
        try {
          const result = window.rina.licenseCheckout ? await window.rina.licenseCheckout(email) : null
          if (result?.ok) {
            if (statusEl) statusEl.textContent = 'Checkout opened in your browser. After payment, click Refresh Pro status.'
          } else if (window.rina.openStripePortal) {
            await window.rina.openStripePortal(email)
            if (statusEl) statusEl.textContent = 'Billing portal opened in your browser.'
          } else if (window.electronAPI?.shell?.openExternal) {
            await window.electronAPI.shell.openExternal('https://rinawarptech.com/pricing')
            if (statusEl) statusEl.textContent = 'Pricing opened in your browser.'
          }
        } catch {
          if (statusEl) statusEl.textContent = 'Could not open checkout. Try again in a moment.'
        } finally {
          if (confirmBtn) {
            confirmBtn.disabled = false
            confirmBtn.textContent = 'Upgrade to Pro'
          }
        }
      })
      document.body.appendChild(backdrop)
      emailInput?.focus()
    })
  }
}

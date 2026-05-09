import { useState, type FormEvent, type KeyboardEvent } from 'react'

type RiskLevel = 'read' | 'safe-write' | 'destructive'

type CommandPlan = {
  label?: string
  command: string
  reason: string
  risk: RiskLevel
  requiresApproval: boolean
  expectedEffect?: string
  rollbackAwareness?: 'not-applicable' | 'regenerable' | 're-downloadable' | 'irreversible'
}

type CommandResult = CommandPlan & {
  ok: boolean
  output: string
  error?: string
  evidence?: DiskEvidence
}

type DiskEvidence = {
  percent?: string
  size?: string
  used?: string
  available?: string
  raw?: string
}

type DiskDiagnostic = {
  ok: boolean
  title: string
  summary: string
  evidence?: DiskEvidence
  plan: CommandPlan[]
  results: CommandResult[]
  findings: string[]
  cleanupPlan: CommandPlan[]
}

type CleanupState = {
  status: 'approved' | 'denied' | 'running' | 'done' | 'error'
  output?: string
  error?: string
  evidence?: DiskEvidence
}

interface RinaPanelProps {
  status: 'idle' | 'checking' | 'ready' | 'error'
  diagnostic: DiskDiagnostic | null
  error?: string
  messages: Array<{ id: string; role: 'user' | 'rina'; text: string }>
  isChatBusy: boolean
  onSubmitPrompt: (prompt: string) => Promise<boolean | void>
  onRunDiskDiagnostic: () => Promise<void>
}

function riskClass(risk: RiskLevel): string {
  if (risk === 'read') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  if (risk === 'safe-write') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-red-500/30 bg-red-500/10 text-red-200'
}

function actionKey(action: CommandPlan): string {
  return action.command
}

function formatEvidence(evidence?: DiskEvidence): string {
  if (!evidence) return 'Not measured yet'
  if (!evidence.percent) return evidence.raw || 'Measured'
  return `${evidence.percent} full | ${evidence.used || 'unknown'} used | ${evidence.available || 'unknown'} available`
}

function rollbackLabel(action: CommandPlan): string {
  if (action.rollbackAwareness === 'not-applicable') return 'No change; nothing to roll back'
  if (action.rollbackAwareness === 'regenerable') return 'Regenerable cache data'
  if (action.rollbackAwareness === 're-downloadable') return 'Can be re-downloaded, not restored by Rina'
  if (action.rollbackAwareness === 'irreversible') return 'Irreversible; Rina cannot restore it automatically'
  return 'Rollback boundary not declared'
}

export function RinaPanel({
  status,
  diagnostic,
  error,
  messages,
  isChatBusy,
  onSubmitPrompt,
  onRunDiskDiagnostic,
}: RinaPanelProps) {
  const [cleanupStates, setCleanupStates] = useState<Record<string, CleanupState>>({})
  const [draft, setDraft] = useState('')

  const submitDraft = async (event?: FormEvent) => {
    event?.preventDefault()
    const prompt = draft.trim()
    if (!prompt || isChatBusy) return
    setDraft('')
    await onSubmitPrompt(prompt)
  }

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitDraft()
    }
  }

  const denyAction = (action: CommandPlan) => {
    setCleanupStates((current) => ({
      ...current,
      [actionKey(action)]: { status: 'denied' },
    }))
  }

  const approveAction = async (action: CommandPlan) => {
    const key = actionKey(action)
    setCleanupStates((current) => ({
      ...current,
      [key]: { status: 'running' },
    }))

    try {
      const result = (await window.rina.runApprovedCleanup({
        command: action.command,
        approved: true,
      })) as CommandResult
      setCleanupStates((current) => ({
        ...current,
        [key]: {
          status: result.ok ? 'done' : 'error',
          output: result.output,
          error: result.error,
          evidence: result.evidence,
        },
      }))
    } catch (caught) {
      setCleanupStates((current) => ({
        ...current,
        [key]: {
          status: 'error',
          error: caught instanceof Error ? caught.message : String(caught),
        },
      }))
    }
  }

  return (
    <aside
      data-testid="rina-panel"
      className="flex min-h-0 flex-col border-l border-zinc-800 bg-zinc-950/95"
      aria-label="Rina assistant panel"
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Rina</h2>
            <p className="text-xs text-zinc-400">Disk usage diagnostic</p>
          </div>
          <span className="rounded border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-300">
            {status}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-auto px-4 py-4">
        <section data-testid="rina-chat" className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-500">Rina chat</h3>
            <p className="mt-1 text-sm text-zinc-200">
              Tell Rina what is broken. She will inspect safely first and ask before changing anything.
            </p>
          </div>

          <div data-testid="rina-chat-history" className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'border border-cyan-500/30 bg-cyan-500/10 p-3'
                    : 'border border-zinc-800 bg-zinc-900/70 p-3'
                }
              >
                <div className="text-[11px] font-semibold uppercase text-zinc-500">
                  {message.role === 'user' ? 'You' : 'Rina'}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{message.text}</p>
              </div>
            ))}
            {isChatBusy && (
              <div data-testid="rina-chat-thinking" className="border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="text-[11px] font-semibold uppercase text-zinc-500">Rina</div>
                <p className="mt-1 text-sm text-zinc-100">Inspecting safely...</p>
              </div>
            )}
          </div>

          <form onSubmit={submitDraft} className="space-y-2">
            <textarea
              data-testid="rina-chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="Tell Rina what is broken..."
              rows={3}
              disabled={isChatBusy}
              className="min-h-[84px] w-full resize-none border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500 disabled:cursor-wait disabled:text-zinc-500"
            />
            <button
              data-testid="rina-chat-send"
              type="submit"
              disabled={!draft.trim() || isChatBusy}
              className="w-full rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500"
            >
              {isChatBusy ? 'Inspecting...' : 'Send'}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-500">Current flow</h3>
            <p className="mt-1 text-sm text-zinc-200">
              {status === 'idle' && 'Ask "Why is my disk full?" to start a safe disk check.'}
              {status === 'checking' && 'Inspecting disk usage with read-only commands. No cleanup is running.'}
              {status === 'ready' && (diagnostic?.summary || 'Disk inspection complete. Review evidence before approving cleanup.')}
              {status === 'error' && (error || 'Disk inspection failed before any cleanup ran.')}
            </p>
            {status === 'ready' && (
              <p className="mt-2 text-xs text-cyan-100">No cleanup has run. Rina is waiting for your approval.</p>
            )}
          </div>

          <button
            type="button"
            data-testid="run-disk-diagnostic"
            onClick={() => void onRunDiskDiagnostic()}
            disabled={status === 'checking'}
            className="w-full rounded border border-purple-500/40 bg-purple-500/15 px-3 py-2 text-sm font-medium text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500"
          >
            {status === 'checking' ? 'Inspecting disk usage...' : 'Run disk check'}
          </button>
        </section>

        {diagnostic && (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-zinc-500">Before evidence</h3>
              <div className="border border-cyan-500/30 bg-cyan-500/5 p-3">
                <p className="text-sm font-medium text-cyan-100">Before: {formatEvidence(diagnostic.evidence)}</p>
                <p className="mt-1 text-xs text-zinc-400">This was measured before any cleanup approval.</p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-zinc-500">Read checks</h3>
              <div className="space-y-2">
                {diagnostic.plan.map((item) => (
                  <div key={item.command} className="border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <code className="break-all text-xs text-zinc-100">{item.command}</code>
                      <span className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${riskClass(item.risk)}`}>
                        {item.risk}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">{item.reason}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-zinc-500">Diagnosis</h3>
              <div data-testid="disk-findings" className="space-y-2">
                {diagnostic.findings.map((finding) => (
                  <p key={finding} className="border-l border-cyan-500/50 bg-cyan-500/5 px-3 py-2 text-sm text-zinc-200">
                    {finding}
                  </p>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-zinc-500">Cleanup options</h3>
              <div className="space-y-2">
                {diagnostic.cleanupPlan.map((action) => {
                  const state = cleanupStates[actionKey(action)]
                  const busy = state?.status === 'running'
                  return (
                    <div key={action.command} className="border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-medium text-zinc-100">{action.label || action.command}</h4>
                          <code className="mt-1 block break-all text-xs text-zinc-400">{action.command}</code>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${riskClass(action.risk)}`}>
                          {action.risk}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">{action.reason}</p>
                      <div className="mt-3 grid gap-2 text-xs text-zinc-300">
                        <p>
                          <span className="text-zinc-500">Expected effect:</span>{' '}
                          {action.expectedEffect || 'Not declared'}
                        </p>
                        <p>
                          <span className="text-zinc-500">Rollback awareness:</span> {rollbackLabel(action)}
                        </p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          data-testid={`approve-cleanup-${action.risk}`}
                          onClick={() => void approveAction(action)}
                          disabled={busy}
                          className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-wait disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500"
                        >
                          {busy ? 'Cleaning selected item...' : 'Approve cleanup'}
                        </button>
                        <button
                          type="button"
                          data-testid={`deny-cleanup-${action.risk}`}
                          onClick={() => denyAction(action)}
                          disabled={busy}
                          className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-wait disabled:text-zinc-500"
                        >
                          Deny
                        </button>
                      </div>
                      {state && (
                        <div data-testid={`cleanup-state-${action.risk}`} className="mt-3 text-xs text-zinc-300">
                          <p className="font-medium capitalize">
                            {state.status === 'running' ? 'Cleaning selected item' : state.status}
                          </p>
                          {state.status === 'done' && (
                            <p className="mt-1 text-cyan-100">After: {formatEvidence(state.evidence)}</p>
                          )}
                          {(state.output || state.error) && (
                            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap border border-zinc-800 bg-black p-2 text-[11px] text-zinc-300">
                              {state.output || state.error}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  )
}

import { useState } from 'react'

type RiskLevel = 'read' | 'safe-write' | 'destructive'

type CommandPlan = {
  label?: string
  command: string
  reason: string
  risk: RiskLevel
  requiresApproval: boolean
}

type CommandResult = CommandPlan & {
  ok: boolean
  output: string
  error?: string
}

type DiskDiagnostic = {
  ok: boolean
  title: string
  summary: string
  plan: CommandPlan[]
  results: CommandResult[]
  findings: string[]
  cleanupPlan: CommandPlan[]
}

type CleanupState = {
  status: 'approved' | 'denied' | 'running' | 'done' | 'error'
  output?: string
  error?: string
}

interface RinaPanelProps {
  status: 'idle' | 'checking' | 'ready' | 'error'
  diagnostic: DiskDiagnostic | null
  error?: string
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

export function RinaPanel({ status, diagnostic, error, onRunDiskDiagnostic }: RinaPanelProps) {
  const [cleanupStates, setCleanupStates] = useState<Record<string, CleanupState>>({})

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
        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-500">Current flow</h3>
            <p className="mt-1 text-sm text-zinc-200">
              {status === 'idle' && 'Ask "rina why is my disk full" to start a safe disk check.'}
              {status === 'checking' && "I'll check disk usage with read-only commands first."}
              {status === 'ready' && (diagnostic?.summary || 'Disk check complete.')}
              {status === 'error' && (error || 'Disk diagnostic failed.')}
            </p>
          </div>

          <button
            type="button"
            data-testid="run-disk-diagnostic"
            onClick={() => void onRunDiskDiagnostic()}
            disabled={status === 'checking'}
            className="w-full rounded border border-purple-500/40 bg-purple-500/15 px-3 py-2 text-sm font-medium text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500"
          >
            {status === 'checking' ? 'Checking disk usage...' : 'Run disk check'}
          </button>
        </section>

        {diagnostic && (
          <>
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
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          data-testid={`approve-cleanup-${action.risk}`}
                          onClick={() => void approveAction(action)}
                          disabled={busy}
                          className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-wait disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500"
                        >
                          {busy ? 'Running...' : 'Approve'}
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
                          <p className="font-medium capitalize">{state.status}</p>
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

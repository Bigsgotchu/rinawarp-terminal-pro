import { useCallback, useState } from 'react'
import { HeaderBar } from './HeaderBar'
import { InputBar } from './InputBar'
import { RinaPanel } from './RinaPanel'
import { TerminalPane } from './TerminalPane'
import { planRinaTask } from '../../rina-agent/agentPlanner'
import { summarizeTaskResult } from '../../rina-agent/summarizer'
import { extractPort, routeRinaTask } from '../../rina-agent/taskRouter'
import { verifyTaskResult } from '../../rina-agent/verifier'
import type { RinaTaskRequest } from '../../rina-agent/types'

interface ChatScreenProps {
  onResumeFix?: () => void
  onViewDetails?: () => void
  showDetailsDrawer?: boolean
}

export function ChatScreen({ showDetailsDrawer }: ChatScreenProps) {
  const [diagnosticStatus, setDiagnosticStatus] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle')
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [portDiagnostic, setPortDiagnostic] = useState<any>(null)
  const [diagnosticError, setDiagnosticError] = useState<string | undefined>()
  const [isChatBusy, setIsChatBusy] = useState(false)
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'rina'; text: string }>>([
    {
      id: 'rina:intro',
      role: 'rina',
      text: 'Tell me what is broken. I will inspect safely first, explain what I find, and ask before changing anything.',
    },
  ])

  const createTaskRequest = useCallback((message: string): RinaTaskRequest => {
    return {
      id: `task:${Date.now()}`,
      message,
      cwd: '/',
    }
  }, [])

  const runDiskDiagnostic = useCallback(async (): Promise<any> => {
    setDiagnosticStatus('checking')
    setDiagnosticError(undefined)
    setPortDiagnostic(null)
    try {
      const result = await window.rina.diskFullDiagnostic()
      setDiagnostic(result)
      setDiagnosticStatus('ready')
      return result
    } catch (caught) {
      setDiagnosticStatus('error')
      setDiagnosticError(caught instanceof Error ? caught.message : String(caught))
      throw caught
    }
  }, [])

  const runPortDiagnostic = useCallback(async (port: number): Promise<any> => {
    setDiagnosticStatus('checking')
    setDiagnosticError(undefined)
    setDiagnostic(null)
    try {
      const result = await window.rina.portConflictDiagnostic({ port })
      setPortDiagnostic(result)
      setDiagnosticStatus('ready')
      return result
    } catch (caught) {
      setDiagnosticStatus('error')
      setDiagnosticError(caught instanceof Error ? caught.message : String(caught))
      throw caught
    }
  }, [])

  const runDiskRecoveryTask = useCallback(
    async (request: RinaTaskRequest) => {
      const plan = planRinaTask(request, 'disk_recovery')
      const result = await runDiskDiagnostic()
      const findings = Array.isArray(result?.findings) ? result.findings.slice(0, 3) : []
      const actions = Array.isArray(result?.cleanupPlan) ? result.cleanupPlan : []
      return verifyTaskResult({
        taskId: request.id,
        kind: 'disk_recovery',
        needsApproval: actions.length > 0,
        summary: summarizeTaskResult({
          kind: 'disk_recovery',
          plan,
          summary: result?.summary || 'I inspected disk usage with read-only checks.',
          findings,
          hasProposedActions: actions.length > 0,
        }),
        evidence: { diagnostic: result, actions },
      })
    },
    [runDiskDiagnostic]
  )

  const appendMessage = useCallback((role: 'user' | 'rina', text: string) => {
    setMessages((current) => [
      ...current,
      {
        id: `${role}:${Date.now()}:${current.length}`,
        role,
        text,
      },
    ])
  }, [])

  const runPortRecoveryTask = useCallback(
    async (request: RinaTaskRequest & { port: number }) => {
      const plan = planRinaTask(request, 'port_conflict', { port: request.port })
      const result = await runPortDiagnostic(request.port)
      const process = result?.process
      return verifyTaskResult({
        taskId: request.id,
        kind: 'port_conflict',
        needsApproval: Boolean(process),
        summary: summarizeTaskResult({
          kind: 'port_conflict',
          plan,
          summary: result?.summary || `I checked port ${request.port} with read-only commands.`,
          hasProposedActions: Boolean(process),
        }),
        evidence: { diagnostic: result, actions: result?.stopPlan || [] },
      })
    },
    [runPortDiagnostic]
  )

  const handlePrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed) return true
      const taskRequest = createTaskRequest(trimmed)
      const taskKind = routeRinaTask(trimmed)
      appendMessage('user', trimmed)
      if (taskKind === 'port_conflict') {
        const port = extractPort(trimmed)
        if (!port) {
          appendMessage('rina', 'Which port should I inspect? Send a port number, for example: "What is using port 3000?"')
          return true
        }
        setIsChatBusy(true)
        appendMessage(
          'rina',
          `I'll check what is listening on port ${port}. This is read-only and won't stop or change anything.`
        )
        try {
          const taskResult = await runPortRecoveryTask({ ...taskRequest, port })
          appendMessage('rina', taskResult.summary)
        } catch (caught) {
          appendMessage(
            'rina',
            `I could not finish the port inspection. ${caught instanceof Error ? caught.message : String(caught)}`
          )
        } finally {
          setIsChatBusy(false)
        }
        return true
      }

      if (taskKind === 'disk_recovery') {
        setIsChatBusy(true)
        appendMessage(
          'rina',
          "I'll inspect disk usage, Downloads, Docker, and npm cache. This is read-only and will not change anything."
        )
        try {
          const taskResult = await runDiskRecoveryTask(taskRequest)
          appendMessage('rina', taskResult.summary)
        } catch (caught) {
          appendMessage(
            'rina',
            `I could not finish the disk inspection. ${caught instanceof Error ? caught.message : String(caught)}`
          )
        } finally {
          setIsChatBusy(false)
        }
        return true
      }

      appendMessage(
        'rina',
        'I can run chat-first disk or port recovery right now. Try: "Why is my disk full?" or "What is using port 3000?" I will inspect first and ask before any action.'
      )
      return true
    },
    [appendMessage, createTaskRequest, runDiskRecoveryTask, runPortRecoveryTask]
  )

  const handleRunDiskDiagnostic = useCallback(async () => {
    setIsChatBusy(true)
    appendMessage('user', 'Why is my disk full?')
    appendMessage('rina', "I'll inspect disk usage with read-only checks first. No cleanup will run without your approval.")
    try {
      const taskResult = await runDiskRecoveryTask(createTaskRequest('Why is my disk full?'))
      appendMessage('rina', taskResult.summary)
    } finally {
      setIsChatBusy(false)
    }
  }, [appendMessage, createTaskRequest, runDiskRecoveryTask])

  const handleBottomPrompt = useCallback(
    async (prompt: string) => {
      const handled = await handlePrompt(prompt)
      if (handled) {
        return true
      }
      return false
    },
    [handlePrompt]
  )

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <HeaderBar />
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px]">
        <TerminalPane />
        <RinaPanel
          status={diagnosticStatus}
          diagnostic={diagnostic}
          portDiagnostic={portDiagnostic}
          error={diagnosticError}
          messages={messages}
          isChatBusy={isChatBusy}
          onSubmitPrompt={handlePrompt}
          onRunDiskDiagnostic={handleRunDiskDiagnostic}
          onPortActionResult={(message) => appendMessage('rina', message)}
        />
      </div>
      <InputBar onSubmitPrompt={handleBottomPrompt} />
      {showDetailsDrawer && (
        <div className="fixed right-0 top-0 h-full w-80 bg-zinc-900/95 border-l border-zinc-700/50 p-6 backdrop-blur-sm shadow-2xl">
          <h3 className="text-lg font-semibold mb-4 text-white">Session Details</h3>
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Recovery Summary</h4>
              <p className="text-sm text-zinc-400">
                50 items recovered successfully. All project files are intact and ready for continued development.
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Technical Details</h4>
              <p className="text-sm text-zinc-400">
                Session ID: {Date.now()}
                <br />
                Recovery Time: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

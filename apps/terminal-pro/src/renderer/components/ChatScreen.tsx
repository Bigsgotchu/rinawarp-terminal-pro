import { useCallback, useState } from 'react'
import { HeaderBar } from './HeaderBar'
import { InputBar } from './InputBar'
import { RinaPanel } from './RinaPanel'
import { TerminalPane } from './TerminalPane'
import type { RinaTaskRequest, RinaTaskResult } from '../rina-task-contract'

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
    async (_request: RinaTaskRequest): Promise<RinaTaskResult> => {
      const result = await runDiskDiagnostic()
      const findings = Array.isArray(result?.findings) ? result.findings.slice(0, 3) : []
      const actions = Array.isArray(result?.cleanupPlan) ? result.cleanupPlan : []
      return {
        status: actions.length ? 'needs_approval' : 'completed',
        summary: [
          result?.summary || 'I inspected disk usage with read-only checks.',
          findings.length ? `I found: ${findings.join(' ')}` : '',
          actions.length
            ? 'Cleanup options are ready. Review the exact command, risk, expected effect, and rollback notes before approving anything.'
            : 'No cleanup action is recommended right now.',
        ]
          .filter(Boolean)
          .join('\n\n'),
        evidence: result?.evidence,
        actions,
      }
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

  const extractPort = useCallback((prompt: string): number | null => {
    const match = prompt.match(/\b([1-9]\d{1,4})\b/)
    if (!match) return null
    const port = Number(match[1])
    return Number.isInteger(port) && port <= 65_535 ? port : null
  }, [])

  const isPortPrompt = useCallback((prompt: string): boolean => {
    return /\bport\b/i.test(prompt) || /\bkill\b/i.test(prompt) || /won.?t.*start/i.test(prompt)
  }, [])

  const runPortRecoveryTask = useCallback(
    async (request: RinaTaskRequest & { port: number }): Promise<RinaTaskResult> => {
      const result = await runPortDiagnostic(request.port)
      const process = result?.process
      return {
        status: process ? 'needs_approval' : 'completed',
        summary: [
          result?.summary || `I checked port ${request.port} with read-only commands.`,
          process
            ? 'Stop option is ready. Review the exact command, risk, expected effect, and rollback notes before approving anything.'
            : 'No stop action is needed because the port is already free.',
        ].join('\n\n'),
        evidence: result,
        actions: result?.stopPlan || [],
      }
    },
    [runPortDiagnostic]
  )

  const handlePrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed) return true
      appendMessage('user', trimmed)
      if (isPortPrompt(trimmed)) {
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
          const taskResult = await runPortRecoveryTask({ message: trimmed, port })
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

      if (
        /^(rina\s+)?(why\s+is\s+my\s+)?disk\s+(is\s+)?full\??$/i.test(trimmed) ||
        /disk.*full|full.*disk|disk space/i.test(trimmed)
      ) {
        setIsChatBusy(true)
        appendMessage(
          'rina',
          "I'll inspect disk usage, Downloads, Docker, and npm cache. This is read-only and will not change anything."
        )
        try {
          const taskResult = await runDiskRecoveryTask({ message: trimmed })
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
    [appendMessage, extractPort, isPortPrompt, runDiskRecoveryTask, runPortRecoveryTask]
  )

  const handleRunDiskDiagnostic = useCallback(async () => {
    setIsChatBusy(true)
    appendMessage('user', 'Why is my disk full?')
    appendMessage('rina', "I'll inspect disk usage with read-only checks first. No cleanup will run without your approval.")
    try {
      const taskResult = await runDiskRecoveryTask({ message: 'Why is my disk full?' })
      appendMessage('rina', taskResult.summary)
    } finally {
      setIsChatBusy(false)
    }
  }, [appendMessage, runDiskRecoveryTask])

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

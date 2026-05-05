import { useCallback, useState } from 'react'
import { HeaderBar } from './HeaderBar'
import { InputBar } from './InputBar'
import { RinaPanel } from './RinaPanel'
import { TerminalPane } from './TerminalPane'

interface ChatScreenProps {
  onResumeFix?: () => void
  onViewDetails?: () => void
  showDetailsDrawer?: boolean
}

export function ChatScreen({ showDetailsDrawer }: ChatScreenProps) {
  const [diagnosticStatus, setDiagnosticStatus] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle')
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [diagnosticError, setDiagnosticError] = useState<string | undefined>()

  const runDiskDiagnostic = useCallback(async () => {
    setDiagnosticStatus('checking')
    setDiagnosticError(undefined)
    try {
      const result = await window.rina.diskFullDiagnostic()
      setDiagnostic(result)
      setDiagnosticStatus('ready')
    } catch (caught) {
      setDiagnosticStatus('error')
      setDiagnosticError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [])

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (/^rina\s+why\s+is\s+my\s+disk\s+full\??$/i.test(prompt.trim())) {
        await runDiskDiagnostic()
        return true
      }
      return false
    },
    [runDiskDiagnostic]
  )

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <HeaderBar />
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px]">
        <TerminalPane />
        <RinaPanel
          status={diagnosticStatus}
          diagnostic={diagnostic}
          error={diagnosticError}
          onRunDiskDiagnostic={runDiskDiagnostic}
        />
      </div>
      <InputBar onSubmitPrompt={handlePrompt} />
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

interface RecoveryCardProps {
  onResumeFix?: () => void
  onViewDetails?: () => void
}

export function RecoveryCard({ onResumeFix, onViewDetails }: RecoveryCardProps) {
  const handleResumeFix = async () => {
    try {
      await window.rina.fixProject(process.cwd())
      onResumeFix?.()
    } catch (error) {
      console.error('Failed to resume fix:', error)
    }
  }

  const handleViewDetails = () => {
    onViewDetails?.()
  }

  return (
    <div
      className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-5 mb-6 shadow-lg backdrop-blur-sm"
      data-agent-section="recovery"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-400 mb-1">Session Recovered</div>
          <div className="text-sm text-zinc-300 mb-3 leading-relaxed">
            I recovered your last session. 50 items are back and everything looks safe to continue.
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
              onClick={handleResumeFix}
            >
              Resume Fix
            </button>
            <button
              className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700/50 transition-colors duration-200"
              onClick={handleViewDetails}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

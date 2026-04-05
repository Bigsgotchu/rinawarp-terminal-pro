export function HeaderBar() {
  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Rina Terminal Pro</h1>
          <p className="text-xs text-zinc-400">AI-Powered Development Assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-zinc-400">
          <span className="text-zinc-500">Workspace:</span> karina
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  )
}

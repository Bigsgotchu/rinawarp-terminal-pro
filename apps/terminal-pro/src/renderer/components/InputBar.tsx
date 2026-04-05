import React, { useState } from 'react'

export function InputBar() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    try {
      await window.rina.runAgent(input.trim())
      setInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 border-t border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 pr-12 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200 placeholder-zinc-500"
            placeholder="Ask Rina anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-600 rounded-full flex items-center justify-center transition-colors duration-200"
            >
              {isLoading ? (
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </form>
      <div className="text-xs text-zinc-500 mt-2 text-center">
        Press Enter to send • Rina can help with coding, debugging, and project management
      </div>
    </div>
  )
}

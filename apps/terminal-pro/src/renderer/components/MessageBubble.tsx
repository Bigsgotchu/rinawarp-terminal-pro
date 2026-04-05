interface MessageBubbleProps {
  role: 'user' | 'rina'
  text: string
}

export function MessageBubble({ role, text }: MessageBubbleProps) {
  return (
    <div
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      data-thread-message=""
      data-thread-role={role}
    >
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-lg ${
          role === 'user'
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white ml-12'
            : 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 mr-12'
        }`}
      >
        <p className="text-sm leading-relaxed">{text}</p>
        <div className={`text-xs mt-2 opacity-60 ${role === 'user' ? 'text-right' : 'text-left'}`}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { RecoveryCard } from './RecoveryCard'

interface Message {
  id: string
  role: 'user' | 'rina'
  text: string
  timestamp: Date
}

interface ConversationViewProps {
  onResumeFix?: () => void
  onViewDetails?: () => void
}

export function ConversationView({ onResumeFix, onViewDetails }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'rina',
      text: 'I recovered your last session. 50 items are back and everything looks safe to continue.',
      timestamp: new Date(),
    },
  ])

  useEffect(() => {
    // Listen for timeline events
    const unsubscribe = window.rina.onTimelineEvent((event: any) => {
      if (event.type === 'task.completed' || event.type === 'task.failed') {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: 'rina',
          text: event.summary || event.error || 'Task completed',
          timestamp: new Date(event.timestamp),
        }
        setMessages((prev) => [...prev, newMessage])
      }
    })

    return unsubscribe
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
      <RecoveryCard onResumeFix={onResumeFix} onViewDetails={onViewDetails} />
      <div className="space-y-1">
        {messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} text={message.text} />
        ))}
      </div>
    </div>
  )
}

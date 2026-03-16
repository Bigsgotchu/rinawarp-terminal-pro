import { sendPtyCommand } from './terminal.js'

// Type declaration for window.agent exposed by preload.ts
interface AgentAPI {
  interpret: (input: string) => Promise<{ actions: Array<{ type: string; payload: any }> }>
  getSessions: () => Promise<Array<{ name: string; status: string; id: string }>>
  getPlans: () => Promise<Array<{ title: string; id: string }>>
  loadSession: (id: string) => Promise<void>
  executePlan: (id: string) => Promise<void>
}

declare global {
  interface Window {
    agent: AgentAPI
  }
}

export function initChat(container: HTMLElement) {
  container.innerHTML = `
    <div id="chatThread" class="rw-chat-body"></div>
    <textarea id="intent" class="rw-chat-input" placeholder="Type naturally here..."></textarea>
    <button id="sendBtn" class="rw-btn-send">Send</button>
  `

  const chatThread = document.getElementById('chatThread')!
  const chatInput = document.getElementById('intent') as HTMLTextAreaElement
  const sendBtn = document.getElementById('sendBtn')!

  function appendMessage(sender: 'user' | 'agent', msg: string, actions?: string[]) {
    const div = document.createElement('div')
    div.className = sender
    div.style.padding = '8px'
    div.style.margin = '4px 0'
    div.style.borderRadius = '4px'
    div.style.background = sender === 'user' ? '#333' : '#222'
    div.textContent = msg
    chatThread.appendChild(div)

    if (actions) {
      const container = document.createElement('div')
      container.style.display = 'flex'
      container.style.gap = '4px'
      container.style.marginTop = '4px'
      actions.forEach((act) => {
        const btn = document.createElement('button')
        btn.textContent = act
        btn.style.background = 'var(--rw-teal)'
        btn.style.color = '#000'
        btn.style.border = 'none'
        btn.style.padding = '4px 8px'
        btn.style.borderRadius = '4px'
        btn.style.cursor = 'pointer'
        btn.onclick = () => {
          // Execute action via agent interpret
          window.agent.interpret(act).then((response) => {
            if (response.actions && response.actions.length > 0) {
              for (const action of response.actions) {
                if (action.type === 'pty') {
                  sendPtyCommand(action.payload?.cmd || action.payload?.command || act)
                }
              }
            }
          })
        }
        container.appendChild(btn)
      })
      chatThread.appendChild(container)
    }

    chatThread.scrollTop = chatThread.scrollHeight
  }

  async function submitInput() {
    const text = chatInput.value.trim()
    if (!text) return

    appendMessage('user', text)
    chatInput.value = ''

    try {
      // Use window.agent.interpret for natural language processing
      const response = await window.agent.interpret(text)

      // Process actions returned by agent
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          if (action.type === 'pty') {
            const cmd = action.payload?.cmd || action.payload?.command
            if (cmd) {
              sendPtyCommand(cmd)
              appendMessage('agent', `Running: ${cmd}`)
            }
          } else if (action.type === 'reply') {
            appendMessage('agent', action.payload?.text || 'Done')
          } else if (action.type === 'patch') {
            appendMessage('agent', `Patch ready for: ${action.payload?.file || 'file'}`)
          }
        }
      } else {
        appendMessage('agent', `I received: "${text}". How would you like me to proceed?`)
      }
    } catch (e) {
      appendMessage('agent', `Error: ${e}`)
    }
  }

  sendBtn.addEventListener('click', submitInput)
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitInput()
    }
  })

  // Make submitInput available globally
  ;(window as any).submitInput = submitInput
}

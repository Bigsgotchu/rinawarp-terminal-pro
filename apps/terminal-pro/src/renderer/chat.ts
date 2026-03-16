const { ipcRenderer } = (window as any).electronAPI

document.addEventListener('DOMContentLoaded', () => {
  // Use existing IDs from renderer.html
  const messagesEl = document.getElementById('chatThread')
  const inputEl = document.getElementById('intent') as HTMLTextAreaElement | null
  const sendBtn = document.getElementById('sendBtn')

  if (!messagesEl || !inputEl || !sendBtn) {
    console.warn('Chat DOM elements not found, skipping initialization')
    return
  }

  // Use non-null assertions since we checked above
  const messagesElNonNull = messagesEl!
  const inputElNonNull = inputEl!
  const sendBtnNonNull = sendBtn!

  function appendMessage(sender: 'user' | 'agent', text: string) {
    const div = document.createElement('div')
    div.className = sender
    div.textContent = text
    messagesElNonNull.appendChild(div)
    messagesElNonNull.scrollTop = messagesElNonNull.scrollHeight
  }

  async function sendMessage() {
    const text = inputElNonNull.value.trim()
    if (!text) return

    appendMessage('user', text)
    inputElNonNull.value = ''

    // Use your existing IPC agent call
    try {
      const response: { text: string; actions?: string[] } = await ipcRenderer.invoke('agent:send', text)
      appendMessage('agent', response.text)

      // Show buttons if there are actions
      if (response.actions) {
        const actionsContainer = document.createElement('div')
        actionsContainer.className = 'actions'
        response.actions.forEach((action) => {
          const btn = document.createElement('button')
          btn.textContent = action
          btn.onclick = () => ipcRenderer.invoke('agent:execute', action)
          actionsContainer.appendChild(btn)
        })
        messagesElNonNull.appendChild(actionsContainer)
      }
    } catch (e) {
      appendMessage('agent', `Error: ${e}`)
    }
  }

  sendBtnNonNull.addEventListener('click', sendMessage)
  inputElNonNull.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
})

// Export initChat for HTML script to call
export function initChat() {
  // Initialization already happened via DOMContentLoaded
  // This function exists for compatibility with HTML script
}

// Signal that renderer is ready
;(window as any).RINAWARP_READY = true

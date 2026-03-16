export {}
const { ipcRenderer } = (window as any).electronAPI

document.addEventListener('DOMContentLoaded', () => {
  // PTY Terminal placeholder
  const ptyPane = document.getElementById('ptyTerminal')
  const ptyStatus = document.getElementById('ptyStatus')

  // Chat
  const chatThread = document.getElementById('chatThread')
  const chatInput = document.getElementById('intent') as HTMLTextAreaElement | null
  const sendBtn = document.getElementById('sendBtn')
  const chatClearBtn = document.getElementById('chatClearBtn')

  if (!ptyPane || !ptyStatus || !chatThread || !chatInput || !sendBtn || !chatClearBtn) {
    console.warn('Some DOM elements not found, skipping initialization')
    return
  }

  function appendMessage(sender: 'user' | 'agent', text: string) {
    const div = document.createElement('div')
    div.className = sender
    div.textContent = text
    chatThread!.appendChild(div)
    chatThread!.scrollTop = chatThread!.scrollHeight
  }

  async function sendMessage() {
    const text = chatInput!.value.trim()
    if (!text) return
    appendMessage('user', text)
    chatInput!.value = ''

    try {
      const response: { text: string; actions?: string[] } = await ipcRenderer.invoke('agent:send', text)
      appendMessage('agent', response.text)

      if (response.actions) {
        const container = document.createElement('div')
        container.className = 'actions'
        response.actions.forEach((action) => {
          const btn = document.createElement('button')
          btn.textContent = action
          btn.onclick = () => ipcRenderer.invoke('agent:execute', action)
          container.appendChild(btn)
        })
        chatThread!.appendChild(container)
      }
    } catch (e) {
      appendMessage('agent', `Error: ${e}`)
    }
  }

  sendBtn!.addEventListener('click', sendMessage)
  chatInput!.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
  chatClearBtn!.addEventListener('click', () => {
    chatThread!.innerHTML = ''
  })

  // PTY Terminal Status
  ipcRenderer.on('pty:update', (_event: any, status: string, output: string) => {
    ptyStatus!.textContent = status
    ptyPane!.textContent += output + '\n'
    ptyPane!.scrollTop = ptyPane!.scrollHeight
  })

  // Quick system fixes
  const quickFixes = [
    { name: 'Clean Build', cmd: 'npm run clean' },
    { name: 'Check Daemon Status', cmd: 'npm run agent:daemon:status' },
    { name: 'Restart Daemon', cmd: 'npm run agent:daemon:stop && npm run agent:daemon:start' },
  ]

  quickFixes.forEach((fix) => {
    const btn = document.createElement('button')
    btn.textContent = fix.name
    btn.onclick = () => ipcRenderer.invoke('agent:execute', fix.cmd)
    chatThread!.appendChild(btn)
  })

  // Developer Diagnostics Panel
  function toggleDevPanel() {
    const panel = document.getElementById('rw-dev-panel')
    if (!panel) return

    panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      toggleDevPanel()
    }
  })

  function devLog(message: string, data?: any) {
    const el = document.getElementById('rw-dev-log')
    if (!el) return

    const line = `[${new Date().toLocaleTimeString()}] ${message}`
    el.textContent += line + '\n'

    if (data) {
      el.textContent += JSON.stringify(data, null, 2) + '\n'
    }

    el.scrollTop = el.scrollHeight
  }

  // Expose devLog globally
  ;(window as any).devLog = devLog

  // Capture renderer errors automatically
  window.addEventListener('error', (event) => {
    ;(window as any).devLog('Renderer error', {
      message: event.message,
      file: event.filename,
      line: event.lineno,
    })
  })

  // Log IPC events (if onAny is available)
  if ((window as any).electronAPI.ipcRenderer.onAny) {
    ;(window as any).electronAPI.ipcRenderer.onAny?.((channel: string, data: any) => {
      ;(window as any).devLog('IPC: ' + channel, data)
    })
  } else {
    // Log key IPC channels individually
    ;(window as any).electronAPI.ipcRenderer.on('pty:data', (_event: any, data: any) => {
      ;(window as any).devLog('PTY data', data)
    })
    ;(window as any).electronAPI.ipcRenderer.on('pty:status', (_event: any, status: string) => {
      ;(window as any).devLog('PTY status', status)
    })
    ;(window as any).electronAPI.ipcRenderer.on('agent:response', (_event: any, response: any) => {
      ;(window as any).devLog('Agent response', response)
    })
  }

  // Clear log button
  document.getElementById('rw-dev-clear')?.addEventListener('click', () => {
    const log = document.getElementById('rw-dev-log')
    if (log) log.textContent = ''
  })

  // Signal that renderer is ready
  ;(window as any).RINAWARP_READY = true
  ;(window as any).devLog('Renderer ready')
})

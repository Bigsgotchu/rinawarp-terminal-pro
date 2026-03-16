const { ipcRenderer } = (window as any).electronAPI

document.addEventListener('DOMContentLoaded', () => {
  const ptyPane = document.getElementById('ptyTerminal')
  const ptyStatus = document.getElementById('ptyStatus')
  const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement | null

  if (!ptyPane || !ptyStatus || !chatInput) {
    console.warn('PTY DOM elements not found, skipping initialization')
    return
  }

  // Use non-null assertions since we checked above
  const ptyPaneNonNull = ptyPane!
  const ptyStatusNonNull = ptyStatus!
  const chatInputNonNull = chatInput!

  // Display PTY output
  ipcRenderer.on('pty:output', (_e: any, data: string) => {
    ptyPaneNonNull.textContent += data
    ptyPaneNonNull.scrollTop = ptyPaneNonNull.scrollHeight
  })

  // PTY connection status
  ipcRenderer.on('pty:status', (_e: any, status: string) => {
    ptyStatusNonNull.textContent = status
  })

  // Handle Enter key in chat input to send to PTY
  chatInputNonNull.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const cmd = chatInputNonNull.value.trim()
      if (cmd) {
        sendPtyCommand(cmd)
        chatInputNonNull.value = ''
      }
    }
  })
})

// Send command to PTY
export function sendPtyCommand(cmd: string) {
  ipcRenderer.send('pty:input', cmd)
}

// Signal that renderer is ready
;(window as any).RINAWARP_READY = true

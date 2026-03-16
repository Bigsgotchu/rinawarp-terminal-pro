// Quick Action Toolbar - One-click execution of common agent tasks

interface QuickActionResult {
  actions?: Array<{ type: string; payload: any }>
  error?: string
}

export function initQuickActions(container: HTMLElement) {
  container.innerHTML = `
    <button class="qa-btn" data-action="scan">Scan Workspace</button>
    <button class="qa-btn" data-action="lint">Lint & Fix</button>
    <button class="qa-btn" data-action="test">Run Tests</button>
    <button class="qa-btn" data-action="restart">Restart Daemon</button>
    <button class="qa-btn" data-action="stop">Stop Daemon</button>
  `

  // Add click handlers
  const buttons = container.querySelectorAll('.qa-btn')
  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = (btn as HTMLElement).dataset.action
      if (action) {
        await runQuickAction(action)
      }
    })
  })
}

export async function runQuickAction(action: string): Promise<void> {
  let command = ''
  switch (action) {
    case 'scan':
      command = 'Scan workspace for errors'
      break
    case 'lint':
      command = 'Lint and auto-fix project'
      break
    case 'test':
      command = 'Run tests and report results'
      break
    case 'restart':
      command = 'Restart daemon'
      break
    case 'stop':
      command = 'Stop daemon'
      break
    default:
      console.warn('Unknown quick action:', action)
      return
  }

  // Show loading state
  showQuickActionStatus(`Running: ${command}...`)

  try {
    // Send command to agent via preload API
    const response = await window.agent.interpret(command)

    // Process response
    if (response && response.actions) {
      for (const act of response.actions) {
        if (act.type === 'reply') {
          showQuickActionStatus(act.payload?.text || 'Completed')
        } else if (act.type === 'pty') {
          showQuickActionStatus(`Running: ${act.payload?.cmd || command}`)
        } else if (act.type === 'patch') {
          showQuickActionStatus('Patch ready - check code editor')
        }
      }
    } else {
      showQuickActionStatus('Action completed')
    }

    // Also show in chat if available
    appendToChat(`[Quick Action] ${command}`)
  } catch (e) {
    showQuickActionStatus(`Error: ${e}`)
    appendToChat(`[Quick Action Error] ${e}`)
  }
}

function showQuickActionStatus(message: string) {
  // Update status in terminal header if available
  const statusEl = document.getElementById('ptyStatus')
  if (statusEl) {
    const prev = statusEl.textContent
    statusEl.textContent = message
    // Reset after 5 seconds
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = prev || 'connected'
      }
    }, 5000)
  }
  console.log('[QuickAction]', message)
}

function appendToChat(message: string) {
  const chatThread = document.getElementById('chatThread')
  if (chatThread) {
    const msg = document.createElement('div')
    msg.className = 'chat-message system'
    msg.style.padding = '8px'
    msg.style.margin = '4px 0'
    msg.style.background = '#1a1a1a'
    msg.style.borderRadius = '4px'
    msg.style.color = '#89cff0'
    msg.textContent = message
    chatThread.appendChild(msg)
    chatThread.scrollTop = chatThread.scrollHeight
  }
}

// Make runQuickAction available globally
declare global {
  interface Window {
    runQuickAction: (action: string) => Promise<void>
  }
}
;(window as any).runQuickAction = runQuickAction

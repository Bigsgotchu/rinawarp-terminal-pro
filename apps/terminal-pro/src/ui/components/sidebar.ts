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

export function initSidebar(container: HTMLElement) {
  // Warp-style combined sidebar panel
  container.innerHTML = `
    <div class="sidebar-header">
      <span>Workspace Dashboard</span>
      <button class="sidebar-toggle" onclick="toggleSidebar()">⮜</button>
    </div>
    
    <!-- Sessions -->
    <div class="sidebar-section">
      <div class="section-header">Sessions</div>
      <ul id="sessionList" class="session-list"></ul>
    </div>

    <!-- Plans -->
    <div class="sidebar-section">
      <div class="section-header">Plans</div>
      <ul id="planList" class="plan-list"></ul>
    </div>

    <!-- Quick Actions -->
    <div class="sidebar-section">
      <div class="section-header">Quick Actions</div>
      <div class="quick-action-toolbar">
        <button onclick="runQuickAction('scan')">Scan</button>
        <button onclick="runQuickAction('lint')">Lint</button>
        <button onclick="runQuickAction('test')">Test</button>
        <button onclick="runQuickAction('restart')">Restart</button>
        <button onclick="runQuickAction('stop')">Stop</button>
      </div>
    </div>
  `

  // Refresh sessions and plans
  refreshSidebar()

  // Auto-refresh every 5 seconds
  setInterval(refreshSidebar, 5000)
}

async function refreshSidebar() {
  try {
    const sessions = await window.agent.getSessions()
    const sessionList = document.getElementById('sessionList')
    if (sessionList) {
      sessionList.innerHTML = ''
      if (sessions.length === 0) {
        sessionList.innerHTML = '<li class="empty">No active sessions</li>'
      } else {
        sessions.forEach((s: { name: string; status: string; id: string }) => {
          const li = document.createElement('li')
          li.textContent = `${s.name} (${s.status})`
          li.onclick = () => window.agent.loadSession(s.id)
          sessionList.appendChild(li)
        })
      }
    }
  } catch (e) {
    console.warn('Failed to load sessions:', e)
  }

  try {
    const plans = await window.agent.getPlans()
    const planList = document.getElementById('planList')
    if (planList) {
      planList.innerHTML = ''
      if (plans.length === 0) {
        planList.innerHTML = '<li class="empty">No pending plans</li>'
      } else {
        plans.forEach((p: { title: string; id: string }) => {
          const li = document.createElement('li')
          li.textContent = p.title
          li.onclick = () => window.agent.executePlan(p.id)
          planList.appendChild(li)
        })
      }
    }
  } catch (e) {
    console.warn('Failed to load plans:', e)
  }
}

// Toggle sidebar visibility
export function toggleSidebar() {
  const sidebar = document.querySelector('.rw-sidebar')
  if (sidebar) {
    sidebar.classList.toggle('collapsed')
  }
}

// Make functions available globally
;(window as any).toggleSidebar = toggleSidebar
;(window as any).runQuickAction = async function (action: string) {
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

  // Show status in terminal header
  const statusEl = document.getElementById('ptyStatus')
  if (statusEl) {
    statusEl.textContent = `Running: ${action}...`
  }

  try {
    const response = await window.agent.interpret(command)

    // Show result in chat thread
    const chatThread = document.getElementById('chatThread')
    if (chatThread) {
      const msg = document.createElement('div')
      msg.className = 'chat-message system'
      msg.style.padding = '8px'
      msg.style.margin = '4px 0'
      msg.style.background = '#1a1a1a'
      msg.style.borderRadius = '4px'
      msg.style.color = '#89cff0'
      msg.textContent = `[Quick Action] ${command} - Done`
      chatThread.appendChild(msg)
      chatThread.scrollTop = chatThread.scrollHeight
    }

    if (statusEl) {
      statusEl.textContent = 'connected'
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = `Error: ${e}`
    }
  }
}

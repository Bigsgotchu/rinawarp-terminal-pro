// --- Panel References ---
const panels = {
  shell: document.getElementById('panel-shell'),
  agent: document.getElementById('panel-agent'),
  code: document.getElementById('panel-code'),
  diagnostics: document.getElementById('panel-diagnostics'),
  brain: document.getElementById('panel-brain'),
}
const terminalInput = document.getElementById('terminal-input')
const terminalOutput = document.getElementById('terminal-output')
const agentOutput = document.getElementById('agent-output')
const codeOutput = document.getElementById('workspace-files')
const diagnosticsOutput = document.getElementById('diagnostics-output')
const statusRight = document.getElementById('status-right')
const thinkingIndicator = document.getElementById('thinking-indicator')
const thinkingStream = document.getElementById('thinking-stream')

// --- Rina Status Panel References ---
const autonomyStatusEl = document.getElementById('autonomy-status')
const workspaceStatusEl = document.getElementById('workspace-status')
const commandsLearnedEl = document.getElementById('commands-learned')
const activeToolsEl = document.getElementById('active-tools')

// --- Update Rina Status Panel ---
function updateRinaStatusPanel() {
  // Get autonomy status from IPC (if available)
  if (window.rina?.autonomy) {
    const autonomy = window.rina.autonomy
    autonomyStatusEl.textContent = `Autonomy: ${autonomy.enabled ? autonomy.level.toUpperCase() : 'OFF'}`
    autonomyStatusEl.className = autonomy.enabled ? 'text-teal' : 'text-gray-400'
  }

  // Update workspace status
  const workspace = memoryManager?.workspace?.getCurrent?.() || null
  workspaceStatusEl.textContent = workspace ? `Workspace: ${workspace.name || 'Unknown'}` : 'Workspace: -'

  // Update commands learned count
  const cmdStats = memoryManager?.getCommandStats?.() || {}
  commandsLearnedEl.textContent = `Commands: ${cmdStats.totalCommands || 0}`

  // Update active tools count
  const tools = window.rina?.getTools?.() || []
  activeToolsEl.textContent = `Tools: ${tools.length}`
}

// --- Tab Switching (per-column) ---
// Left column: Terminal ↔ Code
document.querySelectorAll('#left-col .tab-button').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#left-col .tab-button').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    const sel = tab.dataset.panel
    ;['shell', 'code'].forEach((p) => {
      if (panels[p]) {
        panels[p].classList.toggle('active-panel', p === sel)
        panels[p].classList.toggle('collapsed', p !== sel)
      }
    })
  })
})

// Right column: Agent ↔ Diagnostics
document.querySelectorAll('#right-col .tab-button').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#right-col .tab-button').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    const sel = tab.dataset.panel
    ;['agent', 'diagnostics'].forEach((p) => {
      if (panels[p]) {
        panels[p].classList.toggle('active-panel', p === sel)
        panels[p].classList.toggle('collapsed', p !== sel)
      }
    })
  })
})

// --- Wrap handleRinaMessage for thinking animation ---
async function runWithThinking(cmd) {
  thinkingIndicator.style.display = 'block'
  const response = await handleRinaMessage(cmd)
  thinkingIndicator.style.display = 'none'
  return response
}

// --- Terminal Input ---
terminalInput.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return
  const cmd = terminalInput.value.trim()
  if (!cmd) return

  // Check for "run:" prefix - execute command directly
  if (cmd.toLowerCase().startsWith('run:')) {
    const command = cmd.slice(4).trim() // Remove "run:" prefix
    if (!command) {
      terminalOutput.innerHTML += '<div class="text-red-400">Please provide a command after "run:". Example: run: ls -la</div>'
      terminalInput.value = ''
      terminalOutput.scrollTop = terminalOutput.scrollHeight
      return
    }

    // Show command in output
    const termLine = document.createElement('div')
    termLine.textContent = `$ ${command}`
    termLine.classList.add('glow-hotpink', 'pulse')
    terminalOutput.appendChild(termLine)

    terminalInput.value = ''

    // Run the command and show output
    try {
      const result = await window.terminal.run(command)
      const resLine = document.createElement('div')
      resLine.textContent = result.output || 'No output'
      resLine.classList.add('text-babyblue', 'pulse')
      terminalOutput.appendChild(resLine)
    } catch (err) {
      const errLine = document.createElement('div')
      errLine.textContent = 'Error: ' + err
      errLine.classList.add('text-red-400', 'pulse')
      terminalOutput.appendChild(errLine)
    }

    terminalOutput.scrollTop = terminalOutput.scrollHeight
    return
  }

  const termLine = document.createElement('div')
  termLine.textContent = `$ ${cmd}`
  termLine.classList.add('glow-hotpink', 'pulse')
  terminalOutput.appendChild(termLine)

  terminalInput.value = ''
  const response = await runWithThinking(cmd)

  if (response.text) {
    const resLine = document.createElement('div')
    resLine.textContent = response.text
    resLine.classList.add('text-babyblue', 'pulse')
    terminalOutput.appendChild(resLine)
  }

  if (response.plan) renderAgentPlan(response.plan)
  updateDiagnostics()
  terminalOutput.scrollTop = terminalOutput.scrollHeight
  agentOutput.scrollTop = agentOutput.scrollHeight
  diagnosticsOutput.scrollTop = diagnosticsOutput.scrollHeight
})

// --- Update Code Workspace ---
function updateCodeWorkspace() {
  const files = memoryManager.workspace.getFiles?.() || []
  codeOutput.innerHTML = ''
  files.forEach((f) => {
    const fDiv = document.createElement('div')
    fDiv.textContent = f
    fDiv.classList.add('text-coral', 'pulse')
    codeOutput.appendChild(fDiv)
  })
}

// --- Update Diagnostics ---
function updateDiagnostics() {
  const mem = memoryManager.getStats?.() || {}
  diagnosticsOutput.innerHTML = `
    <div class="text-teal">Conversation Entries: ${mem.conversationCount || 0}</div>
    <div class="text-babyblue">Learned Commands: ${mem.learnedCommandsCount || 0}</div>
    <div class="text-hot-pink">Known Projects: ${mem.projectsCount || 0}</div>
    <div class="text-coral">Reflection Queue: ${rinaController.reflectionQueue?.length || 0}</div>
  `
}

// --- Brain Panel Visualization ---
const brainVisualization = document.getElementById('brain-visualization')
const brainStats = document.getElementById('brain-stats')

// Thought type icons
const thoughtIcons = {
  intent: '🎯',
  planning: '📋',
  reasoning: '🧠',
  tool: '🔧',
  memory: '💾',
  action: '⚡',
  result: '✅',
  error: '❌',
}

// Add a thought to the brain visualization
function addBrainThought(type, content) {
  const flow = document.createElement('div')
  flow.className = 'brain-flow'

  const icon = document.createElement('div')
  icon.className = `brain-icon ${type}`
  icon.textContent = thoughtIcons[type] || '•'

  const step = document.createElement('div')
  step.className = 'brain-step'

  const label = document.createElement('div')
  label.className = 'brain-label'
  label.textContent = type

  const text = document.createElement('div')
  text.className = 'brain-text'
  text.textContent = content.length > 60 ? content.substring(0, 60) + '...' : content

  step.appendChild(label)
  step.appendChild(text)

  flow.appendChild(icon)
  flow.appendChild(step)

  brainVisualization.insertBefore(flow, brainVisualization.firstChild)

  // Keep only last 10 thoughts
  while (brainVisualization.children.length > 10) {
    brainVisualization.removeChild(brainVisualization.lastChild)
  }
}

// Update brain stats
function updateBrainStats() {
  const stats = window.rina?.getBrainStats?.() || {
    total: 0,
    intent: 0,
    planning: 0,
    reasoning: 0,
    tool: 0,
    memory: 0,
    action: 0,
    result: 0,
    error: 0,
  }

  brainStats.innerHTML = `
    <div class="brain-stat">
      <div class="brain-stat-value text-teal">${stats.total}</div>
      <div class="brain-stat-label">Total Thoughts</div>
    </div>
    <div class="brain-stat">
      <div class="brain-stat-value text-hot-pink">${stats.intent}</div>
      <div class="brain-stat-label">Intent</div>
    </div>
    <div class="brain-stat">
      <div class="brain-stat-value text-coral">${stats.planning}</div>
      <div class="brain-stat-label">Planning</div>
    </div>
    <div class="brain-stat">
      <div class="brain-stat-value text-babyblue">${stats.tool}</div>
      <div class="brain-stat-label">Tools</div>
    </div>
    <div class="brain-stat">
      <div class="brain-stat-value text-purple">${stats.memory}</div>
      <div class="brain-stat-label">Memory</div>
    </div>
    <div class="brain-stat">
      <div class="brain-stat-value text-green">${stats.result}</div>
      <div class="brain-stat-label">Results</div>
    </div>
  `
}

// --- Live Event Stream ---
const planContainer = document.getElementById('agent-plan-container')

// --- Render agent plan ---
function renderAgentPlan(plan) {
  planContainer.innerHTML = '' // clear previous
  plan.steps.forEach((step, index) => {
    const stepDiv = document.createElement('div')
    stepDiv.classList.add('agent-step')
    stepDiv.dataset.stepId = index

    const label = document.createElement('div')
    label.textContent = step.name

    const progressWrapper = document.createElement('div')
    progressWrapper.classList.add('progress-bar')

    const progressFill = document.createElement('div')
    progressFill.classList.add('progress-fill')
    progressWrapper.appendChild(progressFill)

    stepDiv.appendChild(label)
    stepDiv.appendChild(progressWrapper)
    planContainer.appendChild(stepDiv)
  })
}

// --- Update a step's progress ---
function updateStepProgress(stepIndex, percent, status) {
  const stepDiv = planContainer.querySelector(`.agent-step[data-step-id="${stepIndex}"]`)
  if (!stepDiv) return

  const fill = stepDiv.querySelector('.progress-fill')
  fill.style.width = `${percent}%`

  stepDiv.classList.remove('step-running', 'step-complete')
  if (status === 'running') stepDiv.classList.add('step-running')
  if (status === 'complete') stepDiv.classList.add('step-complete')
}

// --- Hook into Rina events ---
rinaController.onAgentEvent((event) => {
  if (event.type === 'stepUpdate') {
    updateStepProgress(event.stepIndex, event.percent || 0, event.status)
  }
  if (event.type === 'planStart') {
    renderAgentPlan(event.plan)
  }
  if (event.type === 'reflection') updateDiagnostics()
})

// --- Listen for thinking stream events ---
window.rina.onThinking((step) => {
  const el = document.createElement('div')
  el.className = 'rina-thinking-step'
  el.textContent = '• ' + step.message
  thinkingStream.appendChild(el)

  // Auto-scroll to bottom
  thinkingStream.scrollTop = thinkingStream.scrollHeight

  // Clear thinking stream after a delay
  setTimeout(() => {
    thinkingStream.innerHTML = ''
  }, 5000)
})

// --- Initial Rendering ---
updateCodeWorkspace()
updateDiagnostics()
updateRinaStatusPanel()
updateBrainStats()
terminalOutput.innerHTML += `<div class="text-hot-pink font-bold pulse">Welcome to RinaWarp Terminal Pro</div>
<div class="text-gray-400">Type a command to begin... (Ctrl+K for command palette)</div>`

// --- Hook brain events ---
rinaController.onAgentEvent((event) => {
  if (event.type === 'thinking') {
    addBrainThought(event.thoughtType || 'reasoning', event.message || '')
    updateBrainStats()
  }
})

// --- Pane Resizers ---
;(function initResizers() {
  // Vertical: drag left/right column boundary
  const colResizer = document.getElementById('col-resizer')
  const leftCol = document.getElementById('left-col')
  const rightCol = document.getElementById('right-col')
  if (colResizer && leftCol && rightCol) {
    colResizer.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const startX = e.clientX
      const totalW = (leftCol.parentElement?.getBoundingClientRect().width ?? 800) - 4
      const startLeftW = leftCol.getBoundingClientRect().width
      colResizer.classList.add('dragging')
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      const onMove = (ev) => {
        const pct = Math.max(20, Math.min(80, ((startLeftW + ev.clientX - startX) / totalW) * 100))
        leftCol.style.flex = `0 0 ${pct}%`
        rightCol.style.flex = `0 0 ${100 - pct}%`
      }
      const onUp = () => {
        colResizer.classList.remove('dragging')
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  // Horizontal: drag workspace/brain boundary
  const rowResizer = document.getElementById('row-resizer')
  const brainPanel = document.getElementById('panel-brain')
  if (rowResizer && brainPanel) {
    rowResizer.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const startY = e.clientY
      const startBrainH = brainPanel.getBoundingClientRect().height
      rowResizer.classList.add('dragging')
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      const onMove = (ev) => {
        const newH = Math.max(80, Math.min(440, startBrainH + (startY - ev.clientY)))
        brainPanel.style.flex = `0 0 ${newH}px`
        brainPanel.style.height = `${newH}px`
      }
      const onUp = () => {
        rowResizer.classList.remove('dragging')
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }
})()

// --- Listen for brain events from main process ---
if (window.rina?.onBrainEvent) {
  window.rina.onBrainEvent((event) => {
    // Add animated brain event to visualization
    addAnimatedBrainEvent(event.type, event.message, event.progress)
    updateBrainStats()
  })
}

// Add animated brain event with slide-in effect
function addAnimatedBrainEvent(type, message, progress) {
  const flow = document.createElement('div')
  flow.className = 'brain-flow'
  flow.style.opacity = '0'

  const icon = document.createElement('div')
  icon.className = `brain-icon ${type}`
  icon.textContent = thoughtIcons[type] || '•'

  const step = document.createElement('div')
  step.className = 'brain-step'

  const label = document.createElement('div')
  label.className = 'brain-label'
  label.textContent = type.toUpperCase()

  const text = document.createElement('div')
  text.className = 'brain-text'
  text.textContent = message.length > 50 ? message.substring(0, 50) + '...' : message

  // Progress bar if available
  if (progress !== undefined) {
    const bar = document.createElement('div')
    bar.className = 'progress-bar'
    bar.style.height = '4px'
    bar.style.marginTop = '4px'
    const fill = document.createElement('div')
    fill.className = 'progress-fill'
    fill.style.width = `${progress}%`
    bar.appendChild(fill)
    step.appendChild(bar)
  }

  step.appendChild(label)
  step.appendChild(text)
  flow.appendChild(icon)
  flow.appendChild(step)

  brainVisualization.insertBefore(flow, brainVisualization.firstChild)

  // Animate in
  setTimeout(() => {
    flow.style.opacity = '1'
    flow.style.transition = 'opacity 0.3s ease'
  }, 50)

  // Keep only last 10 events
  while (brainVisualization.children.length > 10) {
    brainVisualization.removeChild(brainVisualization.lastChild)
  }
}

// --- Command Palette ---
const palette = document.getElementById('command-palette')
const paletteInput = document.getElementById('palette-input')
const paletteResults = document.getElementById('palette-results')

// Get live commands from Rina Controller
function getLiveCommands() {
  const baseCommands = [
    { cmd: 'deploy', desc: 'Deploy project', action: 'execute' },
    { cmd: 'build', desc: 'Build project', action: 'execute' },
    { cmd: 'test', desc: 'Run tests', action: 'execute' },
    { cmd: 'analyze', desc: 'Analyze code quality', action: 'execute' },
    { cmd: 'lint', desc: 'Run linter', action: 'execute' },
    { cmd: 'refactor', desc: 'Refactor code', action: 'execute' },
    { cmd: 'brain', desc: 'Open AI Brain panel', action: 'panel-brain' },
    { cmd: 'diagnostics', desc: 'Open Diagnostics panel', action: 'panel-diagnostics' },
    { cmd: 'agent', desc: 'Open Agent panel', action: 'panel-agent' },
    { cmd: 'shell', desc: 'Open Terminal panel', action: 'panel-shell' },
    { cmd: 'code', desc: 'Open Code panel', action: 'panel-code' },
    { cmd: 'workflow ci', desc: 'Run CI workflow', action: 'execute' },
    { cmd: 'workflow test', desc: 'Run test workflow', action: 'execute' },
    { cmd: 'status', desc: 'Show system status', action: 'execute' },
    { cmd: 'git status', desc: 'Show git status', action: 'execute' },
    { cmd: 'git commit', desc: 'Create git commit', action: 'execute' },
    { cmd: 'docker ps', desc: 'List Docker containers', action: 'execute' },
    { cmd: 'docker images', desc: 'List Docker images', action: 'execute' },
    { cmd: 'mode auto', desc: 'Set auto mode', action: 'mode-auto' },
    { cmd: 'mode assist', desc: 'Set assist mode', action: 'mode-assist' },
    { cmd: 'mode explain', desc: 'Set explain mode', action: 'mode-explain' },
    { cmd: 'help', desc: 'Show available commands', action: 'execute' },
  ]

  // Get project-specific commands from Rina Controller
  try {
    const plans = window.rina?.getPlans?.() || []
    plans.forEach((plan) => {
      baseCommands.push({
        cmd: plan.id,
        desc: plan.description,
        action: 'execute',
      })
    })
  } catch (e) {
    // Ignore errors, use base commands
  }

  return baseCommands
}

// Toggle palette with Ctrl+K
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault()
    palette.style.display = 'flex'
    paletteInput.focus()
  }

  if (e.key === 'Escape') {
    palette.style.display = 'none'
  }
})

// Close on background click
palette?.addEventListener('click', (e) => {
  if (e.target === palette) {
    palette.style.display = 'none'
  }
})

// Palette selected-index tracker
let _palIdx = -1
function _palHighlight() {
  const items = Array.from(paletteResults?.querySelectorAll('.palette-item') ?? [])
  items.forEach((el, i) => {
    el.classList.toggle('selected', i === _palIdx)
    if (i === _palIdx) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

// Filter commands as user types
paletteInput?.addEventListener('input', () => {
  _palIdx = -1
  const query = paletteInput.value.toLowerCase()
  const commands = getLiveCommands()

  paletteResults.innerHTML = ''

  const filtered = commands.filter((c) => c.cmd.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query))

  filtered.forEach((c) => {
    const item = document.createElement('div')
    item.className = 'palette-item'
    const icon = c.action?.startsWith('panel-') ? '📋' : c.action?.startsWith('mode-') ? '⚙️' : '▶️'
    item.innerHTML = `<span class="text-teal">${icon} ${c.cmd}</span> <span class="text-gray-400">- ${c.desc}</span>`
    item.onclick = () => runPaletteCommand(c.cmd, c.action)
    paletteResults.appendChild(item)
  })

  if (filtered.length === 0 && query.length > 0) {
    paletteResults.innerHTML = `<div class="palette-item text-gray-400">Press Enter to send to AI...</div>`
  }
})

// Run command from palette
function runPaletteCommand(cmd, action) {
  // Handle panel opening
  if (action?.startsWith('panel-')) {
    const panelName = action.replace('panel-', '')
    const tabButton = document.querySelector(`[data-panel="${panelName}"]`)
    if (tabButton) {
      tabButton.click()
    }
    palette.style.display = 'none'
    paletteInput.value = ''
    return
  }

  // Handle mode changes
  if (action?.startsWith('mode-')) {
    const mode = action.replace('mode-', '')
    window.rina?.setMode?.(mode)
    const termLine = document.createElement('div')
    termLine.textContent = `$ rina mode ${mode}`
    termLine.classList.add('glow-hotpink', 'pulse')
    terminalOutput.appendChild(termLine)

    const resLine = document.createElement('div')
    resLine.textContent = `Mode set to: ${mode}`
    resLine.classList.add('text-babyblue', 'pulse')
    terminalOutput.appendChild(resLine)

    palette.style.display = 'none'
    paletteInput.value = ''
    return
  }

  // Send to terminal
  const termLine = document.createElement('div')
  termLine.textContent = `$ rina ${cmd}`
  termLine.classList.add('glow-hotpink', 'pulse')
  terminalOutput.appendChild(termLine)

  // Execute
  runWithThinking(`rina ${cmd}`).then((response) => {
    if (response.text) {
      const resLine = document.createElement('div')
      resLine.textContent = response.text
      resLine.classList.add('text-babyblue', 'pulse')
      terminalOutput.appendChild(resLine)
    }
    if (response.output) {
      const outLine = document.createElement('div')
      outLine.textContent = JSON.stringify(response.output, null, 2)
      outLine.classList.add('text-teal', 'pulse')
      terminalOutput.appendChild(outLine)
    }
  })

  // Close palette
  palette.style.display = 'none'
  paletteInput.value = ''
  terminalInput.focus()
}

// Palette keyboard: arrow nav + Enter
paletteInput?.addEventListener('keydown', (e) => {
  const items = Array.from(paletteResults?.querySelectorAll('.palette-item') ?? [])
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    _palIdx = Math.min(_palIdx + 1, items.length - 1)
    _palHighlight()
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    _palIdx = Math.max(_palIdx - 1, -1)
    _palHighlight()
    return
  }
  if (e.key === 'Enter') {
    // If an item is highlighted via keyboard, click it
    if (_palIdx >= 0 && items[_palIdx]) {
      items[_palIdx].click()
      return
    }
    const query = paletteInput.value.trim()
    if (query) {
      const commands = getLiveCommands()
      const matched = commands.find((c) => c.cmd.toLowerCase() === query.toLowerCase())
      if (matched) {
        runPaletteCommand(matched.cmd, matched.action)
      } else {
        runPaletteCommand(query, 'execute')
      }
    }
  }
})

// ============================================================
// Interactive Chat + CLI Blocks (Warp-Style)
// ============================================================

// Chat elements - look for existing or create dynamically
let chatThread = document.getElementById('chat-thread')
let chatInput = document.getElementById('chat-input')
let chatSendBtn = document.getElementById('chat-send-btn')

// Create chat UI if not present in HTML
function ensureChatUI() {
  if (chatThread && chatInput && chatSendBtn) return true
  
  // Find a suitable container - try agent panel first
  const agentPanel = document.getElementById('panel-agent')
  if (!agentPanel) return false
  
  // Create chat container
  const chatContainer = document.createElement('div')
  chatContainer.id = 'chat-container'
  chatContainer.style.cssText = 'display: flex; flex-direction: column; height: 100%; overflow: hidden;'
  
  // Create chat thread
  chatThread = document.createElement('div')
  chatThread.id = 'chat-thread'
  chatThread.style.cssText = 'flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px;'
  
  // Create input area
  const inputArea = document.createElement('div')
  inputArea.style.cssText = 'display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--rw-border, rgba(255,255,255,0.1));'
  
  chatInput = document.createElement('textarea')
  chatInput.id = 'chat-input'
  chatInput.placeholder = 'Ask me anything...'
  chatInput.style.cssText = 'flex: 1; resize: none; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--rw-border, rgba(255,255,255,0.1)); background: var(--rw-panel, rgba(255,255,255,0.03)); color: var(--rw-text, #fff); font-family: inherit; font-size: 14px; min-height: 38px; max-height: 120px;'
  
  chatSendBtn = document.createElement('button')
  chatSendBtn.id = 'chat-send-btn'
  chatSendBtn.textContent = 'Send'
  chatSendBtn.style.cssText = 'padding: 8px 16px; border-radius: 6px; border: none; background: var(--rw-accent, #2de2e6); color: #000; font-weight: 600; cursor: pointer;'
  
  inputArea.appendChild(chatInput)
  inputArea.appendChild(chatSendBtn)
  
  chatContainer.appendChild(chatThread)
  chatContainer.appendChild(inputArea)
  
  // Insert after any existing content
  const existingChat = agentPanel.querySelector('#chat-container')
  if (!existingChat) {
    agentPanel.insertBefore(chatContainer, agentPanel.firstChild)
  }
  
  return true
}

// Initialize chat UI
if (ensureChatUI()) {
  // Append user message to chat
  function appendUserMessage(text) {
    if (!chatThread) return
    const msg = document.createElement('div')
    msg.className = 'chat-message chat-user'
    msg.style.cssText = 'align-self: flex-end; max-width: 80%; padding: 8px 12px; border-radius: 12px 12px 4px 12px; background: var(--rw-accent, #2de2e6); color: #000;'
    msg.textContent = text
    chatThread.appendChild(msg)
    chatThread.scrollTop = chatThread.scrollHeight
  }

  // Append agent message to chat
  function appendAgentMessage(text) {
    if (!chatThread) return
    const msg = document.createElement('div')
    msg.className = 'chat-message chat-agent'
    msg.style.cssText = 'align-self: flex-start; max-width: 80%; padding: 8px 12px; border-radius: 12px 12px 12px 4px; background: var(--rw-panel, rgba(255,255,255,0.1)); color: var(--rw-text, #fff);'
    msg.textContent = text
    chatThread.appendChild(msg)
    chatThread.scrollTop = chatThread.scrollHeight
  }

  // Append CLI block with Run button
  function appendCliBlock(command) {
    if (!chatThread) return
    const block = document.createElement('div')
    block.className = 'cli-block'
    block.style.cssText = 'align-self: flex-start; width: 100%; max-width: 500px; border-radius: 8px; border: 1px solid var(--rw-accent, #2de2e6); overflow: hidden; margin: 4px 0;'

    // Header with label
    const header = document.createElement('div')
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(45, 226, 230, 0.1); border-bottom: 1px solid var(--rw-border, rgba(255,255,255,0.1));'
    header.innerHTML = '<span style="color: var(--rw-accent, #2de2e6); font-size: 12px; font-weight: 600;">[ Run ]</span>'

    // Edit button
    const editBtn = document.createElement('button')
    editBtn.textContent = '✎ Edit'
    editBtn.style.cssText = 'background: transparent; border: none; color: var(--rw-muted, rgba(255,255,255,0.6)); cursor: pointer; font-size: 11px; padding: 2px 6px;'
    header.appendChild(editBtn)

    // Command textarea
    const textarea = document.createElement('textarea')
    textarea.value = command
    textarea.className = 'cli-command'
    textarea.style.cssText = 'width: 100%; padding: 10px; background: var(--rw-bg, #061013); color: var(--rw-text, #fff); border: none; resize: vertical; font-family: monospace; font-size: 13px; min-height: 60px; box-sizing: border-box;'
    
    let isEditing = false
    editBtn.onclick = () => {
      isEditing = !isEditing
      textarea.readOnly = !isEditing
      textarea.style.border = isEditing ? '1px solid var(--rw-accent, #2de2e6)' : 'none'
      editBtn.textContent = isEditing ? '✓ Done' : '✎ Edit'
      if (!isEditing) {
        textarea.focus()
      }
    }

    // Button row
    const btnRow = document.createElement('div')
    btnRow.style.cssText = 'display: flex; gap: 8px; padding: 8px 10px; background: rgba(45, 226, 230, 0.05);'

    const runBtn = document.createElement('button')
    runBtn.textContent = '▶ Run'
    runBtn.style.cssText = 'padding: 6px 14px; border-radius: 4px; border: none; background: var(--rw-accent, #2de2e6); color: #000; font-weight: 600; cursor: pointer; font-size: 12px;'

    const copyBtn = document.createElement('button')
    copyBtn.textContent = '⧉ Copy'
    copyBtn.style.cssText = 'padding: 6px 10px; border-radius: 4px; border: 1px solid var(--rw-border, rgba(255,255,255,0.2)); background: transparent; color: var(--rw-muted, rgba(255,255,255,0.6)); cursor: pointer; font-size: 12px;'

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(textarea.value)
      copyBtn.textContent = '✓ Copied!'
      setTimeout(() => { copyBtn.textContent = '⧉ Copy' }, 1500)
    }

    btnRow.appendChild(runBtn)
    btnRow.appendChild(copyBtn)

    // Output display
    const output = document.createElement('pre')
    output.className = 'cli-output'
    output.style.cssText = 'display: none; margin: 0; padding: 10px; background: var(--rw-bg, #061013); color: var(--rw-text, #fff); font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; border-top: 1px solid var(--rw-border, rgba(255,255,255,0.1)); white-space: pre-wrap; word-break: break-all;'

    // Run button handler
    runBtn.onclick = async () => {
      output.style.display = 'block'
      output.textContent = 'Running...'
      output.style.color = 'var(--rw-muted, rgba(255,255,255,0.6))'
      runBtn.disabled = true
      runBtn.textContent = '⏳ Running...'

      try {
        const result = await window.terminal.run(textarea.value)
        output.textContent = result.output || 'No output'
        output.style.color = result.output ? 'var(--rw-text, #fff)' : 'var(--rw-danger, #ff4d6d)'
      } catch (err) {
        output.textContent = 'Error: ' + err
        output.style.color = 'var(--rw-danger, #ff4d6d)'
      }

      runBtn.disabled = false
      runBtn.textContent = '▶ Run'
    }

    block.appendChild(header)
    block.appendChild(textarea)
    block.appendChild(btnRow)
    block.appendChild(output)

    chatThread.appendChild(block)
    chatThread.scrollTop = chatThread.scrollHeight
  }

  // Send message handler
  async function sendChatMessage() {
    const message = chatInput.value.trim()
    if (!message) return

    // Check for "run:" prefix - execute command directly
    if (message.toLowerCase().startsWith('run:')) {
      const command = message.slice(4).trim() // Remove "run:" prefix
      if (!command) {
        appendAgentMessage('Please provide a command after "run:". Example: run: ls -la')
        return
      }

      // Show user message
      appendUserMessage(message)
      chatInput.value = ''

      // Create and show CLI block with the command
      appendCliBlock(command)
      return
    }

    // Show user message
    appendUserMessage(message)
    chatInput.value = ''

    // Show typing indicator
    const typing = document.createElement('div')
    typing.className = 'chat-typing'
    typing.textContent = '...'
    typing.style.cssText = 'align-self: flex-start; color: var(--rw-muted, rgba(255,255,255,0.6)); font-size: 12px; padding: 4px 8px;'
    chatThread.appendChild(typing)
    chatThread.scrollTop = chatThread.scrollHeight

    try {
      // Send to agent
      const response = await window.agent.interpret(message)
      
      // Remove typing indicator
      typing.remove()

      // Show agent response
      if (response.text) {
        appendAgentMessage(response.text)
      }

      // If there are suggested commands, show as CLI blocks
      if (response.commands && Array.isArray(response.commands)) {
        response.commands.forEach(cmd => appendCliBlock(cmd))
      }
      
      // Also check for actions that might contain commands
      if (response.actions) {
        response.actions.forEach(action => {
          if (action.command) {
            appendCliBlock(action.command)
          }
        })
      }

    } catch (error) {
      typing.remove()
      appendAgentMessage('Error: ' + error.message)
    }
  }

  // Event listeners
  chatSendBtn.addEventListener('click', sendChatMessage)

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  })

  // Add welcome message if chat is empty
  if (chatThread && chatThread.children.length === 0) {
    appendAgentMessage('Hi! I\'m RinaWarp. Ask me anything about your terminal, code, or projects. I can also run commands for you - just ask!')
  }
}

// Make chat functions available globally for debugging
window.__chatAppendUser = () => { if (typeof appendUserMessage === 'function') appendUserMessage('test') }
window.__chatAppendCliBlock = () => { if (typeof appendCliBlock === 'function') appendCliBlock('echo "Hello from CLI block!"') }

// ============================================================
// Health Check - Run in DevTools console to verify architecture
// ============================================================
async function rinaHealth() {
  console.log('=== RinaWarp Health Check ===')
  
  // Check bridge
  console.log('Bridge (window.rina):', !!window.rina)
  console.log('Terminal API (window.terminal):', !!window.terminal)
  
  if (!window.rina) {
    console.error('FAIL: window.rina is undefined - preload not loading')
    return { ok: false, error: 'window.rina undefined' }
  }
  
  // Check runCommand
  console.log('runCommand function:', typeof window.rina.runCommand)
  
  // Run test command
  try {
    console.log('Running: echo health')
    const result = await window.rina.runCommand('echo health')
    console.log('Command result:', result)
    console.log('=== Health Check PASSED ===')
    return { ok: true, result }
  } catch (err) {
    console.error('=== Health Check FAILED ===')
    console.error('Error:', err)
    return { ok: false, error: String(err) }
  }
}

window.rinaHealth = rinaHealth
console.log('💡 Run rinaHealth() in console to verify IPC bridge')

// ============================================================
// Inline Command Approval UI (Security UX)
// ============================================================

/**
 * Show inline approval prompt for dangerous commands
 * @param {string} command - The command to approve
 * @param {Function} onApprove - Callback when approved
 * @param {Function} onReject - Callback when rejected
 */
function showApprovalPrompt(command, onApprove, onReject) {
  // Create overlay
  const overlay = document.createElement('div')
  overlay.className = 'approval-overlay'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `

  // Create prompt card
  const card = document.createElement('div')
  card.className = 'approval-card'
  card.style.cssText = `
    background: var(--rw-panel, #0d1117);
    border: 1px solid var(--rw-danger, #ff4d6d);
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  `

  // Header
  const header = document.createElement('div')
  header.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 16px;`
  header.innerHTML = `
    <span style="font-size: 24px;">⚠️</span>
    <span style="color: var(--rw-danger, #ff4d6d); font-size: 18px; font-weight: 600;">
      Agent wants to run command
    </span>
  `

  // Command display
  const cmdLabel = document.createElement('div')
  cmdLabel.style.cssText = `color: var(--rw-muted, rgba(255,255,255,0.6)); font-size: 12px; margin-bottom: 6px;`
  cmdLabel.textContent = 'Command:'

  const cmdPre = document.createElement('pre')
  cmdPre.style.cssText = `
    background: var(--rw-bg, #061013);
    border: 1px solid var(--rw-border, rgba(255,255,255,0.1));
    border-radius: 6px;
    padding: 12px;
    color: var(--rw-text, #fff);
    font-family: monospace;
    font-size: 13px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0 0 20px 0;
  `
  cmdPre.textContent = command

  // Risk assessment
  const riskDiv = document.createElement('div')
  riskDiv.style.cssText = `
    background: rgba(255, 77, 109, 0.1);
    border: 1px solid rgba(255, 77, 109, 0.3);
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 20px;
    font-size: 13px;
    color: var(--rw-danger, #ff4d6d);
  `
  riskDiv.innerHTML = `<strong>⚡ Risk:</strong> This command may modify your system. Review carefully before approving.`

  // Button row
  const btnRow = document.createElement('div')
  btnRow.style.cssText = `display: flex; gap: 12px; justify-content: flex-end;`

  // Reject button
  const rejectBtn = document.createElement('button')
  rejectBtn.textContent = 'Reject'
  rejectBtn.style.cssText = `
    padding: 10px 20px;
    border-radius: 6px;
    border: 1px solid var(--rw-border, rgba(255,255,255,0.2));
    background: transparent;
    color: var(--rw-text, #fff);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  `
  rejectBtn.onmouseover = () => {
    rejectBtn.style.background = 'rgba(255, 255, 255, 0.1)'
  }
  rejectBtn.onmouseout = () => {
    rejectBtn.style.background = 'transparent'
  }

  // Approve button
  const approveBtn = document.createElement('button')
  approveBtn.textContent = '✓ Approve & Run'
  approveBtn.style.cssText = `
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    background: var(--rw-danger, #ff4d6d);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `
  approveBtn.onmouseover = () => {
    approveBtn.style.background = '#ff6680'
  }
  approveBtn.onmouseout = () => {
    approveBtn.style.background = 'var(--rw-danger, #ff4d6d)'
  }

  // Button handlers
  const cleanup = () => {
    document.body.removeChild(overlay)
  }

  rejectBtn.onclick = () => {
    cleanup()
    if (onReject) onReject()
  }

  approveBtn.onclick = () => {
    cleanup()
    if (onApprove) onApprove()
  }

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup()
      if (onReject) onReject()
    }
  }
  document.addEventListener('keydown', escHandler)

  // Clean up esc handler when overlay is removed
  const originalRemoveChild = overlay.removeChild
  overlay.removeChild = function(...args) {
    document.removeEventListener('keydown', escHandler)
    return originalRemoveChild.apply(this, args)
  }

  // Assemble
  btnRow.appendChild(rejectBtn)
  btnRow.appendChild(approveBtn)
  card.appendChild(header)
  card.appendChild(cmdLabel)
  card.appendChild(cmdPre)
  card.appendChild(riskDiv)
  card.appendChild(btnRow)
  overlay.appendChild(card)
  document.body.appendChild(overlay)

  return { overlay, card }
}

/**
 * Check if a command is potentially dangerous
 * @param {string} command - The command to check
 * @returns {boolean} True if command requires approval
 */
function requiresApproval(command) {
  const dangerousPatterns = [
    /rm\s+-rf/i,
    /rmdir/i,
    /del\s+\/[sfq]/i,
    /mkfs\./i,
    /dd\s+if=/i,
    />\s*\/dev\//i,
    /chmod\s+777/i,
    /chown\s+-R/i,
    /:(){ \|:& }:/i,  // Fork bomb
    /curl.*\|\s*sh/i,
    /wget.*\|\s*sh/i,
    /shutdown/i,
    /reboot/i,
    /init\s+0/i,
    /init\s+6/i,
    /systemctl\s+stop/i,
    /docker\s+rm\s+-f/i,
    /docker\s+rmi/i,
    /killall/i,
    /pkill\s+-9/i,
    /git\s+push\s+--force/i,
    /git\s+push\s+-f/i,
    /git\s+reset\s+--hard/i,
    /git\s+clean\s+-fd/i,
    /npm\s+config\s+set/i,
    /yarn\s+config\s+set/i,
    /pip\s+install\s+--upgrade/i,
  ]

  return dangerousPatterns.some(pattern => pattern.test(command))
}

// Make approval functions available globally
window.__showApprovalPrompt = showApprovalPrompt
window.__requiresApproval = requiresApproval

// ============================================================
// UI Upgrade 5: Status Bar
// ============================================================

function createStatusBar() {
  if (document.getElementById('statusBar')) return

  const statusBar = document.createElement('div')
  statusBar.id = 'statusBar'
  statusBar.innerHTML = `
    <div class="status-left">
      <div class="status-indicator">
        <span class="status-dot connected"></span>
        <span>RinaWarp</span>
      </div>
      <span>•</span>
      <span>Connected</span>
      <span>•</span>
      <span>Agent Ready</span>
    </div>
    <div class="status-right">
      <span id="status-mode">Assist Mode</span>
    </div>
  `
  document.body.appendChild(statusBar)
}

// Update status dynamically
window.updateStatus = function(text) {
  const statusBar = document.getElementById('statusBar')
  if (statusBar) {
    const left = statusBar.querySelector('.status-left')
    if (left) left.innerHTML = text
  }
}

// Update status indicator (thinking, connected, disconnected)
window.updateStatusIndicator = function(state) {
  const dot = document.querySelector('#statusBar .status-dot')
  if (dot) {
    dot.className = 'status-dot ' + state
  }
}

// Initialize status bar on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  createStatusBar()
})

// ============================================================
// UI Upgrade 1: Terminal Block Creation Function
// ============================================================

function createTerminalBlock(cmd) {
  const block = document.createElement('div')
  block.className = 'terminal-block'

  block.innerHTML = `
    <div class="terminal-header">
      <span class="terminal-command">$ ${cmd}</span>
      <span class="terminal-meta">running...</span>
    </div>
    <div class="terminal-output"></div>
  `

  return block
}

window.createTerminalBlock = createTerminalBlock

// ============================================================
// UI Upgrade 2: Streaming Message Creation
// ============================================================

function streamMessage() {
  const chatThread = document.getElementById('chatThread')
  if (!chatThread) return null

  const msg = document.createElement('div')
  msg.className = 'agent-message agent-streaming'
  chatThread.appendChild(msg)

  return msg
}

window.streamMessage = streamMessage

// ============================================================
// UI Upgrade 4: Command Suggestions
// ============================================================

function suggestCommands(cmds) {
  const chatThread = document.getElementById('chatThread')
  if (!chatThread) return

  const box = document.createElement('div')
  box.className = 'command-suggestions'

  cmds.forEach((cmd) => {
    const btn = document.createElement('button')
    btn.textContent = cmd
    btn.onclick = () => {
      if (window.terminal?.run) {
        window.terminal.run(cmd)
      } else if (window.electronAPI?.ipcRenderer) {
        window.electronAPI.ipcRenderer.invoke('terminal:run', cmd)
      }
    }
    box.appendChild(btn)
  })

  chatThread.appendChild(box)
}

window.suggestCommands = suggestCommands

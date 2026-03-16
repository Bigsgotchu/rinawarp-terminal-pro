/**
 * Rina Developer Diagnostics Panel
 *
 * A live diagnostics panel for development/debugging.
 * Only loads when RINAWARP_DEV=1 environment variable is set.
 *
 * Toggle with: Ctrl+Shift+D
 */

import { rinaController, type RinaController, type AgentEvent } from './index.js'
import { memoryManager } from './memory/memory-manager.js'

let panel: HTMLDivElement | null = null
let isVisible = true

export function initDevDiagnostics(_controller: RinaController): void {
  // Create the panel
  panel = document.createElement('div')
  panel.id = 'dev-diagnostics'
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '0',
    right: '0',
    width: '400px',
    height: '250px',
    background: 'rgba(0,0,0,0.85)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '11px',
    zIndex: '9999',
    overflow: 'auto',
    padding: '10px',
    borderTopLeftRadius: '8px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
  })

  panel.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: bold; color: #0ff;">
      🟢 Rina Dev Diagnostics
    </div>
    <div id="dev-diagnostics-memory" style="margin-bottom: 8px; padding: 4px; background: #222; border-radius: 4px;"></div>
    <div id="dev-diagnostics-logs"></div>
  `

  document.body.appendChild(panel)

  const logsContainer = panel.querySelector('#dev-diagnostics-logs')
  const memoryContainer = panel.querySelector('#dev-diagnostics-memory')

  function updateMemoryDisplay(): void {
    if (!memoryContainer) return
    const stats = memoryManager.getStats()
    const longterm = memoryManager.longterm.get()

    memoryContainer.innerHTML = `
      <div style="color: #888; font-size: 10px;">
        <span style="color: #0ff;">📚 Memory:</span>
        Conv: ${stats.conversation.entries} | 
        Cmds: ${stats.workspace.commandCount} | 
        Learned: ${Object.keys(longterm.preferredCommands).length} | 
        Projects: ${longterm.knownProjects.length} | 
        Sessions: ${longterm.sessionCount}
      </div>
    `
  }

  // Initial memory display
  updateMemoryDisplay()

  function addLog(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    if (!logsContainer) return

    const entry = document.createElement('div')
    entry.style.marginBottom = '4px'
    entry.style.borderBottom = '1px solid #333'
    entry.style.paddingBottom = '2px'

    const timestamp = new Date().toLocaleTimeString()
    const color = type === 'error' ? '#f55' : type === 'success' ? '#5f5' : '#aaa'

    entry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> <span style="color: ${color};">${message}</span>`
    logsContainer.appendChild(entry)
    panel!.scrollTop = panel!.scrollHeight

    // Update memory display on new entries
    updateMemoryDisplay()
  }

  // Listen for agent-loop events
  rinaController.onAgentEvent((event: AgentEvent) => {
    let eventInfo = event.type
    switch (event.type) {
      case 'planning':
        eventInfo += `: ${event.goal.slice(0, 50)}`
        break
      case 'plan-created':
        eventInfo += `: ${event.plan.steps.length} steps`
        break
      case 'step-starting':
      case 'step-completed':
      case 'step-failed':
        eventInfo += `: ${event.step.step.description?.slice(0, 30)}`
        break
      case 'completed':
        eventInfo += `: ${event.results.length} results`
        break
      case 'error':
        eventInfo += `: ${event.error.slice(0, 50)}`
        break
    }
    addLog(`[agent] ${eventInfo}`)
  })

  // Intercept terminal commands
  const origRunTerminal = rinaController.tools.terminal.runTerminalCommand.bind(rinaController.tools.terminal)
  rinaController.tools.terminal.runTerminalCommand = async (...args: Parameters<typeof origRunTerminal>) => {
    const [command] = args
    addLog(`💻 Terminal: ${command}`)
    const result = await origRunTerminal(...args)
    const output = (result.output as { output?: string })?.output || result.error || 'ok'
    addLog(`   → ${output.slice(0, 80)}`, result.ok ? 'success' : 'error')

    // Learn successful commands
    if (result.ok && command) {
      memoryManager.workspace.recordCommand(String(command), 'terminal', true)
    }

    return result
  }

  // Intercept filesystem operations
  const origWriteFile = rinaController.tools.filesystem.writeFileSafe.bind(rinaController.tools.filesystem)
  rinaController.tools.filesystem.writeFileSafe = async (...args: Parameters<typeof origWriteFile>) => {
    const [filePath] = args
    addLog(`📁 Write: ${filePath}`)
    const result = await origWriteFile(...args)
    addLog(result.ok ? '   ✓ Written' : `   ✗ Failed: ${result.error}`, result.ok ? 'success' : 'error')
    return result
  }

  const origReadFile = rinaController.tools.filesystem.readFileSafe.bind(rinaController.tools.filesystem)
  rinaController.tools.filesystem.readFileSafe = async (...args: Parameters<typeof origReadFile>) => {
    const [filePath] = args
    addLog(`📁 Read: ${filePath}`)
    const result = await origReadFile(...args)
    const content = (result.output as { content?: string })?.content
    addLog(
      result.ok ? `   ✓ Content: ${content?.slice(0, 50)}` : `   ✗ Failed: ${result.error}`,
      result.ok ? 'success' : 'error'
    )
    return result
  }

  const origDeleteFile = rinaController.tools.filesystem.deleteFileSafe.bind(rinaController.tools.filesystem)
  rinaController.tools.filesystem.deleteFileSafe = async (...args: Parameters<typeof origDeleteFile>) => {
    const [filePath] = args
    addLog(`📁 Delete: ${filePath}`)
    const result = await origDeleteFile(...args)
    addLog(result.ok ? '   ✓ Deleted' : `   ✗ Failed: ${result.error}`, result.ok ? 'success' : 'error')
    return result
  }

  // Toggle panel visibility with Ctrl+Shift+D
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      isVisible = !isVisible
      panel!.style.display = isVisible ? 'block' : 'none'
      addLog(isVisible ? 'Panel visible' : 'Panel hidden (Ctrl+Shift+D to show)')
    }
  })

  addLog('Diagnostics initialized', 'success')
  addLog('Press Ctrl+Shift+D to toggle', 'info')
}

declare global {
  interface Window {
    initRinaDevDiagnostics: (controller: RinaController) => void
  }
}

// Auto-init if in dev mode
if (
  typeof window !== 'undefined' &&
  (window as unknown as { process?: { env?: Record<string, string> } }).process?.env?.RINAWARP_DEV === '1'
) {
  window.initRinaDevDiagnostics = initDevDiagnostics
}

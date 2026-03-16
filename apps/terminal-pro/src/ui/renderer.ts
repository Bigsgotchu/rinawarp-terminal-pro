import { initSidebar } from './components/sidebar.js'
import { initTerminal } from './components/terminal.js'
import { initCodeEditor } from './components/code-editor.js'
import { initChat } from './components/chat.js'
import { initQuickStart } from './components/quick-start.js'

const appContainer = document.getElementById('rw-app')
if (!appContainer) {
  throw new Error('No container found for RinaWarp App')
}

// Create Warp-style hybrid layout
appContainer.innerHTML = `
  <aside class="rw-sidebar" id="sidebar"></aside>
  <main class="rw-main">
    <!-- Timeline / PTY Terminal -->
    <section class="rw-terminal" id="terminal">
      <div class="rw-terminal-header">
        <span>Live Terminal</span>
        <span id="ptyStatus">disconnected</span>
      </div>
      <div class="rw-terminal-body" id="ptyTerminal"></div>
    </section>
    
    <!-- Code Editor Panel -->
    <section class="rw-code" id="code">
      <div class="rw-code-header">
        <span>Code Workspace</span>
        <button onclick="refreshCodeWorkspace()" class="rw-btn-small">Refresh</button>
      </div>
      <div class="rw-code-body">
        <div id="codeFiles" class="rw-code-files"></div>
        <pre id="codePreview" class="rw-code-preview"></pre>
        <textarea id="codeEditor" class="rw-code-editor" placeholder="Draft edits here..."></textarea>
        <div class="rw-code-actions">
          <button onclick="toggleDiffMode()" class="rw-btn">Toggle Diff</button>
          <button onclick="previewCodePatch()" class="rw-btn">Preview</button>
          <button onclick="applyCodePatch()" class="rw-btn">Apply</button>
          <button onclick="resetCodeDraft()" class="rw-btn">Reset</button>
        </div>
        <pre id="codeDiff" class="rw-code-diff"></pre>
      </div>
    </section>
    
    <!-- Chat Panel -->
    <aside class="rw-chat" id="chat">
      <div class="rw-chat-header">
        <span>Chat Thread</span>
        <button onclick="clearChatThread()" class="rw-btn-small">Clear</button>
      </div>
    </aside>
  </main>

  <!-- Input Area -->
  <div class="rw-input-area">
    <textarea id="intent" class="rw-chat-input" placeholder="Type commands or ask the agent..."></textarea>
    <div class="rw-chat-hints">
      <button class="hint-chip" onclick="applyIntentHint('Fix project errors and explain what changed')">Fix Code</button>
      <button class="hint-chip" onclick="applyIntentHint('Add tests for changed files')">Add Tests</button>
      <button class="hint-chip" onclick="applyIntentHint('Refactor module safely')">Safe Refactor</button>
    </div>
  </div>
`

// Init modules
initQuickStart() // Show welcome panel
initSidebar(document.getElementById('sidebar')!)
initTerminal(document.getElementById('ptyTerminal')!)
initCodeEditor({
  filesContainer: document.getElementById('codeFiles')!,
  preview: document.getElementById('codePreview')!,
  editor: document.getElementById('codeEditor') as HTMLTextAreaElement,
})
initChat(document.getElementById('chat')!)

// Make helper functions globally available
;(window as any).refreshCodeWorkspace = () => {
  const projectRoot = (document.getElementById('projectRoot') as HTMLInputElement)?.value || '.'
  // Trigger file reload - the code-editor module handles this
  window.dispatchEvent(new CustomEvent('refresh-code-workspace', { detail: { projectRoot } }))
}
;(window as any).clearChatThread = () => {
  const chatThread = document.getElementById('chatThread')
  if (chatThread) chatThread.innerHTML = ''
}
;(window as any).toggleDiffMode = () => {
  // This is handled in code-editor.ts via previewCodePatch
  ;(window as any).previewCodePatch()
}
;(window as any).applyIntentHint = (hint: string) => {
  const input = document.getElementById('intent') as HTMLTextAreaElement
  if (input) {
    input.value = hint
    input.focus()
  }
}

// Conditional diagnostics loader - only in dev mode

if ((window as any).process?.env?.RINAWARP_DEV === '1') {
  import('../rina/dev-diagnostics.js')
    .then((module) => {
      // Import rinaController dynamically to avoid circular deps
      import('../rina/index.js').then((rina) => {
        module.initDevDiagnostics(rina.rinaController)
      })
    })
    .catch(console.error)
}

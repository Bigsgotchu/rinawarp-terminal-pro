// Quick Start Panel - Welcome overlay for new users

export function initQuickStart() {
  const container = document.createElement('div')
  container.id = 'quickStartPanel'
  container.className = 'rw-quick-start'

  container.innerHTML = `
    <div class="qs-header">
      <h2>Welcome to RinaWarp Terminal Pro</h2>
      <button id="qsCloseBtn" class="qs-btn">Close</button>
    </div>
    <div class="qs-body">
      <p>Use RinaWarp like Warp.dev, but with AI-powered actions!</p>
      <ol>
        <li><strong>Terminal:</strong> Type commands directly. Watch output in real-time.</li>
        <li><strong>Chat:</strong> Ask the AI to fix code, run scripts, or explain changes.</li>
        <li><strong>Code Editor:</strong> Browse files, edit, see live diffs, and apply patches.</li>
        <li><strong>Sidebar:</strong> Manage sessions, plans, and quick actions.</li>
        <li><strong>Quick Actions:</strong> Scan workspace, lint & fix, run tests, restart/stop daemon.</li>
      </ol>
      <p>Hint Chips below the input area give one-click commands.</p>
      <p>Try: <em>"Fix this codebase"</em> or <em>"Add tests for my changes"</em>.</p>
    </div>
  `

  document.body.appendChild(container)

  document.getElementById('qsCloseBtn')?.addEventListener('click', () => {
    container.style.display = 'none'
  })
}

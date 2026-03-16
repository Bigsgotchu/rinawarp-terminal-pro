// Type declarations for preload APIs - use window.rina from preload.ts
// The rina API is already typed in preload.ts

export function initTerminal(container: HTMLElement) {
  container.innerHTML = `
    <div class="rw-terminal-header">
      <span>Live Terminal</span>
      <span id="ptyStatus">disconnected</span>
    </div>
    <div id="ptyTerminal" class="rw-terminal-body"></div>
  `

  const ptyPane = document.getElementById('ptyTerminal')!
  const ptyStatus = document.getElementById('ptyStatus')!

  // Listen for PTY output
  if (window.rina) {
    window.rina.onPtyData((data: string) => {
      ptyPane.textContent += data
      ptyPane.scrollTop = ptyPane.scrollHeight
    })

    window.rina.onPtyExit((evt: { exitCode: number; signal: number }) => {
      ptyStatus.textContent = `exited (code: ${evt.exitCode})`
    })
  }
}

// Send command to PTY
export function sendPtyCommand(cmd: string) {
  if (window.rina) {
    window.rina.ptyWrite(cmd + '\n')
  }
}

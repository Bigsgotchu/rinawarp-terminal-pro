import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { rinaWarpTheme } from '../theme/rinawarp-theme'

export function TerminalPane() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [status, setStatus] = useState<'starting' | 'ready' | 'exited' | 'error'>('starting')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 5000,
      theme: rinaWarpTheme,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    terminal.focus()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    let resizeFrame = 0
    let lastSize = { cols: 0, rows: 0 }
    const fitAndResize = () => {
      try {
        fitAddon.fit()
        if (terminal.cols !== lastSize.cols || terminal.rows !== lastSize.rows) {
          lastSize = { cols: terminal.cols, rows: terminal.rows }
          window.rina.ptyResize(terminal.cols, terminal.rows).catch(() => {})
        }
      } catch {
        // xterm can briefly report zero-sized containers during first layout.
      }
    }

    const scheduleFit = () => {
      if (resizeFrame) return
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0
        fitAndResize()
      })
    }
    window.addEventListener('resize', scheduleFit)

    const dataDisposable = terminal.onData((data) => {
      window.rina.ptyWrite(data).catch((error) => {
        console.error('Failed to write PTY input:', error)
      })
    })

    const unsubscribeData = window.rina.onPtyData((data) => {
      terminal.write(data)
    })
    const unsubscribeExit = window.rina.onPtyExit((event) => {
      setStatus('exited')
      terminal.writeln('')
      terminal.writeln(`[process exited with code ${event.exitCode}]`)
    })

    window.rina
      .ptyStart({ cols: terminal.cols || 80, rows: terminal.rows || 30 })
      .then(() => {
        setStatus('ready')
        scheduleFit()
      })
      .catch((error) => {
        setStatus('error')
        terminal.writeln(`Failed to start terminal: ${error instanceof Error ? error.message : String(error)}`)
      })

    return () => {
      window.removeEventListener('resize', scheduleFit)
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      dataDisposable.dispose()
      unsubscribeData()
      unsubscribeExit()
      window.rina.ptyStop().catch(() => {})
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [])

  return (
    <section data-testid="terminal" className="flex min-h-0 flex-1 flex-col border-t border-zinc-800 bg-black">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 text-xs text-zinc-400">
        <span className="font-medium text-zinc-300">Terminal</span>
        <span className="capitalize">{status}</span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden p-2" />
    </section>
  )
}

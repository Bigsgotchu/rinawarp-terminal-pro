import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { rinaWarpTheme } from '../theme/rinawarp-theme'

export function TerminalPane() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'starting' | 'ready' | 'exited' | 'error'>('starting')

  useEffect(() => {
    const container = containerRef.current
    if (!open || !container) return

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

    const copySelection = async () => {
      const selection = terminal.getSelection()
      if (!selection) return false
      await navigator.clipboard.writeText(selection)
      return true
    }

    const pasteClipboard = async () => {
      const text = await navigator.clipboard.readText()
      if (!text) return false
      await window.rina.ptyWrite(text)
      return true
    }

    terminal.attachCustomKeyEventHandler((event) => {
      const isCopyShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.code === 'KeyC'
      const isPasteShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.code === 'KeyV'

      if (event.type === 'keydown' && isCopyShortcut) {
        copySelection().catch((error) => console.error('Failed to copy terminal selection:', error))
        return false
      }

      if (event.type === 'keydown' && isPasteShortcut) {
        pasteClipboard().catch((error) => console.error('Failed to paste into terminal:', error))
        return false
      }

      return true
    })

    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain')
      if (!text) return
      event.preventDefault()
      window.rina.ptyWrite(text).catch((error) => {
        console.error('Failed to paste event text into terminal:', error)
      })
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      const hasSelection = Boolean(terminal.getSelection())
      const action = hasSelection ? copySelection() : pasteClipboard()
      action.catch((error) => {
        console.error(hasSelection ? 'Failed to copy terminal selection:' : 'Failed to paste into terminal:', error)
      })
    }

    container.addEventListener('paste', handlePaste)
    container.addEventListener('contextmenu', handleContextMenu)

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
      container.removeEventListener('paste', handlePaste)
      container.removeEventListener('contextmenu', handleContextMenu)
      dataDisposable.dispose()
      unsubscribeData()
      unsubscribeExit()
      window.rina.ptyStop().catch(() => {})
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [open])

  return (
    <section
      data-testid="terminal-surface"
      className="shrink-0 border-t border-zinc-800 bg-zinc-950/95"
      aria-label="Execution Details"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between px-5 text-left text-xs text-zinc-400 hover:bg-zinc-900"
        aria-expanded={open}
        aria-controls="terminal-execution-trace"
      >
        <span>
          <span className="font-semibold text-zinc-200">Execution Details</span>
        </span>
        <span className="capitalize text-zinc-500">{open ? status : 'collapsed'}</span>
      </button>
      {open && (
        <div id="terminal-execution-trace" className="h-56 border-t border-zinc-800 bg-black">
          <div ref={containerRef} className="h-full overflow-hidden p-2" />
        </div>
      )}
    </section>
  )
}

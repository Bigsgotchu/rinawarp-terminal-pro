/**
 * Palette UI controller - glue layer combining state, render, and events.
 * Hardened: IME-safe, editable-aware, no double-fire, premium Esc behavior.
 */

import type { PaletteCommand } from './model.js'
import { saveRecent } from './recent.js'
import { createInitialState, setCommands, type PaletteState } from './state.js'
import { createRenderContext, renderShell, renderList, setActiveAria, type RenderContext } from './render.js'
import { createEventHandlers, wireInput } from './events.js'
import { applyFilter } from './filter.js'

type Deps = { backdrop: HTMLElement; host: HTMLElement }

type Controller = {
  open: () => void
  close: () => void
  isOpen: () => boolean
  setCommands: (commands: PaletteCommand[]) => void
}

type InternalState = {
  state: PaletteState
  ctx: RenderContext | null
  lastFocus: Element | null
  lastQuery: string
  cleanupInput: (() => void) | null
  eventHandlers: ReturnType<typeof createEventHandlers> | null
}

function createInternalState(): InternalState {
  return {
    state: createInitialState(),
    ctx: null,
    lastFocus: null,
    lastQuery: '',
    cleanupInput: null,
    eventHandlers: null,
  }
}

function activate(internal: InternalState, idx: number): void {
  const { state, ctx } = internal
  if (!state.filtered.length || !ctx) return
  state.activeIndex = idx
  setActiveAria(ctx, state.activeIndex)
}

async function runCommandAt(internal: InternalState, idx: number, close: () => void, open: () => void): Promise<void> {
  const cmd = internal.state.filtered[idx]
  if (!cmd) return
  try {
    saveRecent(cmd.id)
    close()
    await cmd.run()
  } catch (e) {
    open()
    console.error('[palette] command failed', e)
  }
}

function doOpen(internal: InternalState, deps: Deps, onFilter: (q: string) => void): void {
  const { backdrop, host } = deps
  const { state } = internal

  if (state.isOpen) return
  state.isOpen = true
  internal.lastFocus = document.activeElement

  // Reuse ctx if already created; renderShell clears host.innerHTML
  internal.ctx = internal.ctx ?? createRenderContext(host)
  renderShell(internal.ctx)

  backdrop.style.display = 'flex'
  backdrop.setAttribute('aria-hidden', 'false')

  // Use real filtering behavior (recents-first, routes, etc.)
  applyFilter(internal.lastQuery, state, state.commands)
  state.activeIndex = 0

  renderList(internal.ctx, state, (idx) => activate(internal, idx))
  setActiveAria(internal.ctx, state.activeIndex)

  // Restore previous query if any
  if (internal.lastQuery) {
    internal.ctx.input.value = internal.lastQuery
  }

  internal.cleanupInput = wireInput(internal.ctx.input, onFilter)
}

function doClose(internal: InternalState, backdrop: HTMLElement): void {
  const { state, ctx, lastFocus, cleanupInput, eventHandlers } = internal

  if (!state.isOpen) return
  state.isOpen = false

  backdrop.style.display = 'none'
  backdrop.setAttribute('aria-hidden', 'true')

  if (eventHandlers) {
    backdrop.removeEventListener('click', eventHandlers.onBackdropClick)
    window.removeEventListener('keydown', eventHandlers.onKeydown, { capture: true } as EventListenerOptions)
    internal.eventHandlers = null
  }

  if (cleanupInput) {
    cleanupInput()
    internal.cleanupInput = null
  }

  if (lastFocus && (lastFocus as HTMLElement).focus) {
    try {
      ;(lastFocus as HTMLElement).focus()
    } catch {
      // no-op
    }
  }
}

export function createPaletteController(deps: Deps): Controller {
  const { backdrop, host } = deps
  const internal = createInternalState()

  function onFilter(query: string): void {
    if (!internal.ctx) return
    internal.lastQuery = query
    applyFilter(query, internal.state, internal.state.commands)
    renderList(internal.ctx, internal.state, (idx) => activate(internal, idx))
  }

  function open(): void {
    doOpen(internal, deps, onFilter)

    internal.eventHandlers = createEventHandlers(internal.state, internal.ctx!, {
      backdrop,
      close,
      runCommandAt: (idx) => {
        void runCommandAt(internal, idx, close, open)
      },
      onActiveIndexChanged: (idx) => activate(internal, idx),
      onFilterChanged: onFilter,
    })
    backdrop.addEventListener('click', internal.eventHandlers.onBackdropClick)
    window.addEventListener('keydown', internal.eventHandlers.onKeydown, { capture: true })

    internal.ctx!.input.focus()
    internal.ctx!.input.select()
  }

  function close(): void {
    doClose(internal, backdrop)
  }

  function isOpen(): boolean {
    return internal.state.isOpen
  }

  function setCommandsExternal(next: PaletteCommand[]): void {
    setCommands(internal.state, next)
    if (internal.state.isOpen && internal.ctx) {
      onFilter(internal.ctx.input.value)
    }
  }

  return {
    open,
    close,
    isOpen,
    setCommands: setCommandsExternal,
  }
}

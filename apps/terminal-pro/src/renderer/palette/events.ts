import type { PaletteState } from './state.js'
import type { RenderContext } from './render.js'

type BackdropClickHandler = (ev: MouseEvent) => void
type KeydownHandler = (ev: KeyboardEvent) => void

export function wireInput(_input: HTMLInputElement, _onChange: (q: string) => void): () => void {
  console.warn('[ui] legacy palette events are disabled; use renderer.prod.ts')
  return () => {}
}

export function handleNavigationKey(_ev: KeyboardEvent, _state: PaletteState): boolean {
  return false
}

export function handleActionKey(
  _ev: KeyboardEvent,
  _state: PaletteState,
  _deps: { runAt: (idx: number) => void; close: () => void; clearQuery: () => void; queryValue: () => string }
): boolean {
  return false
}

export type EventHandlers = {
  onKeydown: KeydownHandler
  onBackdropClick: BackdropClickHandler
}

export function createEventHandlers(
  _state: PaletteState,
  _ctx: RenderContext,
  _deps: {
    backdrop: HTMLElement
    close: () => void
    runCommandAt: (idx: number) => void
    onActiveIndexChanged?: (idx: number) => void
    onFilterChanged?: (q: string) => void
  }
): EventHandlers {
  console.warn('[ui] legacy palette events are disabled; use renderer.prod.ts')
  return {
    onKeydown: () => {},
    onBackdropClick: () => {},
  }
}

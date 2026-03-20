import type { PaletteState } from './state.js'

export type RenderContext = {
  host: HTMLElement
  input: HTMLInputElement
  list: HTMLElement
  foot: HTMLElement
}

export function createRenderContext(host: HTMLElement): RenderContext {
  return {
    host,
    input: document.createElement('input'),
    list: document.createElement('div'),
    foot: document.createElement('div'),
  }
}

export function renderShell(_ctx: RenderContext): void {
  console.warn('[ui] legacy palette render is disabled; use renderer.prod.ts')
}

export function renderList(_ctx: RenderContext, _state: PaletteState, _onActivate: (idx: number) => void): void {
  console.warn('[ui] legacy palette render is disabled; use renderer.prod.ts')
}

export function setActiveAria(_ctx: RenderContext, _activeIndex: number): void {}

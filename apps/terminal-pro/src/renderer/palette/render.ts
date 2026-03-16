/**
 * Palette rendering - DOM creation and updates.
 */

import type { PaletteCommand } from './model.js'
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

export function renderShell(ctx: RenderContext): void {
  // Clear host to ensure idempotent rendering
  ctx.host.innerHTML = ''

  const head = document.createElement('div')
  head.className = 'rw-palette-head'

  ctx.input.className = 'rw-palette-input'
  ctx.input.type = 'text'
  ctx.input.placeholder = 'Type a command… (>) for command mode'
  ctx.input.autocomplete = 'off'
  ctx.input.spellcheck = false

  ctx.list.className = 'rw-palette-list'
  ctx.foot.className = 'rw-palette-foot'
  ctx.foot.innerHTML = `<span>↑↓ navigate • Enter run • > command mode</span><span>Esc close</span>`

  head.appendChild(ctx.input)
  ctx.host.appendChild(head)
  ctx.host.appendChild(ctx.list)
  ctx.host.appendChild(ctx.foot)
}

export function renderList(ctx: RenderContext, state: PaletteState, onActivate: (idx: number) => void): void {
  ctx.list.innerHTML = ''
  const filtered = state.filtered

  if (!filtered.length) {
    const empty = document.createElement('div')
    empty.className = 'rw-palette-empty'
    empty.textContent = 'No matches.'
    ctx.list.appendChild(empty)
    return
  }

  for (let i = 0; i < filtered.length; i += 1) {
    const c = filtered[i]
    const row = document.createElement('div')
    row.className = 'rw-palette-item'
    row.setAttribute('role', 'option')
    row.setAttribute('tabindex', '-1')
    row.setAttribute('data-cmd-id', c.id)
    row.setAttribute('aria-selected', i === state.activeIndex ? 'true' : 'false')

    const ico = document.createElement('span')
    ico.className = 'rw-palette-ico'
    ico.setAttribute('aria-hidden', 'true')
    ico.textContent = c.icon ?? '⌘'

    const title = document.createElement('div')
    title.style.display = 'flex'
    title.style.flexDirection = 'column'

    const t = document.createElement('div')
    t.textContent = c.title
    t.style.fontWeight = '600'
    t.style.fontSize = '13px'

    const sub = document.createElement('div')
    sub.textContent = c.subtitle ?? ''
    sub.style.fontSize = '12px'
    sub.style.opacity = '0.75'

    title.appendChild(t)
    if (c.subtitle) title.appendChild(sub)

    const meta = document.createElement('div')
    meta.className = 'rw-palette-meta'
    meta.textContent = c.meta ?? ''

    row.appendChild(ico)
    row.appendChild(title)
    if (c.meta) row.appendChild(meta)

    const capturedIndex = i
    row.addEventListener('mouseenter', () => onActivate(capturedIndex))
    row.addEventListener('click', () => onActivate(capturedIndex))

    ctx.list.appendChild(row)
  }
}

export function setActiveAria(ctx: RenderContext, activeIndex: number): void {
  const items = Array.from(ctx.list.querySelectorAll<HTMLElement>('[data-cmd-id]'))
  items.forEach((it, i) => it.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false'))
  const active = items[activeIndex]
  if (active) active.scrollIntoView({ block: 'nearest' })
}

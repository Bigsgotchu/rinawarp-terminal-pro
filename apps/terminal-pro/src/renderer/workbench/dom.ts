/**
 * Minimal DOM utilities for store-driven workbench rendering.
 *
 * Notes:
 * - Canonical workbench surfaces should mount nodes via replaceChildren().
 * - During migration we still accept trusted, store-authored markup and parse it
 *   through a single helper instead of scattering innerHTML assignments.
 */

export type Child = Node | string | number | boolean | null | undefined

export type Props = {
  class?: string
  id?: string
  title?: string
  role?: string
  tabindex?: number
  disabled?: boolean
  hidden?: boolean
  ariaLabel?: string
  ariaPressed?: boolean
  ariaExpanded?: boolean
  ariaSelected?: boolean
  dataset?: Record<string, string | undefined>
  on?: Partial<Record<keyof GlobalEventHandlersEventMap, (ev: Event) => void>>
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)

  if (props) {
    if (props.class) node.className = props.class
    if (props.id) node.id = props.id
    if (props.title) node.title = props.title
    if (props.role) node.setAttribute('role', props.role)
    if (props.tabindex !== undefined) node.tabIndex = props.tabindex
    if (props.disabled !== undefined) (node as HTMLButtonElement).disabled = !!props.disabled
    if (props.hidden !== undefined) node.hidden = !!props.hidden

    if (props.ariaLabel) node.setAttribute('aria-label', props.ariaLabel)
    if (props.ariaPressed !== undefined) node.setAttribute('aria-pressed', String(!!props.ariaPressed))
    if (props.ariaExpanded !== undefined) node.setAttribute('aria-expanded', String(!!props.ariaExpanded))
    if (props.ariaSelected !== undefined) node.setAttribute('aria-selected', String(!!props.ariaSelected))

    if (props.dataset) {
      for (const [key, value] of Object.entries(props.dataset)) {
        if (value !== undefined) node.dataset[key] = value
      }
    }

    if (props.on) {
      for (const [key, fn] of Object.entries(props.on)) {
        if (fn) node.addEventListener(key, fn as EventListener)
      }
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') continue
    if (typeof child === 'string' || typeof child === 'number') node.appendChild(document.createTextNode(String(child)))
    else node.appendChild(child)
  }

  return node
}

export function clear(node: Element): void {
  node.replaceChildren()
}

export function mount(container: Element, node: Node): void {
  container.replaceChildren(node)
}

export function markupFragment(markup: string): DocumentFragment {
  return document.createRange().createContextualFragment(markup)
}

export function mountMarkup(container: Element, markup: string): void {
  mount(container, markupFragment(markup))
}

export function appendMarkup(container: Element, markup: string): void {
  container.appendChild(markupFragment(markup))
}

export function closestActionTarget(ev: Event): HTMLElement | null {
  const target = ev.target as HTMLElement | null
  if (!target) return null
  return target.closest?.('[data-action]') ?? null
}

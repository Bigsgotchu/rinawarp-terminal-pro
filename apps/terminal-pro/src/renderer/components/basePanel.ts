export class BasePanel {
  public root: HTMLElement
  private cleanup: Array<() => void> = []

  constructor(selector: string) {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`Panel root ${selector} not found`)
    this.root = el as HTMLElement
  }

  setHeader(title: string) {
    const head = this.root.querySelector('.rw-panel-head')
    if (head) head.textContent = title
  }

  clearContent() {
    const body = this.root.querySelector('.rw-panel-body')
    if (body) body.innerHTML = ''
  }

  appendContent(el: HTMLElement | string) {
    const body = this.root.querySelector('.rw-panel-body')
    if (!body) return
    if (typeof el === 'string') {
      const template = document.createElement('template')
      template.innerHTML = el
      body.appendChild(template.content.cloneNode(true))
    } else {
      body.appendChild(el)
    }
  }

  protected registerCleanup(cleanup: () => void) {
    this.cleanup.push(cleanup)
  }

  destroy() {
    while (this.cleanup.length > 0) {
      const next = this.cleanup.pop()
      try {
        next?.()
      } catch {
        // Ignore panel cleanup failures.
      }
    }
  }
}

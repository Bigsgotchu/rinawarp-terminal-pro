import { createWorkbenchShellFrameModel } from '../modern/workbenchShellFrameModel.js'
import { renderWorkbenchShellFrame } from '../modern/workbenchShellSurface.js'

export function buildAgentShellFrameMarkup(): string {
  return renderWorkbenchShellFrame(createWorkbenchShellFrameModel())
}

export function mountAgentShellFrame(options?: { body?: HTMLElement }): void {
  const body = options?.body ?? document.body
  body.innerHTML = renderWorkbenchShellFrame(createWorkbenchShellFrameModel())
  body.setAttribute('data-rw-shell-frame', 'agent-shell')
}

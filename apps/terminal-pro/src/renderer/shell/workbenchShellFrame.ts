import { createWorkbenchShellFrameModel } from '../modern/workbenchShellFrameModel.js'
import { renderWorkbenchShellFrame } from '../modern/workbenchShellSurface.js'

export function buildWorkbenchShellFrameMarkup(): string {
  return renderWorkbenchShellFrame(createWorkbenchShellFrameModel())
}

export function mountWorkbenchShellFrame(options?: { body?: HTMLElement }): void {
  const body = options?.body ?? document.body
  body.innerHTML = renderWorkbenchShellFrame(createWorkbenchShellFrameModel())
  body.setAttribute('data-rw-shell-frame', 'workbench-shell')
}

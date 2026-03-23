import { mountWorkbenchShellFrame } from '../shell/workbenchShellFrame.js'
import { initProductionRenderer } from '../renderer.prod.js'

export async function initWorkbenchShellRenderer(): Promise<void> {
  document.documentElement.setAttribute('data-rw-renderer-target', 'workbench-shell')
  mountWorkbenchShellFrame()

  // The shell frame is canonical here; execution and behavior still
  // delegate to the trusted production renderer underneath.
  await initProductionRenderer()
}

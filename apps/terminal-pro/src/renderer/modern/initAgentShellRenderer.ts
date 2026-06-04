import { mountAgentShellFrame } from '../shell/workbenchShellFrame.js'
import { initProductionRenderer } from '../renderer.prod.js'

export async function initAgentShellRenderer(): Promise<void> {
  document.documentElement.setAttribute('data-rw-renderer-target', 'agent-shell')
  mountAgentShellFrame()

  // The Agent Shell frame is canonical here; execution and behavior still
  // delegate to the trusted production renderer underneath.
  await initProductionRenderer()
}

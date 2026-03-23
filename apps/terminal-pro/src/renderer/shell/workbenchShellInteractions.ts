import { createWorkbenchNavigator } from '../actions/navigationOwner.js'
import { requestWorkspaceSelection } from '../actions/workspaceOwnership.js'
import type { WorkbenchStore } from '../workbench/store.js'

type WorkbenchShellInteractionsArgs = {
  store: WorkbenchStore
  trackRendererEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>
  root?: Document | HTMLElement
}

export function createWorkbenchShellInteractions(args: WorkbenchShellInteractionsArgs) {
  const navigateToPanel = createWorkbenchNavigator(args.store, {
    trackRendererEvent: args.trackRendererEvent,
  })

  const onClick = async (event: Event) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    const shellOwnedTarget = target.closest<HTMLElement>('[data-shell-owned="true"]')
    if (!shellOwnedTarget) return

    const shellNav = shellOwnedTarget.closest<HTMLElement>('[data-shell-nav]')
    if (shellNav?.dataset.shellNav) {
      event.preventDefault()
      event.stopPropagation()
      await navigateToPanel(shellNav.dataset.shellNav as Parameters<typeof navigateToPanel>[0], {
        source: shellNav.dataset.shellSource || 'shell',
      })
      return
    }

    const shellWorkspace = shellOwnedTarget.closest<HTMLElement>('[data-shell-workspace]')
    if (shellWorkspace) {
      event.preventDefault()
      event.stopPropagation()
      await requestWorkspaceSelection({
        source: shellWorkspace.dataset.shellSource || 'shell_workspace',
      })
    }
  }

  return {
    mount(): void {
      const root = args.root ?? (typeof document !== 'undefined' ? document : null)
      if (!root) return
      root.addEventListener('click', onClick)
    },
    unmount(): void {
      const root = args.root ?? (typeof document !== 'undefined' ? document : null)
      if (!root) return
      root.removeEventListener('click', onClick)
    },
  }
}

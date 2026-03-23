import { BasePanel } from '../components/basePanel.js'
import { WorkbenchStore } from '../workbench/store.js'

type CodePanelDeps = {
  getWorkspaceRoot: (store: WorkbenchStore) => string | null
}

export class CodePanel extends BasePanel {
  private store: WorkbenchStore | null
  private deps: CodePanelDeps

  constructor(selector: string, deps: CodePanelDeps, store?: WorkbenchStore) {
    super(selector)
    this.store = store ?? null
    this.deps = deps
  }

  async refresh(): Promise<void> {
    try {
      const workspaceRoot = this.store ? this.deps.getWorkspaceRoot(this.store) : null
      const request = workspaceRoot ? { projectRoot: workspaceRoot, limit: 100 } : { projectRoot: undefined, limit: 100 }
      const files = (await window.rina.codeListFiles?.(request)) as
        | {
        ok: boolean
        files?: string[]
      }
        | undefined
      if (files?.ok && Array.isArray(files.files)) {
        this.clearContent()
        files.files.forEach((file: string) => {
          const row = document.createElement('div')
          row.className = 'code-file'
          row.textContent = file
          this.appendContent(row)
        })
      }
    } catch (error) {
      console.error('Failed to list files:', error)
    }
  }
}

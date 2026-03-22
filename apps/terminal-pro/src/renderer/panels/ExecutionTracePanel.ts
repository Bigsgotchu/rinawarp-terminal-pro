import { BasePanel } from '../components/basePanel.js'
import { WorkbenchStore } from '../workbench/store.js'

export class ExecutionTracePanel extends BasePanel {
  private store: WorkbenchStore

  constructor(selector: string, store: WorkbenchStore) {
    super(selector)
    this.store = store
  }

  appendOutput(output: string, className = ''): void {
    this.store.dispatch({
      type: 'executionTrace/blockUpsert',
      block: {
        id: `info:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        status: className === 'error' ? 'failed' : 'info',
        output,
        ts: Date.now(),
      },
    })
  }
}

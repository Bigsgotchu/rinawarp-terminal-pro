import { clear, el } from '../dom.js'
import type { WorkbenchState } from '../store.js'
import { mountRunsPanel, renderDeploymentSummary, renderRunBlock, renderRunsEmptyState, renderRunsSummary, renderRunsToolbar } from '../components/runsSurface.js'
import { buildRunsPanelModel } from '../view-models/runsPanelModel.js'

export function renderRuns(state: WorkbenchState): void {
  const root = document.getElementById('runs-output')
  if (!root) return
  const model = buildRunsPanelModel(state)
  if (!model.hasRuns) {
    mountRunsPanel(root, renderRunsEmptyState('No runs yet', 'Run a command and its session receipts will appear here.'))
    return
  }
  const summary =
    model.summary.hiddenNoiseCount || model.summary.hiddenWorkspaceCount || model.summary.hiddenOverflowCount
      ? renderRunsSummary(state.ui.scopeRunsToWorkspace ? 'this workspace' : 'all workspaces', model.summary)
      : renderRunsToolbar(model.summary.toolbar)
  if (model.visibleRuns.length === 0) {
    mountRunsPanel(
      root,
      renderRunsEmptyState(
        'No meaningful runs to inspect',
        `Rina’s run history is quiet for ${state.ui.scopeRunsToWorkspace ? 'this workspace' : 'the current view'} right now.`,
        summary
      )
    )
    return
  }
  clear(root)
  root.appendChild(summary)
  const deploymentSummary = renderDeploymentSummary(model.deployment)
  if (deploymentSummary) root.appendChild(deploymentSummary)
  root.appendChild(el('div', { class: 'rw-runs-list rw-runs-list' }, ...model.visibleRuns.map((run) => renderRunBlock(run))))
}

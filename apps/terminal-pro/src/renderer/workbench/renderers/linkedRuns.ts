import type { RunModel, WorkbenchState } from '../store.js'
import { renderLinkedRunsSurface } from '../components/linkedRunsSurface.js'
import { buildLinkedRunsModel } from '../view-models/linkedRunsModel.js'

export function renderLinkedRunsNode(
  _state: WorkbenchState,
  messageId: string,
  linkedRuns: RunModel[],
  unresolvedRunIds: string[] = []
): HTMLElement | null {
  return renderLinkedRunsSurface(buildLinkedRunsModel(messageId, linkedRuns, unresolvedRunIds))
}

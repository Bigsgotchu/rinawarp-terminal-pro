import type { RunModel, WorkbenchState } from '../store.js'
import { formatRunStatusForDisplay } from '../proof.js'
import { escapeHtml } from './format.js'

const MAX_VISIBLE_LINKED_RUNS = 3

export function renderLinkedRuns(
  _state: WorkbenchState,
  messageId: string,
  linkedRuns: RunModel[],
  unresolvedRunIds: string[] = []
): string {
  if (linkedRuns.length === 0 && unresolvedRunIds.length === 0) return ''
  const isRecoveryMessage = messageId.startsWith('system:runs:restore:')
  if (isRecoveryMessage) {
    const latestInterrupted = linkedRuns.find((run) => run.status === 'interrupted') || linkedRuns[0]
    const hiddenCount = Math.max(0, linkedRuns.length - (latestInterrupted ? 1 : 0))
    return `
      <div class="rw-runlinks rw-runlinks-recovery">
        ${
          latestInterrupted
            ? `
              <div class="rw-linked-runs">
                <button class="rw-linked-run" type="button" data-open-run="${escapeHtml(latestInterrupted.id)}">
                  <span>${escapeHtml(latestInterrupted.command || latestInterrupted.title || latestInterrupted.id)}</span>
                  <span class="rw-linked-run-status ${escapeHtml(latestInterrupted.status)}">${escapeHtml(formatRunStatusForDisplay(latestInterrupted))}</span>
                  ${latestInterrupted.restored ? '<span class="rw-linked-run-note">RESTORED</span>' : ''}
                </button>
              </div>
            `
            : ''
        }
        <div class="rw-runlinks-controls">
          ${latestInterrupted ? `<button class="rw-link-btn" type="button" data-run-resume="${escapeHtml(latestInterrupted.id)}">Resume latest</button>` : ''}
          <button class="rw-link-btn" type="button" data-open-runs-panel="${escapeHtml(messageId)}">Review recovered runs</button>
          ${hiddenCount > 0 ? `<span class="rw-runlinks-more">${hiddenCount} more in Runs</span>` : ''}
        </div>
        ${
          unresolvedRunIds.length > 0
            ? `
              <div class="rw-runlinks-placeholder">
                ${unresolvedRunIds.length} recovered run${unresolvedRunIds.length === 1 ? '' : 's'} still restoring. Open Runs to inspect receipts.
              </div>
            `
            : ''
        }
      </div>
    `
  }
  const visibleRuns = linkedRuns.slice(0, MAX_VISIBLE_LINKED_RUNS)
  const hiddenCount = Math.max(0, linkedRuns.length - visibleRuns.length)
  const interruptedCount = linkedRuns.filter((run) => run.status === 'interrupted').length
  const toggleLabel = messageId.startsWith('system:runs:restore:')
    ? `View all interrupted runs (${linkedRuns.length})`
    : `View all runs (${linkedRuns.length})`

  return `
    <div class="rw-runlinks">
      <div class="rw-linked-runs">
        ${visibleRuns
          .map(
            (run) => `
              <button class="rw-linked-run" type="button" data-open-run="${escapeHtml(run.id)}">
                <span>Run ${escapeHtml(run.id)}</span>
                <span class="rw-linked-run-status ${escapeHtml(run.status)}">${escapeHtml(formatRunStatusForDisplay(run))}</span>
                ${run.restored ? '<span class="rw-linked-run-note">RESTORED</span>' : ''}
              </button>
            `
          )
          .join('')}
      </div>
      ${
        linkedRuns.length > MAX_VISIBLE_LINKED_RUNS
          ? `
            <div class="rw-runlinks-controls">
              <button class="rw-link-btn" type="button" data-open-runs-panel="${escapeHtml(messageId)}">
                ${toggleLabel}
              </button>
              ${hiddenCount > 0 ? `<span class="rw-runlinks-more">+${hiddenCount} more</span>` : ''}
            </div>
          `
          : ''
      }
      ${
        interruptedCount > 0
          ? `
            <div class="rw-runlinks-controls">
              <button class="rw-link-btn" type="button" data-run-resume="${escapeHtml(linkedRuns.find((run) => run.status === 'interrupted')?.id || '')}">
                Resume interrupted run
              </button>
            </div>
          `
          : ''
      }
      ${
        unresolvedRunIds.length > 0
          ? `
            <div class="rw-runlinks-placeholder">
              ${unresolvedRunIds.length} linked run${unresolvedRunIds.length === 1 ? '' : 's'} still restoring. Open Runs to inspect recovered receipts.
            </div>
          `
          : ''
      }
    </div>
  `
}

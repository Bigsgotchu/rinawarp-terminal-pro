import type { RunModel } from './store.js'

export function hasRunProof(run: RunModel): boolean {
  return Boolean(
    run.id &&
      (run.latestReceiptId || run.sessionId) &&
      run.status !== 'running' &&
      run.exitCode !== undefined &&
      run.exitCode !== null
  )
}

export function isRunSuccessWithProof(run: RunModel): boolean {
  return hasRunProof(run) && run.status === 'ok' && run.exitCode === 0
}

export function formatRunStatusForDisplay(run: RunModel): string {
  if (run.status === 'running') return 'RUNNING'
  if (run.status === 'interrupted') return 'INTERRUPTED'
  if (run.status === 'failed') return typeof run.exitCode === 'number' ? `FAILED · EXIT ${run.exitCode}` : 'FAILED'
  if (isRunSuccessWithProof(run)) return 'SUCCESS'
  return 'PROOF PENDING'
}

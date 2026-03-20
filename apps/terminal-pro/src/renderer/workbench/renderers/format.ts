/**
 * Pure formatting helpers extracted from workbench/render.ts.
 * Keep this file DOM-free.
 */

import type { RunModel } from '../store.js'
import { formatRunStatusForDisplay, hasRunProof } from '../proof.js'

export function escapeHtml(input: string): string {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function formatRunDate(value: string): string {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function formatAnalyticsDate(value?: number): string {
  if (!value) return 'none'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'none'
  return date.toLocaleString()
}

export function formatRunStatus(run: RunModel): string {
  return formatRunStatusForDisplay(run)
}

export function formatInspectorRunStatus(run: RunModel): string {
  return formatRunStatusForDisplay(run)
}

export function formatRunDuration(run: RunModel): string | null {
  if (!run.startedAt) return null
  const started = new Date(run.startedAt).getTime()
  const ended = run.endedAt ? new Date(run.endedAt).getTime() : new Date(run.updatedAt).getTime()
  if (Number.isNaN(started) || Number.isNaN(ended) || ended < started) return null
  const ms = ended - started
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  return remSeconds === 0 ? `${minutes}m` : `${minutes}m ${remSeconds}s`
}

export function formatExitState(run: RunModel): string {
  if (run.status === 'running') return 'running'
  if (run.status === 'interrupted') return 'interrupted'
  if (run.status === 'failed') return typeof run.exitCode === 'number' ? `exit=${run.exitCode}` : 'failed'
  if (typeof run.exitCode === 'number') return `exit=${run.exitCode}`
  return hasRunProof(run) ? 'completed with proof' : 'proof pending'
}

export function formatProofBadge(run: RunModel): string {
  if (run.latestReceiptId) return 'Receipt ready'
  if (run.sessionId) return run.status === 'running' ? 'Session saved' : 'Proof pending'
  return 'No receipt yet'
}

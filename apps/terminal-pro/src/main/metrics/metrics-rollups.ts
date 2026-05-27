import type { MetricType } from './metrics-events.js'
import MetricsStore from './metrics-store.js'

/**
 * Compute a rollup for a given metric type over a time range.
 * @param type The metric type to compute rollup for
 * @param startTime Start timestamp (inclusive), undefined for no lower bound
 * @param endTime End timestamp (inclusive), undefined for no upper bound
 * @returns An object with count, sum, min, max, and average
 */
export function computeRollup(
  type: MetricType,
  startTime?: number,
  endTime?: number
): {
  count: number
  sum: number
  min: number
  max: number
  average: number
} {
  const events = MetricsStore.getInstance().getEvents(type, startTime, endTime)
  const values = events.map(e => e.value)

  if (values.length === 0) {
    return { count: 0, sum: 0, min: 0, max: 0, average: 0 }
  }

  const sum = values.reduce((acc, val) => acc + val, 0)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const average = sum / values.length

  return { count: values.length, sum, min, max, average }
}

/**
 * Get the count of a metric type over a time range.
 */
export function getMetricCount(
  type: MetricType,
  startTime?: number,
  endTime?: number
): number {
  return MetricsStore.getInstance().getEvents(type, startTime, endTime).length
}

/**
 * Get the sum of a metric type over a time range.
 */
export function getMetricSum(
  type: MetricType,
  startTime?: number,
  endTime?: number
): number {
  const events = MetricsStore.getInstance().getEvents(type, startTime, endTime)
  return events.reduce((acc, e) => acc + e.value, 0)
}

/**
 * Get the average of a metric type over a time range.
 */
export function getMetricAverage(
  type: MetricType,
  startTime?: number,
  endTime?: number
): number {
  const rollup = computeRollup(type, startTime, endTime)
  return rollup.average
}

/**
 * Get the min and max of a metric type over a time range.
 */
export function getMetricMinMax(
  type: MetricType,
  startTime?: number,
  endTime?: number
): { min: number; max: number } {
  const events = MetricsStore.getInstance().getEvents(type, startTime, endTime)
  const values = events.map(e => e.value)
  if (values.length === 0) {
    return { min: 0, max: 0 }
  }
  return { min: Math.min(...values), max: Math.max(...values) }
}

// Specific helper functions for the metrics we track

export function getTaskCount(startTime?: number, endTime?: number) {
  return getMetricCount('task_completed', startTime, endTime)
}

export function getTaskDurationAverage(startTime?: number, endTime?: number) {
  return getMetricAverage('task_duration_ms', startTime, endTime)
}

export function getVerificationDurationAverage(startTime?: number, endTime?: number) {
  return getMetricAverage('verification_duration_ms', startTime, endTime)
}

export function getPatchApplyDurationAverage(startTime?: number, endTime?: number) {
  return getMetricAverage('patch_apply_duration_ms', startTime, endTime)
}

export function getBuildDurationAverage(startTime?: number, endTime?: number) {
  return getMetricAverage('build_duration_ms', startTime, endTime)
}

export function getRepoUnderstandingUsedCount(startTime?: number, endTime?: number) {
  return getMetricCount('repo_understanding_used', startTime, endTime)
}

export function getSafePatchUsedCount(startTime?: number, endTime?: number) {
  return getMetricCount('safe_patch_used', startTime, endTime)
}

export function getDiskRecoveryUsedCount(startTime?: number, endTime?: number) {
  return getMetricCount('disk_recovery_used', startTime, endTime)
}

export function getPortRecoveryUsedCount(startTime?: number, endTime?: number) {
  return getMetricCount('port_recovery_used', startTime, endTime)
}

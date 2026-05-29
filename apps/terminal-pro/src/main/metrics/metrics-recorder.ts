import MetricsStore from './metrics-store.js'
import type { MetricType } from './metrics-events.js'
import { getOperationalTelemetry, isOperationalTelemetryEvent } from '../telemetry/operationalTelemetry.js'

function recordOperationalTelemetry(type: MetricType): void {
  if (!isOperationalTelemetryEvent(type)) return
  const telemetry = getOperationalTelemetry()
  if (!telemetry) return
  void telemetry.recordCounter(type)
}

export class MetricsRecorder {
  recordTaskStarted() {
    MetricsStore.recordIncrement('task_started')
    recordOperationalTelemetry('task_started')
  }

  recordTaskCompleted() {
    MetricsStore.recordIncrement('task_completed')
    recordOperationalTelemetry('task_completed')
  }

  recordTaskFailed() {
    MetricsStore.recordIncrement('task_failed')
    recordOperationalTelemetry('task_failed')
  }

  recordTaskRefused() {
    MetricsStore.recordIncrement('task_refused')
  }

  // Verification
  recordVerificationPassed() {
    MetricsStore.recordIncrement('verification_passed')
  }

  recordVerificationFailed() {
    MetricsStore.recordIncrement('verification_failed')
  }

  // Rollback and approval
  recordRollbackTriggered() {
    MetricsStore.recordIncrement('rollback_triggered')
    recordOperationalTelemetry('rollback_triggered')
  }

  recordApprovalDenied() {
    MetricsStore.recordIncrement('approval_denied')
    recordOperationalTelemetry('approval_denied')
  }

  // Duration metrics
  recordTaskDurationMs(durationMs: number) {
    MetricsStore.recordValue('task_duration_ms', durationMs)
  }

  recordVerificationDurationMs(durationMs: number) {
    MetricsStore.recordValue('verification_duration_ms', durationMs)
  }

  recordPatchApplyDurationMs(durationMs: number) {
    MetricsStore.recordValue('patch_apply_duration_ms', durationMs)
  }

  recordBuildDurationMs(durationMs: number) {
    MetricsStore.recordValue('build_duration_ms', durationMs)
  }

  // Feature usage
  recordRepoUnderstandingUsed() {
    MetricsStore.recordIncrement('repo_understanding_used')
  }

  recordSafePatchUsed() {
    MetricsStore.recordIncrement('safe_patch_used')
  }

  recordDiskRecoveryUsed() {
    MetricsStore.recordIncrement('disk_recovery_used')
  }

  recordPortRecoveryUsed() {
    MetricsStore.recordIncrement('port_recovery_used')
  }

  // Generic record for extensibility
  recordMetric(type: MetricType, value: number, labels?: Record<string, string>) {
    MetricsStore.recordValue(type, value, labels)
  }

  // Get raw events for testing or debugging
  getEvents(type?: MetricType, startTime?: number, endTime?: number) {
    return MetricsStore.getEvents(type, startTime, endTime)
  }
}

// Export a singleton instance
export const metricsRecorder = new MetricsRecorder()
export default metricsRecorder

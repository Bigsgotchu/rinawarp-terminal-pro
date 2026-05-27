export type MetricType = 
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_refused'
  | 'verification_passed'
  | 'verification_failed'
  | 'rollback_triggered'
  | 'approval_denied'
  | 'task_duration_ms'
  | 'verification_duration_ms'
  | 'patch_apply_duration_ms'
  | 'build_duration_ms'
  | 'repo_understanding_used'
  | 'safe_patch_used'
  | 'disk_recovery_used'
  | 'port_recovery_used'

export interface MetricEvent {
  type: MetricType
  value: number
  timestamp: number
  labels?: Record<string, string>
}
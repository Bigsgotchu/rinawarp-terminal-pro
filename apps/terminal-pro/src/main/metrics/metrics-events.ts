export type MetricType =
  // Existing task metrics
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
  // Production activation metrics
  | 'app_installed'
  | 'first_launch'
  | 'workspace_selected'
  | 'first_scan_completed'
  | 'first_build_run'
  | 'first_proof_generated'
  | 'safe_fix_proposed'
  | 'safe_fix_approved'
  | 'proof_exported'
  | 'marketplace_opened'
  | 'extension_installed'
  | 'memory_saved'
  | 'memory_cleared'
  | 'crash_report_created'
  | 'second_session'

export interface MetricEvent {
  type: MetricType
  value: number
  timestamp: number
  labels?: Record<string, string>
}
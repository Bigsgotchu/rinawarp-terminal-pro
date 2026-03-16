export type SupportedTaskType = 'run_command' | 'repo_watch'

export function isSupportedTaskType(type: string): type is SupportedTaskType {
  return type === 'run_command' || type === 'repo_watch'
}

export function validateTaskPayload(type: string, payload: Record<string, unknown>): string | null {
  if (!isSupportedTaskType(type)) {
    return `unsupported task type: ${type}`
  }

  if (type === 'run_command') {
    const command = payload.command
    if (typeof command !== 'string' || !command.trim()) {
      return 'run_command requires payload.command (non-empty string)'
    }
    if (payload.cwd !== undefined && typeof payload.cwd !== 'string') {
      return 'run_command payload.cwd must be a string when provided'
    }
    return null
  }

  if (type === 'repo_watch') {
    const repo = payload.repo
    if (typeof repo !== 'string' || !repo.trim()) {
      return 'repo_watch requires payload.repo (non-empty string)'
    }
    return null
  }

  return `unsupported task type: ${type}`
}

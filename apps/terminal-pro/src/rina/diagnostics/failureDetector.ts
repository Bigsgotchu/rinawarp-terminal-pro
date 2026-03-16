/**
 * Failure Detection Engine
 *
 * Analyzes terminal output to detect failures and errors.
 * Used by Autonomous Mode to identify when intervention is needed.
 */

export type FailureType =
  | 'compilation_error'
  | 'test_failure'
  | 'runtime_error'
  | 'missing_module'
  | 'git_error'
  | 'docker_error'
  | 'network_error'
  | 'permission_error'
  | 'unknown'

export interface FailureMatch {
  type: FailureType
  pattern: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message?: string
}

// Patterns to detect failures in terminal output
const FAILURE_PATTERNS: Array<{
  type: FailureType
  patterns: RegExp[]
  severity: 'critical' | 'high' | 'medium' | 'low'
}> = [
  {
    type: 'compilation_error',
    patterns: [
      /\berror\b/i,
      /\bfailed to compile\b/i,
      /\bcompilation failed\b/i,
      /\bts\d+ error\b/i,
      /\bcannot find name\b/i,
      /\bcannot find module\b/i,
      /\bproperty .* does not exist\b/i,
      /\btype .* is not assignable\b/i,
    ],
    severity: 'critical',
  },
  {
    type: 'test_failure',
    patterns: [
      /\btest(s)?\s+(failed|error|broken)/i,
      /\bfailing tests\b/i,
      /\b\d+ tests? failed\b/i,
      /\bexpect\(.*\)\.to.*failed\b/i,
      /\bfailures?:\s*\d+/i,
    ],
    severity: 'high',
  },
  {
    type: 'runtime_error',
    patterns: [
      /\bexception\b/i,
      /\btraceback\b/i,
      /\bundefined is not (a|an)\b/i,
      /\bcannot read property\b/i,
      /\bis not defined\b/i,
      /\bnull reference\b/i,
      /\bstack trace\b/i,
    ],
    severity: 'high',
  },
  {
    type: 'missing_module',
    patterns: [
      /\bcannot find module\b/i,
      /\bmodule not found\b/i,
      /\benoent\b/i,
      /\bmissing dependency\b/i,
      /\brequire\([^)]+\) failed\b/i,
    ],
    severity: 'high',
  },
  {
    type: 'git_error',
    patterns: [
      /\bgit:?\s+(error|failed)/i,
      /\bgit\b.*\bfatal\b/i,
      /\bmerge conflict\b/i,
      /\brefusing to merge\b/i,
      /\bdetached head\b/i,
    ],
    severity: 'medium',
  },
  {
    type: 'docker_error',
    patterns: [
      /\bdocker:?\s+(error|failed)/i,
      /\bcannot connect to docker\b/i,
      /\bdocker daemon\b/i,
      /\bcontainer.*not found\b/i,
      /\bimage.*not found\b/i,
    ],
    severity: 'high',
  },
  {
    type: 'network_error',
    patterns: [
      /\beconnrefused\b/i,
      /\betimeout\b/i,
      /\bnetwork (error|timeout)\b/i,
      /\bconnection (refused|timeout|reset)\b/i,
      /\bfetch failed\b/i,
      /\brequest failed\b/i,
    ],
    severity: 'high',
  },
  {
    type: 'permission_error',
    patterns: [/\bpermission denied\b/i, /\baccess denied\b/i, /\beacces\b/i, /\brequires? root\b/i, /\bsudo\b/i],
    severity: 'medium',
  },
]

/**
 * Check if the output contains any failure patterns
 */
export function detectFailure(output: string): boolean {
  return findFailure(output) !== null
}

/**
 * Find the first matching failure in the output
 */
export function findFailure(output: string): FailureMatch | null {
  if (!output || typeof output !== 'string') {
    return null
  }

  for (const category of FAILURE_PATTERNS) {
    for (const pattern of category.patterns) {
      if (pattern.test(output)) {
        return {
          type: category.type,
          pattern: pattern.source,
          severity: category.severity,
          message: extractErrorMessage(output),
        }
      }
    }
  }

  return null
}

/**
 * Find all failures in the output
 */
export function findAllFailures(output: string): FailureMatch[] {
  if (!output || typeof output !== 'string') {
    return []
  }

  const failures: FailureMatch[] = []
  const seenTypes = new Set<FailureType>()

  for (const category of FAILURE_PATTERNS) {
    for (const pattern of category.patterns) {
      if (pattern.test(output) && !seenTypes.has(category.type)) {
        seenTypes.add(category.type)
        failures.push({
          type: category.type,
          pattern: pattern.source,
          severity: category.severity,
          message: extractErrorMessage(output),
        })
      }
    }
  }

  return failures
}

/**
 * Extract a human-readable error message from the output
 */
function extractErrorMessage(output: string): string {
  // Try to find error lines
  const lines = output.split('\n')

  for (const line of lines) {
    // Look for common error patterns
    const errorMatch = line.match(/error[:\s]+(.+)/i)
    if (errorMatch) {
      return errorMatch[1].slice(0, 100)
    }

    const failedMatch = line.match(/failed[:\s]+(.+)/i)
    if (failedMatch) {
      return failedMatch[1].slice(0, 100)
    }
  }

  // Return first non-empty line if no pattern matched
  return lines.find((l) => l.trim())?.slice(0, 100) || 'Unknown error'
}

/**
 * Determine if a failure is critical and needs immediate attention
 */
export function isCriticalFailure(output: string): boolean {
  const failure = findFailure(output)
  return failure !== null && failure.severity === 'critical'
}

/**
 * Get a summary of failures in the output
 */
export function getFailureSummary(output: string): {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  types: FailureType[]
} {
  const failures = findAllFailures(output)

  return {
    total: failures.length,
    critical: failures.filter((f) => f.severity === 'critical').length,
    high: failures.filter((f) => f.severity === 'high').length,
    medium: failures.filter((f) => f.severity === 'medium').length,
    low: failures.filter((f) => f.severity === 'low').length,
    types: failures.map((f) => f.type),
  }
}

import type { RunModel } from '../store.js'

export type RunIntent = 'build' | 'test' | 'deploy' | 'fix' | 'command'

export type FailureAnalysis = {
  likelyCause: string
  confidence: 'Low' | 'Medium' | 'High'
  whatChanged: string
  safestNextMove: string
  failureClues: string[]
  summaryLine: string
  nextActionLabel: string
  confidenceReason: string
}

export type RecoveryGuidance = {
  intent: RunIntent
  intentLabel: string
  whatInterrupted: string
  resumeSafe: boolean
  rerunIdempotent: boolean
  resumeLabel: string
  rerunLabel: string
  receiptLabel: string
  bestNextActionLabel: string
  bestNextActionKind: 'resume' | 'rerun' | 'receipt'
  resumeSummary: string
  rerunSummary: string
  bestNextActionReason: string
}

type RunLike = Pick<RunModel, 'id' | 'command' | 'title' | 'status' | 'latestReceiptId'>

export function classifyRunIntent(command: string, title?: string): RunIntent {
  const value = `${command || ''} ${title || ''}`.toLowerCase()
  if (/\b(build|compile|bundle|tsc|vite build|webpack)\b/.test(value)) return 'build'
  if (/\b(test|spec|vitest|jest|playwright|cypress)\b/.test(value)) return 'test'
  if (/\b(deploy|publish|release|ship|wrangler|vercel|netlify)\b/.test(value)) return 'deploy'
  if (/\b(fix|repair|patch)\b/.test(value)) return 'fix'
  return 'command'
}

export function formatRunIntentLabel(intent: RunIntent): string {
  if (intent === 'build') return 'Build'
  if (intent === 'test') return 'Test'
  if (intent === 'deploy') return 'Deploy'
  if (intent === 'fix') return 'Fix'
  return 'Command'
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/g) || []
  return Array.from(new Set(matches.map((value) => value.replace(/[.,;:]+$/, ''))))
}

export function analyzeFailure(args: {
  command: string
  exitCode?: number | null
  outputText?: string
  interrupted?: boolean
  changedFiles?: string[]
  diffHints?: string[]
  metaText?: string
}): FailureAnalysis {
  const command = args.command || ''
  const outputText = args.outputText || ''
  const metaText = args.metaText || ''
  const output = outputText.toLowerCase()
  const meta = metaText.toLowerCase()
  const intent = classifyRunIntent(command)
  const changedFiles = Array.from(new Set((args.changedFiles || []).filter(Boolean))).slice(0, 3)
  const diffHints = Array.from(new Set((args.diffHints || []).filter(Boolean))).slice(0, 2)

  let likelyCause = 'Unknown error'
  let confidence: FailureAnalysis['confidence'] = 'Low'
  let whatChanged = 'The command returned a failure path, but the visible output does not isolate the trigger yet.'
  let safestNextMove = 'Inspect the output and receipt together before retrying.'
  let nextActionLabel = 'Inspect output'
  let confidenceReason = 'The visible output is thin, so this is still an inference.'

  if (args.interrupted || args.exitCode === 130) {
    likelyCause = 'The command was interrupted before it completed'
    confidence = 'High'
    whatChanged = 'Execution stopped mid-run, so the receipt is only partial proof.'
    safestNextMove = intent === 'deploy' ? 'Inspect the receipt before attempting another deploy.' : 'Resume if the command is safe to continue, otherwise rerun from the same workspace.'
    nextActionLabel = intent === 'deploy' ? 'Open failed deploy receipt' : 'Resume or rerun safely'
    confidenceReason = 'The exit path and interruption markers agree.'
  } else if (args.exitCode === 127 || output.includes('command not found') || output.includes('not found')) {
    likelyCause = 'A command or dependency is missing'
    confidence = 'High'
    whatChanged = 'The environment no longer has the expected executable, package, or PATH entry.'
    safestNextMove = 'Install the missing dependency or correct PATH, then rerun.'
    nextActionLabel = 'Fix dependency and rerun'
    confidenceReason = 'Missing-command output is explicit.'
  } else if (output.includes('permission denied') || output.includes('access denied') || output.includes('eacces')) {
    likelyCause = 'Permissions blocked the command'
    confidence = 'High'
    whatChanged = 'File, directory, or account permissions no longer match what the command expected.'
    safestNextMove = 'Fix permissions first, then retry without changing the command.'
    nextActionLabel = 'Fix permissions first'
    confidenceReason = 'Permission-denied output is explicit.'
  } else if (output.includes('timed out') || output.includes('timeout') || output.includes('etimedout') || meta.includes('timed out')) {
    likelyCause = 'The command timed out waiting on a dependency or service'
    confidence = 'Medium'
    whatChanged = 'The run reached an external wait state and never completed in time.'
    safestNextMove = intent === 'deploy' ? 'Inspect the receipt and confirm target state before retrying the deploy.' : 'Confirm the blocked dependency is healthy, then rerun with the same command.'
    nextActionLabel = intent === 'deploy' ? 'Inspect target before retry' : 'Check dependency and rerun'
    confidenceReason = 'Timeout markers are present, but the blocked dependency may still need inspection.'
  } else if (
    output.includes('network') ||
    output.includes('econnrefused') ||
    output.includes('enotfound') ||
    output.includes('dns') ||
    output.includes('socket hang up') ||
    meta.includes('network')
  ) {
    likelyCause = 'A network dependency or remote service was unavailable'
    confidence = 'Medium'
    whatChanged = 'The command could not reach the host, API, or service it depends on.'
    safestNextMove = 'Verify the remote dependency first, then rerun without changing local code.'
    nextActionLabel = 'Verify dependency health'
    confidenceReason = 'The output points to connectivity trouble, but not always the exact endpoint owner.'
  } else if (output.includes('address already in use') || output.includes('eaddrinuse')) {
    likelyCause = 'The expected port is already in use'
    confidence = 'High'
    whatChanged = 'Another process is already bound to the port this command expected to open.'
    safestNextMove = 'Stop or reconfigure the conflicting process, then rerun.'
    nextActionLabel = 'Free the conflicting port'
    confidenceReason = 'Port-collision output is explicit.'
  } else if (output.includes('out of memory') || output.includes('oom') || output.includes('heap out of memory')) {
    likelyCause = 'The process exhausted available memory'
    confidence = 'Medium'
    whatChanged = 'The command consumed more memory than the current environment could provide.'
    safestNextMove = 'Reduce workload size or increase memory before rerunning the same command.'
    nextActionLabel = 'Stabilize memory first'
    confidenceReason = 'Memory-failure output is suggestive, but the triggering input size may still need inspection.'
  } else if (output.includes('syntax error') || output.includes('parse error')) {
    likelyCause = 'A script or config file has invalid syntax'
    confidence = 'Medium'
    whatChanged = 'A recent change likely introduced malformed code or configuration.'
    safestNextMove = 'Inspect the flagged file, fix syntax, and rerun the same command.'
    nextActionLabel = 'Fix syntax and retry'
    confidenceReason = 'The parser is flagging a concrete syntax boundary.'
  } else if (output.includes('typescript') || output.includes('ts2304') || output.includes('ts2339') || output.includes('cannot find name')) {
    likelyCause = 'TypeScript compile errors blocked the run'
    confidence = 'High'
    whatChanged = 'The current branch no longer matches the expected type contracts.'
    safestNextMove = intent === 'build' ? 'Fix the reported type errors before rerunning the build.' : 'Fix the type errors, then rerun the command.'
    nextActionLabel = 'Fix type errors'
    confidenceReason = 'The compiler is naming the contract failures directly.'
  } else if (output.includes('module not found') || output.includes('cannot find module')) {
    likelyCause = 'A required module or import is unresolved'
    confidence = 'High'
    whatChanged = 'Dependencies, import paths, or build outputs drifted out of sync.'
    safestNextMove = 'Restore the missing module or correct the import path, then rerun.'
    nextActionLabel = 'Restore missing import'
    confidenceReason = 'Module resolution failures are explicit.'
  } else if (intent === 'test' && (output.includes('failed') || output.includes('failing') || output.includes('expected'))) {
    likelyCause = 'One or more tests are failing against the current code'
    confidence = 'High'
    whatChanged = 'Behavior changed, or the test environment drifted from the expected baseline.'
    safestNextMove = 'Inspect the first failing assertion, fix the regression, then rerun the same test command.'
    nextActionLabel = 'Fix first failing assertion'
    confidenceReason = 'The test output is usually precise about the first broken expectation.'
  } else if (intent === 'deploy' && (output.includes('unauthorized') || output.includes('forbidden') || output.includes('invalid token'))) {
    likelyCause = 'Deploy credentials or permissions are invalid'
    confidence = 'High'
    whatChanged = 'The release target rejected the current credentials or authorization scope.'
    safestNextMove = 'Repair credentials first, then inspect the failed deploy receipt before trying again.'
    nextActionLabel = 'Repair credentials'
    confidenceReason = 'The deploy target is explicitly rejecting authorization.'
  } else if (intent === 'deploy') {
    likelyCause = 'The deploy target rejected the release'
    confidence = 'Medium'
    whatChanged = 'The release path reached the target but did not complete successfully.'
    safestNextMove = 'Open the failed deploy receipt and confirm target state before rerunning.'
    nextActionLabel = 'Open failed deploy receipt'
    confidenceReason = 'The deploy failed, but the exact target-side trigger still needs inspection.'
  } else if (intent === 'build') {
    likelyCause = 'The workspace no longer builds cleanly'
    confidence = 'Medium'
    whatChanged = 'A recent code or config change introduced a compile-time failure.'
    safestNextMove = 'Inspect the first build error, fix it, then rerun the build.'
    nextActionLabel = 'Fix first build error'
    confidenceReason = 'The build is failing consistently, but the first root cause still needs inspection.'
  }

  if (changedFiles.length > 0) {
    const touched = changedFiles.join(', ')
    whatChanged =
      diffHints.length > 0
        ? `Recent changes touched ${touched}. Diff clues: ${diffHints.join(' | ')}`
        : `Recent changes touched ${touched}, which is the strongest visible drift near this failure.`
    if (confidence === 'Low') confidence = 'Medium'
  } else if (diffHints.length > 0) {
    whatChanged = `The recorded diff hints point at: ${diffHints.join(' | ')}`
    if (confidence === 'Low') confidence = 'Medium'
  }

  if (intent === 'deploy' && changedFiles.length === 0 && diffHints.length === 0 && /release|manifest|artifact|checksum/i.test(outputText + '\n' + metaText)) {
    whatChanged = 'The release metadata or deploy artifact path changed, and the deploy target did not accept the resulting state.'
  }

  if (intent === 'test' && changedFiles.length > 0 && !diffHints.length) {
    safestNextMove = 'Inspect the touched files against the first failing assertion, fix the regression, then rerun the same test command.'
    nextActionLabel = 'Inspect touched files against first failing test'
  }

  if (intent === 'build' && changedFiles.length > 0 && !diffHints.length) {
    safestNextMove = 'Inspect the touched files against the first build error, fix the compile break, then rerun the build.'
    nextActionLabel = 'Inspect touched files against build error'
  }

  const failureClues = extractFailureClues(outputText)
  const summaryLine = `${likelyCause}. ${safestNextMove}`
  return { likelyCause, confidence, whatChanged, safestNextMove, failureClues, summaryLine, nextActionLabel, confidenceReason }
}

export function formatFailureNarrative(analysis: FailureAnalysis): string {
  const clues = analysis.failureClues.length > 0 ? ` Failure clues: ${analysis.failureClues.join(' | ')}.` : ''
  return `${analysis.summaryLine} Best next action: ${analysis.nextActionLabel}. Confidence: ${analysis.confidence} because ${analysis.confidenceReason}. What changed: ${analysis.whatChanged}.${clues}`
}

export function getRecoveryGuidance(run: RunLike): RecoveryGuidance {
  const intent = classifyRunIntent(run.command || '', run.title || '')
  const intentLabel = formatRunIntentLabel(intent)
  const labelSource = run.command || run.title || 'Unknown command'
  const whatInterrupted = `${intentLabel}: ${labelSource}`

  if (intent === 'build') {
    return {
      intent,
      intentLabel,
      whatInterrupted,
      resumeSafe: true,
      rerunIdempotent: true,
      resumeLabel: 'Resume build',
      rerunLabel: 'Rerun build',
      receiptLabel: 'Open build receipt',
      bestNextActionLabel: run.status === 'interrupted' ? 'Resume build' : 'Open build receipt',
      bestNextActionKind: run.status === 'interrupted' ? 'resume' : 'receipt',
      resumeSummary: 'Safe to resume if the workspace has not changed under the build.',
      rerunSummary: 'Rerunning a build is usually idempotent and should not change external state.',
      bestNextActionReason:
        run.status === 'interrupted'
          ? 'The build likely stopped mid-compile, so resuming is the fastest safe move.'
          : 'A failed build should be inspected before another attempt so the next retry is informed.',
    }
  }

  if (intent === 'test') {
    return {
      intent,
      intentLabel,
      whatInterrupted,
      resumeSafe: true,
      rerunIdempotent: true,
      resumeLabel: 'Resume tests',
      rerunLabel: 'Retry tests with same env',
      receiptLabel: 'Open test receipt',
      bestNextActionLabel: 'Retry tests with same env',
      bestNextActionKind: 'rerun',
      resumeSummary: 'It is usually safe to resume if the same test environment is still intact.',
      rerunSummary: 'Test reruns are idempotent when the environment stays the same.',
      bestNextActionReason: 'A clean rerun confirms whether the failure is stable before you start fixing code.',
    }
  }

  if (intent === 'deploy') {
    return {
      intent,
      intentLabel,
      whatInterrupted,
      resumeSafe: false,
      rerunIdempotent: false,
      resumeLabel: 'Resume deploy',
      rerunLabel: 'Rerun deploy carefully',
      receiptLabel: 'Open failed deploy receipt',
      bestNextActionLabel: 'Open failed deploy receipt',
      bestNextActionKind: 'receipt',
      resumeSummary: 'Deploy resumes can be risky unless the target system explicitly supports continuation.',
      rerunSummary: 'Deploy reruns may have side effects or create duplicate target changes.',
      bestNextActionReason: 'Inspect target state first so you do not stack another deploy onto an unknown partial release.',
    }
  }

  if (intent === 'fix') {
    return {
      intent,
      intentLabel,
      whatInterrupted,
      resumeSafe: true,
      rerunIdempotent: false,
      resumeLabel: 'Resume repair',
      rerunLabel: 'Retry repair',
      receiptLabel: 'Open repair receipt',
      bestNextActionLabel: run.status === 'interrupted' ? 'Resume repair' : 'Open repair receipt',
      bestNextActionKind: run.status === 'interrupted' ? 'resume' : 'receipt',
      resumeSummary: 'Resume is usually safe if the repair had not started editing external systems yet.',
      rerunSummary: 'Repair reruns may repeat edits, so inspect what already changed first.',
      bestNextActionReason:
        run.status === 'interrupted'
          ? 'Resuming keeps the repair context intact.'
          : 'The receipt is the safest place to confirm what the repair already touched.',
    }
  }

  return {
    intent,
    intentLabel,
    whatInterrupted,
    resumeSafe: true,
    rerunIdempotent: false,
    resumeLabel: 'Resume task',
    rerunLabel: 'Rerun task',
    receiptLabel: 'Open receipt',
    bestNextActionLabel: run.status === 'interrupted' ? 'Resume task' : 'Open receipt',
    bestNextActionKind: run.status === 'interrupted' ? 'resume' : 'receipt',
    resumeSummary: 'Resume is usually safe when the task only affected the current workspace.',
    rerunSummary: 'Reruns may repeat work, so confirm side effects first when the task was not purely local.',
    bestNextActionReason:
      run.status === 'interrupted'
        ? 'Resuming avoids losing context from the interrupted task.'
        : 'The receipt is the quickest way to confirm what already happened.',
  }
}

export function formatRecoveryNarrative(
  recovery: RecoveryGuidance,
  options?: {
    prefix?: string
    includeWhatInterrupted?: boolean
  }
): string {
  const prefix = options?.prefix ? `${options.prefix.trim()} ` : ''
  const opening = options?.includeWhatInterrupted === false ? '' : `${recovery.whatInterrupted}. `
  return `${prefix}${opening}${recovery.resumeSummary} ${recovery.rerunSummary} Best next move: ${recovery.bestNextActionLabel}. ${recovery.bestNextActionReason}`.trim()
}

function extractFailureClues(outputText: string): string[] {
  const lines = outputText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const clues = lines.filter((line) =>
    /error|failed|cannot|missing|denied|unauthorized|forbidden|exception|traceback|timed out|timeout|exit code|eaddrinuse|eacces|module not found|ts\d+/i.test(
      line
    )
  )

  return Array.from(new Set(clues)).slice(0, 5)
}

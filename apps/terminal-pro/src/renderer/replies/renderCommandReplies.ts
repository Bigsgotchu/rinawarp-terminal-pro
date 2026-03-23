import type { MessageBlock, ReplyAction } from '../workbench/store.js'
import { copyBlock, proofSummaryBlock, replyListBlock, sectionLabelBlock } from './renderFragments.js'

export type StructuredCommandReply = {
  command: string
  success: boolean
  outputText: string
  durationMs?: number | null
  runId?: string
  sessionId?: string
  receiptId?: string
  exitCode?: number | null
}

export function extractStructuredCommandReply(output: unknown): StructuredCommandReply | null {
  if (!output || typeof output !== 'object') return null

  const record = output as Record<string, unknown>
  if (typeof record.command !== 'string' || !record.command.trim()) return null

  const nested = record.output && typeof record.output === 'object' ? (record.output as Record<string, unknown>) : null

  const success =
    typeof record.success === 'boolean'
      ? record.success
      : typeof nested?.success === 'boolean'
        ? nested.success
        : false

  const outputText =
    typeof nested?.output === 'string'
      ? nested.output
      : typeof record.output === 'string'
        ? record.output
        : ''

  const durationMs =
    typeof record.durationMs === 'number'
      ? record.durationMs
      : typeof nested?.durationMs === 'number'
        ? nested.durationMs
        : null

  const runId =
    typeof record.runId === 'string'
      ? record.runId
      : typeof nested?.runId === 'string'
        ? nested.runId
        : undefined

  const sessionId =
    typeof record.planRunId === 'string'
      ? record.planRunId
      : typeof record.sessionId === 'string'
        ? record.sessionId
        : typeof nested?.planRunId === 'string'
          ? nested.planRunId
          : typeof nested?.sessionId === 'string'
            ? nested.sessionId
            : undefined

  const receiptId =
    typeof record.receiptId === 'string'
      ? record.receiptId
      : typeof record.latestReceiptId === 'string'
        ? record.latestReceiptId
        : typeof nested?.receiptId === 'string'
          ? nested.receiptId
          : typeof nested?.latestReceiptId === 'string'
            ? nested.latestReceiptId
            : undefined

  const exitCode =
    typeof record.exitCode === 'number'
      ? record.exitCode
      : typeof record.code === 'number'
        ? record.code
        : typeof nested?.exitCode === 'number'
          ? nested.exitCode
          : typeof nested?.code === 'number'
            ? nested.code
            : null

  return {
    command: record.command,
    success,
    outputText: outputText.trim(),
    durationMs,
    runId,
    sessionId,
    receiptId,
    exitCode,
  }
}

export function summarizeCommandReply(reply: StructuredCommandReply): string {
  const normalized = reply.command.trim()
  if (reply.success) {
    if (!hasStructuredCommandRunRef(reply)) {
      return 'I have immediate command output, but this path did not attach a run ID or receipt. Treat it as unverified until Rina reruns it through the trusted path.'
    }
    if (normalized.includes('build')) return 'I ran the build command, but do not treat it as done until the linked run proof is complete.'
    if (normalized.includes('test')) return 'I ran the test command, but do not treat it as done until the linked run proof is complete.'
    if (normalized.includes('lint')) return 'I ran the lint command, but do not treat it as done until the linked run proof is complete.'
    if (normalized.includes('deploy')) return 'I ran the deploy command, but do not treat it as done until the linked run proof is complete.'
    return 'I ran that command, but do not treat it as done until the linked run proof is complete.'
  }

  if (normalized.includes('build')) return 'I tried the build and it failed. Here is the command output.'
  if (normalized.includes('test')) return 'I ran the tests and they failed. Here is what came back.'
  if (normalized.includes('lint')) return 'I ran lint and it failed. Here is what came back.'
  if (normalized.includes('deploy')) return 'I tried the deploy command and it failed. Here is what came back.'
  return 'I ran that command and it failed. Here is what came back.'
}

export function buildCommandResultBlock(
  reply: StructuredCommandReply
): {
  type: 'reply-card'
  kind?: 'build-result' | 'test-result' | 'deploy-result' | 'fix-result' | 'generic'
  label: string
  badge?: string
  className?: string
  bodyBlocks?: MessageBlock[]
  actions?: ReplyAction[]
} {
  const intent = classifyCommandIntent(reply.command)
  const hasRunRef = hasStructuredCommandRunRef(reply)
  const cardTitle =
    intent === 'build'
      ? hasRunRef
        ? 'Build result'
        : 'Build output'
      : intent === 'test'
        ? hasRunRef
          ? 'Test result'
          : 'Test output'
        : intent === 'deploy'
          ? hasRunRef
            ? 'Deploy result'
            : 'Deploy output'
      : hasRunRef
        ? 'Command result'
        : 'Command output'
  const cardKind =
    intent === 'build'
      ? 'build-result'
      : intent === 'test'
        ? 'test-result'
        : intent === 'deploy'
          ? 'deploy-result'
          : /\bfix|repair\b/i.test(reply.command)
            ? 'fix-result'
            : 'generic'
  const statusLabel = reply.success ? (hasRunRef ? 'Proof pending' : 'Unverified output') : 'Failed'
  const durationLabel = formatDurationMs(reply.durationMs)
  const testCounts = intent === 'test' ? extractTestCounts(reply.outputText) : {}
  const deployFacts = intent === 'deploy' ? extractDeployFacts(reply.command, reply.outputText) : {}
  const changedFiles = extractChangedFiles(reply.outputText)
  const previewUrls = extractPreviewUrls(reply.outputText)
  const diffStats = extractDiffStats(reply.outputText)
  const outputBody = reply.outputText
    ? copyBlock(reply.outputText.slice(0, 1600))
    : copyBlock('The command finished without any captured output.', 'muted')
  const proofWarning = reply.success
    ? hasRunRef
      ? copyBlock(
          'This card only reflects the immediate command output. Treat the result as proof pending until the linked run has a run ID, exit code, and receipt.',
          'muted'
        )
      : copyBlock(
          'This output came back without a linked run ID or receipt, so it is not trusted proof yet. Ask Rina to rerun it through the trusted path if you need a proof-backed result.',
          'muted'
        )
    : null
  const proofItems = [
    { label: 'Command', value: reply.command, emphasis: 'code' as const },
    durationLabel ? { label: 'Duration', value: durationLabel, emphasis: 'strong' as const } : null,
    reply.runId ? { label: 'Run', value: reply.runId, emphasis: 'strong' as const } : null,
    reply.receiptId ? { label: 'Receipt', value: reply.receiptId, emphasis: 'strong' as const } : null,
    typeof reply.exitCode === 'number' ? { label: 'Exit', value: String(reply.exitCode), emphasis: 'strong' as const } : null,
    intent === 'test' && typeof testCounts.passed === 'number'
      ? { label: 'Passed', value: String(testCounts.passed), emphasis: 'strong' as const }
      : null,
    intent === 'test' && typeof testCounts.failed === 'number'
      ? { label: 'Failed', value: String(testCounts.failed), emphasis: 'strong' as const }
      : null,
    intent === 'test' && typeof testCounts.skipped === 'number'
      ? { label: 'Skipped', value: String(testCounts.skipped), emphasis: 'strong' as const }
      : null,
    intent === 'deploy' && deployFacts.target
      ? { label: 'Target', value: deployFacts.target, emphasis: 'strong' as const }
      : null,
    intent === 'deploy' && deployFacts.artifact
      ? { label: 'Artifact', value: deployFacts.artifact, emphasis: 'strong' as const }
      : null,
    previewUrls.length > 0 ? { label: 'Preview', value: previewUrls[0], emphasis: 'strong' as const } : null,
    changedFiles.length > 0 ? { label: 'Files', value: String(changedFiles.length), emphasis: 'strong' as const } : null,
    diffStats ? { label: 'Diff', value: diffStats, emphasis: 'strong' as const } : null,
    { label: 'Proof', value: reply.success ? (hasRunRef ? 'Proof pending' : 'No linked run proof') : 'See run details', emphasis: 'strong' as const },
  ].filter(Boolean) as Array<{ label: string; value: string; emphasis?: 'code' | 'strong' }>

  const artifactItems = [
    ...(deployFacts.target
      ? [{ title: 'Deploy target', text: deployFacts.target, badge: 'Target', strongTitle: true }]
      : []),
    ...(deployFacts.artifact
      ? [{ title: 'Artifact or release', text: deployFacts.artifact, badge: 'Artifact', strongTitle: true }]
      : []),
    ...previewUrls.slice(0, 2).map((url, index) => ({
      title: index === 0 ? 'Preview link' : `Preview link ${index + 1}`,
      text: url,
      badge: 'Preview',
      strongTitle: true,
    })),
    ...changedFiles.slice(0, 5).map((file) => ({
      title: file,
      badge: 'Changed file',
    })),
    ...(diffStats
      ? [{ title: 'Diff summary', text: diffStats, badge: 'Diff', strongTitle: true }]
      : []),
  ]

  const recommendationItems = buildRecommendedNextSteps(reply, intent)
  const baseActions = hasRunRef
    ? [
        { label: 'Receipt', runReveal: reply.receiptId || reply.sessionId || reply.runId },
        ...(reply.runId && reply.sessionId ? [{ label: 'Inspect artifacts', runArtifacts: reply.runId }] : []),
        { label: 'Inspect receipts', tab: 'runs' },
        { label: 'Inspect execution trace', tab: 'execution-trace' },
      ]
    : [
        { label: 'Inspect execution trace', tab: 'execution-trace' },
        { label: 'Rerun through trusted path', prompt: `Run this through the trusted path with receipts: ${reply.command}` },
      ]
  const actions = dedupeActions([...baseActions, ...buildRecommendedActions(reply, intent)])
  const bodyBlocks: MessageBlock[] = [proofSummaryBlock(proofItems)]
  if (proofWarning) bodyBlocks.push(proofWarning)
  if (artifactItems.length > 0) {
    bodyBlocks.push(sectionLabelBlock('Artifact highlights'), replyListBlock(artifactItems))
  }
  if (recommendationItems.length > 0) {
    bodyBlocks.push(
      sectionLabelBlock(reply.success ? 'Recommended next' : 'What I recommend next'),
      replyListBlock(recommendationItems)
    )
  }
  bodyBlocks.push(sectionLabelBlock('Command output'), outputBody)

  return {
    type: 'reply-card',
    kind: cardKind,
    label: cardTitle,
    badge: statusLabel,
    className: `rw-command-result-card ${reply.success ? 'is-success' : 'is-failed'}`,
    bodyBlocks,
    actions,
  }
}

function hasStructuredCommandRunRef(reply: StructuredCommandReply): boolean {
  return Boolean(reply.runId || reply.sessionId || reply.receiptId)
}

function classifyCommandIntent(command: string): 'build' | 'test' | 'deploy' | 'command' {
  const normalized = command.toLowerCase()
  if (normalized.includes('build')) return 'build'
  if (normalized.includes('test')) return 'test'
  if (normalized.includes('deploy')) return 'deploy'
  return 'command'
}

function formatDurationMs(durationMs?: number | null): string | null {
  if (!Number.isFinite(durationMs) || durationMs == null) return null
  if (durationMs < 1000) return `${Math.max(1, Math.round(durationMs))}ms`
  return `${Math.round(durationMs / 100) / 10}s`
}

function extractTestCounts(outputText: string): { passed?: number; failed?: number; skipped?: number } {
  const passed =
    outputText.match(/\b(\d+)\s+passed\b/i)?.[1] ||
    outputText.match(/\bpass(?:ed|ing)?\s*:?\s*(\d+)\b/i)?.[1]
  const failed =
    outputText.match(/\b(\d+)\s+failed\b/i)?.[1] ||
    outputText.match(/\bfail(?:ed|ing)?\s*:?\s*(\d+)\b/i)?.[1]
  const skipped =
    outputText.match(/\b(\d+)\s+skipped\b/i)?.[1] ||
    outputText.match(/\bskip(?:ped|ping)?\s*:?\s*(\d+)\b/i)?.[1]
  return {
    passed: passed ? Number(passed) : undefined,
    failed: failed ? Number(failed) : undefined,
    skipped: skipped ? Number(skipped) : undefined,
  }
}

function extractDeployFacts(command: string, outputText: string): { target?: string; artifact?: string } {
  const source = `${command}\n${outputText}`
  const targetMatch =
    source.match(/\b(production|prod|staging|stage|preview|dev|development)\b/i) ||
    source.match(/\bto\s+([a-z0-9._-]+)\b/i)
  const artifactMatch =
    source.match(/\b(v?\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?)\b/i) ||
    source.match(/\b(build|release|deploy(?:ment)?)\s+(?:id|version|tag)?[:#]?\s*([a-z0-9._-]+)\b/i)

  return {
    target: targetMatch?.[1] ? String(targetMatch[1]) : undefined,
    artifact: artifactMatch?.[2] ? String(artifactMatch[2]) : artifactMatch?.[1] ? String(artifactMatch[1]) : undefined,
  }
}

function extractChangedFiles(outputText: string): string[] {
  const lines = outputText.split('\n')
  const files = new Set<string>()
  for (const rawLine of lines) {
    const line = rawLine.trim()
    const diffMatch = line.match(/^(?:modified:|new file:|deleted:|renamed:|M|A|D|R)\s+(.+)$/i)
    if (diffMatch?.[1]) {
      files.add(cleanFileCandidate(diffMatch[1]))
      continue
    }
    const pathMatch = line.match(/\b(?:src|app|apps|packages|docs|tests)\/[^\s:]+(?:\.[a-z0-9]+)\b/i)
    if (pathMatch?.[0]) files.add(cleanFileCandidate(pathMatch[0]))
  }
  return Array.from(files).filter(Boolean)
}

function extractPreviewUrls(outputText: string): string[] {
  const matches = outputText.match(/https?:\/\/[^\s)]+/gi) || []
  return Array.from(new Set(matches)).slice(0, 3)
}

function extractDiffStats(outputText: string): string | null {
  const summaryMatch = outputText.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/i
  )
  if (!summaryMatch) return null
  const [, files, insertions, deletions] = summaryMatch
  const parts = [`${files} files changed`]
  if (insertions) parts.push(`${insertions} insertions`)
  if (deletions) parts.push(`${deletions} deletions`)
  return parts.join(', ')
}

function cleanFileCandidate(value: string): string {
  return value.replace(/^[.\/]+/, '').replace(/[,;:]$/, '').trim()
}

function buildRecommendedNextSteps(
  reply: StructuredCommandReply,
  intent: 'build' | 'test' | 'deploy' | 'command'
): Array<{ title: string; text?: string; badge?: string; strongTitle?: boolean }> {
  if (reply.success) {
    if (intent === 'build') {
      return [
        { title: 'Run the tests next', text: 'A passing build is the right place to verify behavior before we celebrate.', badge: 'Recommended', strongTitle: true },
        { title: 'Keep the receipt handy', text: 'Use the linked receipt if you want to trace exactly what the build produced.' },
      ]
    }
    if (intent === 'test') {
      return [
        { title: 'Move to a build or deploy check', text: 'The tests are the best gate to clear before packaging or shipping.', badge: 'Recommended', strongTitle: true },
      ]
    }
    if (intent === 'deploy') {
      return [
        { title: 'Verify the live target', text: 'Check the deployed URL, target identity, and build proof before treating the release as complete.', badge: 'Recommended', strongTitle: true },
        { title: 'Confirm rollback truth', text: 'Make sure rollback is truly available for this target instead of assuming the provider can undo it.' },
      ]
    }
    return [{ title: 'Inspect the receipt trail', text: 'That keeps the next step grounded in the same proof-backed path.', badge: 'Recommended', strongTitle: true }]
  }

  if (intent === 'build') {
    return [
      { title: 'Trace the first failing step', text: 'The execution trace is the fastest way to find the step that actually broke.', badge: 'Recommended', strongTitle: true },
      { title: 'Ask for a safe fix plan', text: 'Rina can map the smallest repair path instead of guessing from the whole log.' },
    ]
  }
  if (intent === 'test') {
    return [
      { title: 'Focus on the first failing test', text: 'The first failure is usually the cleanest place to recover without noise.', badge: 'Recommended', strongTitle: true },
      { title: 'Draft a fix plan', text: 'Rina can turn the failing output into a safe, receipts-backed repair path.' },
    ]
  }
  if (intent === 'deploy') {
    return [
      { title: 'Inspect the deploy target and trace', text: 'That will tell us whether the failure was configuration, packaging, or provider-side.', badge: 'Recommended', strongTitle: true },
      { title: 'Ask for a rollback-safe recovery plan', text: 'Rina can map the safest next move without pretending the release landed.' },
      { title: 'Check whether rollback is real', text: 'Some targets need manual rollback, and the receipt should say that clearly.' },
    ]
  }
  return [
    { title: 'Inspect the trace before retrying', text: 'That keeps the next move anchored to what actually failed.', badge: 'Recommended', strongTitle: true },
    { title: 'Rerun through the trusted path if needed', text: 'Use the canonical run flow if you need receipts and proof attached.' },
  ]
}

function buildRecommendedActions(
  reply: StructuredCommandReply,
  intent: 'build' | 'test' | 'deploy' | 'command'
): ReplyAction[] {
  if (reply.success) {
    if (intent === 'build') {
      return [{ label: 'Run the tests next', prompt: 'Run the test suite through the trusted path.' }]
    }
    if (intent === 'test') {
      return [{ label: 'Build this project', prompt: 'Build this project through the trusted path.' }]
    }
    if (intent === 'deploy') {
      return [
        { label: 'Summarize the deploy target', prompt: `Summarize the deploy target and proof for: ${reply.command}` },
        { label: 'Verify deploy proof', prompt: `Verify the deployed URL, target identity, and build evidence for: ${reply.command}` },
      ]
    }
    return []
  }

  if (intent === 'build') {
    return [
      { label: 'Draft a safe fix plan', prompt: `Create a safe fix plan for this failing build: ${reply.command}` },
      { label: 'Find the first failing step', tab: 'execution-trace' },
    ]
  }
  if (intent === 'test') {
    return [
      { label: 'Draft a fix plan', prompt: `Create a safe fix plan for this failing test run: ${reply.command}` },
      { label: 'Inspect the first failing test', tab: 'execution-trace' },
    ]
  }
  if (intent === 'deploy') {
    return [
      { label: 'Recommend the safest recovery', prompt: `Recommend the safest recovery after this failed deploy: ${reply.command}` },
      { label: 'Check rollback truth', prompt: `Check whether rollback is truly available or manual for this failed deploy: ${reply.command}` },
      { label: 'Inspect deploy trace', tab: 'execution-trace' },
    ]
  }
  return reply.success ? [] : [{ label: 'Recommend the next safe move', prompt: `Recommend the next safe move after this failed command: ${reply.command}` }]
}

function dedupeActions(actions: ReplyAction[]): ReplyAction[] {
  const seen = new Set<string>()
  const deduped: ReplyAction[] = []
  for (const action of actions) {
    const key = JSON.stringify(action)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(action)
  }
  return deduped
}

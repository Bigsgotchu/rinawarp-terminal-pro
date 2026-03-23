import type { ReceiptData, RunArtifactSummary, RunModel, WorkbenchState } from './types.js'

type StructuredReceipt = ReceiptData & {
  kind?: string
  id?: string
  sessionId?: string
  session?: {
    id?: string | null
    updatedAt?: string | null
  }
  command?: {
    input?: string | null
    endedAt?: string | null
    exitCode?: number | null
    ok?: boolean | null
    cancelled?: boolean
  }
  artifacts?: {
    stdoutPreview?: string
    stderrPreview?: string
    metaPreview?: string
    urls?: string[]
  }
}

const DEPLOY_SIGNAL = /\b(deploy|wrangler|vercel|netlify|docker|compose|ssh|scp|rsync|pm2|systemctl|pages deploy|workers deploy)\b/i

export function deriveDeploymentState(
  state: Pick<WorkbenchState, 'runs' | 'receipt' | 'runArtifactSummaryByRunId' | 'runOutputTailByRunId' | 'code'>
): WorkbenchState['deployment'] {
  const inferredWorkspace = inferWorkspaceDeployTarget(state.code?.files || [])
  const receipt = toStructuredDeployReceipt(state.receipt)
  const receiptRun = receipt ? findRunForReceipt(state.runs, receipt) : null
  const latestRun = receiptRun || findLatestDeployRun(state.runs)
  const artifactSummary = latestRun ? state.runArtifactSummaryByRunId[latestRun.id] || null : null
  const outputTail = latestRun ? state.runOutputTailByRunId[latestRun.id] || '' : ''
  const target = inferDeployTarget([
    latestRun?.title,
    latestRun?.command,
    receipt?.command?.input,
    outputTail,
    artifactSummary?.metaPreview,
    artifactSummary?.stdoutPreview,
    receipt?.artifacts?.metaPreview,
    receipt?.artifacts?.stdoutPreview,
  ])

  if (!latestRun && !receipt) {
    return {
      target: null,
      detectedTarget: inferredWorkspace.target,
      detectedSignals: inferredWorkspace.signals,
      recommendedPackKey: inferredWorkspace.packKey,
      targetIdentity: inferredWorkspace.identity,
      targetIdentitySource: inferredWorkspace.identity ? 'workspace-signal' : 'unknown',
      targetIdentityEvidence: inferredWorkspace.identity ? inferredWorkspace.signals : [],
      status: 'idle',
      verification: 'not-run',
      rollback: 'unknown',
      latestRunId: null,
      latestReceiptId: null,
      targetUrl: null,
      artifact: null,
      buildId: null,
      verificationEvidence: [],
      rollbackEvidence: [],
      summary: 'No deploy proof yet.',
      verificationSummary: 'Verification has not run yet.',
      rollbackSummary: 'Rollback truth is unknown until a deploy target is selected.',
      nextActionLabel: 'Run deploy preflight',
      updatedAt: null,
      source: 'none',
    }
  }

  const targetUrl = extractFirstUrl([
    receipt?.artifacts?.urls || [],
    extractUrls(outputTail),
    extractUrls(artifactSummary?.stdoutPreview || ''),
    extractUrls(artifactSummary?.metaPreview || ''),
    extractUrls(receipt?.artifacts?.stdoutPreview || ''),
    extractUrls(receipt?.artifacts?.metaPreview || ''),
  ])
  const artifact = inferArtifact([
    latestRun?.command,
    outputTail,
    artifactSummary?.metaPreview,
    receipt?.artifacts?.metaPreview,
    receipt?.artifacts?.stdoutPreview,
  ])
  const buildId = inferBuildId([
    outputTail,
    artifactSummary?.metaPreview,
    receipt?.artifacts?.metaPreview,
    receipt?.id,
    latestRun?.latestReceiptId,
  ])
  const status = inferDeploymentStatus(latestRun, receipt, targetUrl)
  const targetIdentity = inferTargetIdentity(target, inferredWorkspace, [
    latestRun?.title,
    latestRun?.command,
    outputTail,
    artifactSummary?.metaPreview,
    artifactSummary?.stdoutPreview,
    receipt?.artifacts?.metaPreview,
    receipt?.artifacts?.stdoutPreview,
  ])
  const verificationEvidence = inferVerificationEvidence(targetUrl, [
    outputTail,
    artifactSummary?.metaPreview,
    artifactSummary?.stdoutPreview,
    receipt?.artifacts?.metaPreview,
    receipt?.artifacts?.stdoutPreview,
  ])
  const rollbackEvidence = inferRollbackEvidence(target, [
    outputTail,
    artifactSummary?.metaPreview,
    artifactSummary?.stdoutPreview,
    receipt?.artifacts?.metaPreview,
    receipt?.artifacts?.stdoutPreview,
  ])
  const verification = inferVerificationStatus(status, targetUrl)
  const rollback = inferRollbackStatus(target, artifact, buildId, rollbackEvidence)
  const summary = buildSummary(status, target, targetUrl, targetIdentity.identity)
  const verificationSummary = buildVerificationSummary(verification, targetUrl, verificationEvidence)
  const rollbackSummary = buildRollbackSummary(rollback, target, rollbackEvidence)
  const nextActionLabel = buildNextAction(status, verification, rollback)

  return {
    target,
    detectedTarget: inferredWorkspace.target,
    detectedSignals: inferredWorkspace.signals,
    recommendedPackKey: inferredWorkspace.packKey,
    targetIdentity: targetIdentity.identity,
    targetIdentitySource: targetIdentity.source,
    targetIdentityEvidence: targetIdentity.evidence,
    status,
    verification,
    rollback,
    latestRunId: latestRun?.id || null,
    latestReceiptId: receipt?.id || latestRun?.latestReceiptId || null,
    targetUrl,
    artifact,
    buildId,
    verificationEvidence,
    rollbackEvidence,
    summary,
    verificationSummary,
    rollbackSummary,
    nextActionLabel,
    updatedAt: receipt?.command?.endedAt || receipt?.session?.updatedAt || latestRun?.updatedAt || null,
    source: receipt ? 'receipt' : 'run',
  }
}

export function isDeployRun(run: Pick<RunModel, 'title' | 'command'>): boolean {
  return DEPLOY_SIGNAL.test(`${run.title || ''}\n${run.command || ''}`)
}

function findLatestDeployRun(runs: RunModel[]): RunModel | null {
  const candidates = runs.filter(isDeployRun)
  if (candidates.length === 0) return null
  return [...candidates].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] || null
}

function toStructuredDeployReceipt(receipt: ReceiptData | null): StructuredReceipt | null {
  if (!receipt || typeof receipt !== 'object') return null
  const structured = receipt as StructuredReceipt
  if (structured.kind !== 'structured_command_receipt') return null
  if (!DEPLOY_SIGNAL.test(String(structured.command?.input || ''))) return null
  return structured
}

function findRunForReceipt(runs: RunModel[], receipt: StructuredReceipt): RunModel | null {
  return (
    runs.find((run) => run.latestReceiptId === receipt.id) ||
    runs.find((run) => run.sessionId === receipt.sessionId || run.sessionId === receipt.session?.id) ||
    null
  )
}

function inferDeployTarget(chunks: Array<string | null | undefined>): WorkbenchState['deployment']['target'] {
  const source = chunks.filter(Boolean).join('\n').toLowerCase()
  if (/\b(cloudflare|wrangler|workers|pages)\b/.test(source)) return 'cloudflare'
  if (/\bvercel\b/.test(source)) return 'vercel'
  if (/\bnetlify\b/.test(source)) return 'netlify'
  if (/\bdocker\b/.test(source)) return 'docker'
  if (/\b(vps|ssh|scp|rsync|pm2|systemctl)\b/.test(source)) return 'vps'
  return 'unknown'
}

function inferArtifact(chunks: Array<string | null | undefined>): string | null {
  const source = chunks.filter(Boolean).join('\n')
  const explicit =
    source.match(/\bartifact(?: path)?[:=]\s*([^\s]+)/i)?.[1] ||
    source.match(/\bimage(?: tag)?[:=]\s*([^\s]+)/i)?.[1] ||
    source.match(/\brelease(?: version)?[:=]\s*([^\s]+)/i)?.[1]
  if (explicit) return explicit
  const version = source.match(/\bv?\d+\.\d+\.\d+(?:[-+][a-z0-9._-]+)?\b/i)?.[0]
  return version || null
}

function inferBuildId(chunks: Array<string | null | undefined>): string | null {
  const source = chunks.filter(Boolean).join('\n')
  const explicit =
    source.match(/\bbuild(?: id)?[:=#]\s*([a-z0-9._-]+)/i)?.[1] ||
    source.match(/\bdeployment(?: id)?[:=#]\s*([a-z0-9._-]+)/i)?.[1]
  if (explicit) return explicit
  const receiptLike = source.match(/\b(?:receipt|run)-[a-z0-9._-]+\b/i)?.[0]
  return receiptLike || null
}

function inferDeploymentStatus(
  run: RunModel | null,
  receipt: StructuredReceipt | null,
  targetUrl: string | null
): WorkbenchState['deployment']['status'] {
  if (receipt?.command?.cancelled || run?.status === 'interrupted') return 'interrupted'
  if (run?.status === 'running') return 'running'
  if (run?.status === 'failed') return 'failed'
  if (receipt?.command?.ok === false) return 'failed'
  if (typeof receipt?.command?.exitCode === 'number' && receipt.command.exitCode !== 0) return 'failed'
  if (receipt?.command?.ok === true || run?.status === 'ok') return targetUrl ? 'verified' : 'deployed'
  return 'planning'
}

function inferVerificationStatus(
  status: WorkbenchState['deployment']['status'],
  targetUrl: string | null
): WorkbenchState['deployment']['verification'] {
  if (status === 'verified') return 'passed'
  if (status === 'deployed') return targetUrl ? 'passed' : 'pending'
  if (status === 'running' || status === 'planning') return 'pending'
  return 'not-run'
}

function inferRollbackStatus(
  target: WorkbenchState['deployment']['target'],
  artifact: string | null,
  buildId: string | null,
  rollbackEvidence: string[]
): WorkbenchState['deployment']['rollback'] {
  if (rollbackEvidence.some((item) => /manual|unsupported|not supported/i.test(item))) return 'manual'
  if (target === 'cloudflare' || target === 'vercel' || target === 'netlify') {
    return artifact || buildId || rollbackEvidence.length > 0 ? 'provider-supported' : 'manual'
  }
  if (target === 'docker' || target === 'vps') return artifact ? 'manual' : 'unsupported'
  return 'unknown'
}

function buildSummary(
  status: WorkbenchState['deployment']['status'],
  target: WorkbenchState['deployment']['target'],
  targetUrl: string | null,
  targetIdentity: string | null
): string {
  const targetLabel = targetIdentity || target || 'deploy target'
  if (status === 'verified') return `Latest ${targetLabel} deploy is verified${targetUrl ? ` at ${targetUrl}` : ''}.`
  if (status === 'deployed') return `Latest ${targetLabel} deploy landed, but verification proof still needs review.`
  if (status === 'running') return `A ${targetLabel} deploy is currently running.`
  if (status === 'failed') return `Latest ${targetLabel} deploy failed before verification cleared.`
  if (status === 'interrupted') return `Latest ${targetLabel} deploy was interrupted and needs a recovery decision.`
  return `Deploy preflight is the next safe step for ${targetLabel}.`
}

function buildVerificationSummary(
  verification: WorkbenchState['deployment']['verification'],
  targetUrl: string | null,
  verificationEvidence: string[]
): string {
  if (verification === 'passed') {
    const evidence = verificationEvidence[0]
    return targetUrl ? `Verified against ${targetUrl}${evidence ? ` via ${evidence}` : ''}.` : evidence ? `Verification passed via ${evidence}.` : 'Verification passed.'
  }
  if (verification === 'pending') return 'Verification is required before this deploy should be treated as done.'
  return 'Verification proof is not available yet.'
}

function buildRollbackSummary(
  rollback: WorkbenchState['deployment']['rollback'],
  target: WorkbenchState['deployment']['target'],
  rollbackEvidence: string[]
): string {
  if (rollback === 'provider-supported') {
    const evidence = rollbackEvidence[0]
    return `Rollback is available through ${target || 'the provider'} history${evidence ? ` (${evidence})` : ''} and should be proved before use.`
  }
  if (rollback === 'manual') return rollbackEvidence[0] || 'Rollback exists, but it is manual and should be treated as a deliberate recovery step.'
  if (rollback === 'unsupported') return 'Automatic rollback is not supported for this target yet.'
  return 'Rollback support is not known yet.'
}

function buildNextAction(
  status: WorkbenchState['deployment']['status'],
  verification: WorkbenchState['deployment']['verification'],
  rollback: WorkbenchState['deployment']['rollback']
): string {
  if (status === 'failed' || status === 'interrupted') return rollback === 'provider-supported' ? 'Open receipt and confirm rollback readiness' : 'Open receipt and choose the safest recovery'
  if (verification === 'pending') return 'Run target-aware verification'
  if (status === 'verified') return 'Keep the receipt with the deployed URL and build ID'
  if (status === 'running') return 'Inspect the live deploy run'
  return 'Run deploy preflight'
}

function extractFirstUrl(groups: string[][]): string | null {
  for (const group of groups) {
    const first = group.find(Boolean)
    if (first) return first
  }
  return null
}

function extractUrls(text: string): string[] {
  return Array.from(new Set((text.match(/https?:\/\/[^\s)]+/gi) || []).slice(0, 5)))
}

function inferWorkspaceDeployTarget(files: string[]): {
  target: WorkbenchState['deployment']['detectedTarget']
  signals: string[]
  packKey: string | null
  identity: string | null
} {
  const normalized = files.map((file) => file.toLowerCase())
  const has = (needle: string) => normalized.some((file) => file.endsWith(needle.toLowerCase()) || file.includes(needle.toLowerCase()))
  const signals: string[] = []

  if (has('wrangler.toml') || has('wrangler.json') || has('website/wrangler.toml')) {
    signals.push('wrangler config')
    return { target: 'cloudflare', signals, packKey: 'deploy:cloudflare', identity: 'Cloudflare project' }
  }
  if (has('vercel.json') || has('/.vercel/')) {
    signals.push('vercel config')
    return { target: 'vercel', signals, packKey: 'deploy:vercel', identity: 'Vercel project' }
  }
  if (has('netlify.toml') || has('/.netlify/')) {
    signals.push('netlify config')
    return { target: 'netlify', signals, packKey: 'deploy:netlify', identity: 'Netlify site' }
  }
  if (has('dockerfile') || has('docker-compose.yml') || has('docker-compose.yaml') || has('compose.yaml') || has('compose.yml')) {
    signals.push('docker config')
    return { target: 'docker', signals, packKey: 'deploy:docker', identity: 'Docker deployment' }
  }
  if (has('deploy.sh') || has('/deploy/') || has('pm2') || has('systemd') || has('systemctl')) {
    signals.push('server deploy scripts')
    return { target: 'vps', signals, packKey: 'deploy:vps', identity: 'VPS deployment' }
  }

  return { target: null, signals, packKey: null, identity: null }
}

function inferTargetIdentity(
  target: WorkbenchState['deployment']['target'],
  inferredWorkspace: ReturnType<typeof inferWorkspaceDeployTarget>,
  chunks: Array<string | null | undefined>
): {
  identity: string | null
  source: WorkbenchState['deployment']['targetIdentitySource']
  evidence: string[]
} {
  const source = chunks.filter(Boolean).join('\n')
  const evidence: string[] = []
  const patterns: Array<[RegExp, string]> = [
    [/\bproject(?:-name)?[=:]\s*([a-z0-9._-]+)/i, 'project'],
    [/\bsite(?:-id| name)?[=:]\s*([a-z0-9._-]+)/i, 'site'],
    [/\bworker(?: name)?[=:]\s*([a-z0-9._-]+)/i, 'worker'],
    [/\bservice(?: name)?[=:]\s*([a-z0-9._-]+)/i, 'service'],
    [/\bimage(?: name| tag)?[=:]\s*([a-z0-9._:/-]+)/i, 'image'],
  ]
  for (const [pattern, label] of patterns) {
    const match = source.match(pattern)
    if (match?.[1]) {
      evidence.push(`${label} ${match[1]}`)
      return { identity: match[1], source: 'provider-output', evidence }
    }
  }

  const url = extractUrls(source)[0]
  if (url) {
    const host = safeHostname(url)
    if (host) {
      evidence.push(`host ${host}`)
      return { identity: host, source: 'provider-output', evidence }
    }
  }

  if (inferredWorkspace.identity) {
    return {
      identity: inferredWorkspace.identity,
      source: 'workspace-signal',
      evidence: inferredWorkspace.signals,
    }
  }

  return {
    identity: target && target !== 'unknown' ? `${target} target` : null,
    source: target && target !== 'unknown' ? 'inferred' : 'unknown',
    evidence,
  }
}

function inferVerificationEvidence(targetUrl: string | null, chunks: Array<string | null | undefined>): string[] {
  const source = chunks.filter(Boolean).join('\n')
  const evidence = new Set<string>()
  if (targetUrl) evidence.add(`target URL ${targetUrl}`)
  const health = source.match(/\b(health check|smoke test|verified|verification passed|response 200|status 200)\b/gi) || []
  for (const item of health.slice(0, 3)) evidence.add(item.toLowerCase())
  const urls = extractUrls(source)
  for (const url of urls.slice(0, 2)) evidence.add(`observed URL ${url}`)
  return Array.from(evidence)
}

function inferRollbackEvidence(
  target: WorkbenchState['deployment']['target'],
  chunks: Array<string | null | undefined>
): string[] {
  const source = chunks.filter(Boolean).join('\n')
  const evidence = new Set<string>()
  const explicit = source.match(/\b(rollback(?: command| url)?[=:].+|rollback is manual|rollback not supported|previous deployment|deployment history|promote flow)\b/gi) || []
  for (const item of explicit.slice(0, 3)) evidence.add(item.trim())
  if (evidence.size === 0 && (target === 'cloudflare' || target === 'vercel' || target === 'netlify')) {
    evidence.add('provider deployment history available')
  }
  if (evidence.size === 0 && (target === 'docker' || target === 'vps')) {
    evidence.add('manual rollback expected unless a previous artifact is recorded')
  }
  return Array.from(evidence)
}

function safeHostname(value: string): string | null {
  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

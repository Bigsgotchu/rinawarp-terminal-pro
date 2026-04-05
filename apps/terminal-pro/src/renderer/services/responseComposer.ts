import type { RinaReplyResult } from '../replies/renderRinaReply.js'
import { extractStructuredCommandReply } from '../replies/renderCommandReplies.js'

type MemoryState = {
  owner: {
    ownerId: string
    mode: 'licensed' | 'local-fallback'
  }
  memory: {
    operationalStore?: {
      backend: 'sqlite' | 'json-fallback'
      reason?: string
    }
    profile: {
      preferredName?: string
      tonePreference?: 'concise' | 'balanced' | 'detailed'
      humorPreference?: 'low' | 'medium' | 'high'
      likes?: string[]
      dislikes?: string[]
    }
    inferredMemories?: Array<{
      id: string
      kind: 'preference' | 'habit' | 'project' | 'relationship'
      summary: string
      confidence: number
      source: 'behavior' | 'conversation'
      workspaceId?: string
      runId?: string
      status: 'suggested' | 'approved' | 'dismissed'
      createdAt: string
      updatedAt: string
    }>
  }
}

type ComposeReplyLeadArgs = {
  result: RinaReplyResult
  memoryState?: MemoryState | null
}

type ComposeExecutionPlanLeadArgs = {
  prompt: string
  stepCount: number
  requiresCapabilities?: boolean
  memoryState?: MemoryState | null
}

type ComposeCapabilityLeadArgs = {
  state: 'ready' | 'locked' | 'install'
  title: string
  reason: string
  memoryState?: MemoryState | null
}

type ComposeExecutionHaltLeadArgs = {
  prompt: string
  reason?: string
  memoryState?: MemoryState | null
}

type ComposeMemoryContextNoteArgs = {
  memoryState?: MemoryState | null
  constraints?: string[]
}

function classifyIntent(command: string): 'build' | 'test' | 'deploy' | 'fix' | 'self_check' | 'command' {
  const normalized = command.toLowerCase()
  if (/\b(scan yourself|check yourself|self-check|inspect current state|check the workbench)\b/.test(normalized)) return 'self_check'
  if (normalized.includes('build')) return 'build'
  if (normalized.includes('test')) return 'test'
  if (normalized.includes('deploy')) return 'deploy'
  if (/\bfix|repair\b/.test(normalized)) return 'fix'
  return 'command'
}

function addLightStyle(text: string, tone: 'concise' | 'balanced' | 'detailed', humor: 'low' | 'medium' | 'high', success: boolean): string {
  if (!success) return text
  if (tone === 'concise') return text
  if (humor === 'high') return `${text} Clean proof beats dramatic speeches.`
  if (humor === 'medium') return `${text} Nice and boring, which is exactly what we want.`
  return text
}

function getProfile(memoryState?: MemoryState | null): MemoryState['memory']['profile'] | null {
  return memoryState?.memory.profile || null
}

function getTone(memoryState?: MemoryState | null): 'concise' | 'balanced' | 'detailed' {
  return getProfile(memoryState)?.tonePreference || 'balanced'
}

function getHumor(memoryState?: MemoryState | null): 'low' | 'medium' | 'high' {
  return getProfile(memoryState)?.humorPreference || 'medium'
}

function getApprovedInferenceSummaries(memoryState?: MemoryState | null): string[] {
  const entries = memoryState?.memory.inferredMemories
  if (!Array.isArray(entries)) return []
  return entries.filter((entry) => entry.status === 'approved').map((entry) => entry.summary.toLowerCase())
}

function hasApprovedInference(memoryState: MemoryState | null | undefined, pattern: RegExp): boolean {
  return getApprovedInferenceSummaries(memoryState).some((summary) => pattern.test(summary))
}

export function composeMemoryContextNote({ memoryState, constraints }: ComposeMemoryContextNoteArgs): string | null {
  const activeConstraints = Array.isArray(constraints)
    ? constraints.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []
  if (activeConstraints.length === 0) return null

  const backend = memoryState?.memory.operationalStore?.backend === 'json-fallback' ? 'JSON fallback' : 'SQLite'
  return activeConstraints.length === 1
    ? `Using remembered constraint from ${backend} memory for this turn.`
    : `Using ${activeConstraints.length} remembered constraints from ${backend} memory for this turn.`
}

export function composeRinaReplyLead({ result, memoryState }: ComposeReplyLeadArgs): string | null {
  const tone = getTone(memoryState)
  const humor = getHumor(memoryState)
  const output = result.rina?.output
  const commandReply = extractStructuredCommandReply(output)

  if (commandReply) {
    const kind = classifyIntent(commandReply.command)
    const hasProof = Boolean(commandReply.runId || commandReply.receiptId || commandReply.sessionId)
    if (commandReply.success) {
      const base =
        kind === 'build'
          ? hasProof
            ? 'The build finished on the trusted path. The proof card below has the run details, and the next sensible move is to run the tests.'
            : 'The build returned output, but it is still unverified until it has linked run proof.'
          : kind === 'test'
            ? hasProof
              ? 'The test run finished on the trusted path. The proof card below has the run details, and from here we can move to build or deploy with a straight face.'
              : 'The test output came back, but it is still unverified until it has linked run proof.'
            : kind === 'deploy'
              ? hasProof
                ? 'The deploy flow finished on the trusted path. The proof card below has the run details and the target metadata so we can verify what actually landed.'
                : 'The deploy output came back, but it is still unverified until it has linked run proof.'
              : kind === 'fix'
                ? hasProof
                  ? 'The fix run finished on the trusted path. The proof card below has the run details and the cleanest next verification step.'
                  : 'The fix output came back, but it is still unverified until it has linked run proof.'
                : hasProof
                  ? 'The command finished on the trusted path. The proof card below has the run details.'
                  : 'The command returned output, but it is still unverified until it has linked run proof.'
      return addLightStyle(base, tone, humor, true)
    }

    return kind === 'build'
      ? 'The build failed. I kept the proof, artifact hints, and next safe moves together below so we can inspect it without guessing.'
      : kind === 'test'
        ? 'The tests failed. I kept the proof, failure clues, and next safe moves together below so we can inspect it without guessing.'
        : kind === 'deploy'
          ? 'The deploy failed. I kept the proof, target clues, and safest recovery options together below so we can inspect it without guessing.'
          : kind === 'fix'
            ? 'The fix attempt failed. I kept the proof and the next safe repair options together below so we can inspect it without guessing.'
            : 'That command failed. I kept the proof, output, and next safe options together below so we can inspect it without guessing.'
  }

  if (result.requiresConfirmation) {
    return tone === 'concise'
      ? 'I mapped the next step and I need your approval before I run anything.'
      : 'I mapped the next step, but I am keeping the execution boundary strict. I need your approval before I run anything.'
  }

  if (result.error || result.rina?.error) {
    return 'I hit a problem before I could finish cleanly. I am keeping the response grounded in what actually happened.'
  }

  if (result.intent === 'execute') {
    return tone === 'detailed'
      ? 'I kept the execution path and proof attached. You can inspect the trace and receipts directly from here.'
      : 'I kept the execution path and proof attached below.'
  }

  return null
}

export function composeExecutionPlanLead({
  prompt,
  stepCount,
  requiresCapabilities,
  memoryState,
}: ComposeExecutionPlanLeadArgs): string {
  const tone = getTone(memoryState)
  const humor = getHumor(memoryState)
  const intent = classifyIntent(prompt)
  const target =
    intent === 'self_check'
      ? 'self-check'
      : intent === 'build'
      ? 'build'
      : intent === 'test'
        ? 'test run'
        : intent === 'deploy'
          ? 'deploy flow'
          : intent === 'fix'
            ? 'fix path'
            : 'execution path'
  const base = requiresCapabilities
    ? `I mapped the ${target} into ${stepCount} proof-backed step${stepCount === 1 ? '' : 's'}, and I flagged the capability checks before anything runs.`
    : `I mapped the ${target} into ${stepCount} proof-backed step${stepCount === 1 ? '' : 's'} so we can inspect the run before it claims anything.`
  if (intent === 'self_check') {
    return 'I’m checking the current workspace and app state now. I’ll verify workspace, IPC, renderer, recovery, updater, and last-run integrity, then report what needs attention.'
  }
  if (intent === 'build' && hasApprovedInference(memoryState, /\bbuild\b.*\bbefore\b.*\btest|build-first/)) {
    return addLightStyle(`${base} I kept the build lane tight first, then left room for the test gate right after.`, tone, humor, true)
  }
  if (intent === 'test' && hasApprovedInference(memoryState, /\btest\b.*\bgate|test-gate/)) {
    return addLightStyle(`${base} I treated the test pass as the real gate before anything louder happens next.`, tone, humor, true)
  }
  if (intent === 'deploy' && hasApprovedInference(memoryState, /\bdeploy\b.*\baware|deploy-aware/)) {
    return addLightStyle(`${base} I kept the deploy path extra explicit so target and receipts stay easy to audit.`, tone, humor, true)
  }
  return addLightStyle(base, tone, humor, true)
}

export function composePlanModeLead({
  prompt,
  stepCount,
  requiresCapabilities,
  memoryState,
}: ComposeExecutionPlanLeadArgs): string {
  const tone = getTone(memoryState)
  const humor = getHumor(memoryState)
  const intent = classifyIntent(prompt)
  const target =
    intent === 'deploy'
      ? 'deploy path'
      : intent === 'fix'
        ? 'repair path'
        : intent === 'self_check'
          ? 'self-check'
          : 'execution path'
  const base = requiresCapabilities
    ? `Plan Mode is on for this ${target}. I mapped ${stepCount} reviewable step${stepCount === 1 ? '' : 's'} and held execution until you choose to run it.`
    : `Plan Mode is on for this ${target}. I mapped ${stepCount} reviewable step${stepCount === 1 ? '' : 's'} and kept execution separate so we can inspect the plan first.`
  return addLightStyle(base, tone, humor, true)
}

export function composeCapabilityLead({ state, title, reason, memoryState }: ComposeCapabilityLeadArgs): string {
  const tone = getTone(memoryState)
  const humor = getHumor(memoryState)
  const base =
    state === 'ready'
      ? `${reason} is ready through ${title}, and I can keep the run on the trusted path from here.`
      : state === 'install'
        ? `${reason} still needs ${title} installed before I can run it with receipts.`
        : `${reason} is available, but ${title} is still behind a higher tier before I can execute it with proof.`
  if (state === 'ready' && hasApprovedInference(memoryState, /\bdeploy\b.*\baware|deploy-aware/)) {
    return addLightStyle(`${base} I will keep the provider and receipt trail visible the whole way through.`, tone, humor, true)
  }
  return state === 'ready' ? addLightStyle(base, tone, humor, true) : base
}

export function composeExecutionHaltLead({ prompt, reason, memoryState }: ComposeExecutionHaltLeadArgs): string {
  const tone = getTone(memoryState)
  const normalizedReason = String(reason || '').toLowerCase()
  const base =
    normalizedReason.includes('confirmation') || normalizedReason.includes('typed yes')
      ? `I paused "${prompt}" before execution crossed the trust boundary. I still need your confirmation.`
      : normalizedReason.includes('policy') || normalizedReason.includes('blocked')
        ? `I stopped "${prompt}" before a trusted run started because policy blocked the path.`
        : `I stopped "${prompt}" before a trusted run started, so there is no proof-backed success claim here.`
  if (hasApprovedInference(memoryState, /\brepair\b.*\bloop|repair-loop/)) {
    return tone === 'concise'
      ? `${base} We can pivot straight into a repair plan when you want.`
      : `${base} The card below keeps the state explicit so we can recover cleanly and pivot into a repair plan without guessing.`
  }
  return tone === 'concise' ? base : `${base} The card below keeps the state explicit so we can recover cleanly.`
}

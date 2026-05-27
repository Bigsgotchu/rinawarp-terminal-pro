import { randomUUID } from 'node:crypto'
import type { RinaExecutionRecord, RinaIntent } from '@rinawarp/rina-core'
import { ExecutionSandbox } from '@rinawarp/rina-runtime/execution/sandbox'
import {
  assertRinaExecutionResult,
  buildExecutionRecord,
} from '@rinawarp/rina-runtime/execution/executionRecord'
import {
  handleIngress,
  type RuntimeIngressPort,
} from '@rinawarp/rina-runtime/ipc/handleIngress'
import { RinaEventStream, RinaMemoryStore, RinaRuntime } from '@rinawarp/rina-runtime'
import type {
  RuntimeEvent,
  RuntimeIngressRequest,
} from '@rinawarp/rina-runtime/ipc'
import {
  continueRinaAgentAfterFilePatchApproval,
  runRinaAgent,
  type RinaAgentRequest,
  type RinaAgentResult,
} from '../rina-agent.js'

type IntentPayload = {
  prompt?: unknown
  projectRoot?: unknown
}

function isTransactionCreatedEvent(
  event: RuntimeEvent,
): event is Extract<RuntimeEvent, { type: 'transaction.created' }> {
  return event.type === 'transaction.created'
}

function isIntentKind(value: unknown): value is RinaIntent['kind'] {
  return value === 'read' || value === 'analyze' || value === 'mutate' || value === 'execute'
}

function isIntentSource(value: unknown): value is RinaIntent['source'] {
  return value === 'ui' || value === 'mcp' || value === 'cloud' || value === 'agent' || value === 'system'
}

export function parseRinaIntent(value: unknown): RinaIntent | null {
  if (!value || typeof value !== 'object') return null
  const intent = value as Partial<RinaIntent>
  if (typeof intent.id !== 'string' || !intent.id.trim()) return null
  if (!isIntentSource(intent.source) || !isIntentKind(intent.kind)) return null
  if (typeof intent.target !== 'string' || !intent.target.trim()) return null
  if (typeof intent.createdAt !== 'number' || !Number.isFinite(intent.createdAt)) return null
  return {
    id: intent.id,
    source: intent.source,
    kind: intent.kind,
    target: intent.target,
    payload: intent.payload,
    createdAt: intent.createdAt,
  }
}

export function createUiAnalyzeIntent(prompt: string, projectRoot: string): RinaIntent {
  return {
    id: `ui:${randomUUID()}`,
    source: 'ui',
    kind: 'analyze',
    target: 'workspace.build',
    payload: { prompt, projectRoot },
    createdAt: Date.now(),
  }
}

function payloadFor(intent: RinaIntent): IntentPayload {
  return intent.payload && typeof intent.payload === 'object' ? intent.payload as IntentPayload : {}
}

export type RinaRuntimeDeps = {
  memory: RinaMemoryStore
  stream: RinaEventStream
}

function createPanelRuntime(fallbackProjectRoot: string, deps: RinaRuntimeDeps): RuntimeIngressPort {
  const innerRuntime = {
    evaluatePolicy(intent: RinaIntent) {
      return { allow: intent.kind === 'read' || intent.kind === 'analyze' }
    },
    async resolveIntent(intent: RinaIntent, context: RuntimeIngressRequest['context']) {
      const payload = payloadFor(intent)
      const prompt = String(payload.prompt || '').trim()
      if (!prompt) {
        return {
          explanation: 'There was no request to inspect.',
          risk: 'low',
          events: [],
        }
      }
      const projectRoot = String(payload.projectRoot || context?.projectRoot || fallbackProjectRoot)
      const request: RinaAgentRequest = {
        sessionId: context?.sessionId || intent.id,
        userMessage: prompt,
        cwd: projectRoot,
        recentTranscript: [],
        recentCommands: [],
      }
      const result = await runRinaAgent(request, { cwd: projectRoot })
      return { ...result, request }
    },
    createTransaction() {
      throw new Error('Mutation transactions are not connected to Terminal Pro ingress yet.')
    },
    async executeTransaction() {
      throw new Error('Mutation execution is not connected to Terminal Pro ingress yet.')
    },
  }

  return new RinaRuntime(innerRuntime as any, deps)
}

async function ingressToExecutionRecord(
  intent: RinaIntent,
  fallbackProjectRoot: string,
  context: RuntimeIngressRequest['context'] | undefined,
  deps: RinaRuntimeDeps | undefined,
  ingress: (request: RuntimeIngressRequest, runtime: RuntimeIngressPort) => ReturnType<typeof handleIngress>,
): Promise<RinaExecutionRecord> {
  const request: RuntimeIngressRequest = {
    type: 'intent.submit',
    intent,
    context: {
      projectRoot: context?.projectRoot || fallbackProjectRoot,
      sessionId: context?.sessionId || intent.id,
    },
  }
  const runtimeDeps = deps || { memory: new RinaMemoryStore(), stream: new RinaEventStream() }
  const response = await ingress(request, createPanelRuntime(fallbackProjectRoot, runtimeDeps))
  const record = buildExecutionRecord(intent, response)
  assertRinaExecutionResult(record)
  return record
}

export async function submitRinaIntent(
  intent: RinaIntent,
  fallbackProjectRoot: string,
  context?: RuntimeIngressRequest['context'],
  deps?: RinaRuntimeDeps,
): Promise<RinaExecutionRecord> {
  return ingressToExecutionRecord(intent, fallbackProjectRoot, context, deps, handleIngress)
}

export async function submitUiPrompt(
  prompt: string,
  projectRoot: string,
  context?: RuntimeIngressRequest['context'],
  deps?: RinaRuntimeDeps,
): Promise<RinaExecutionRecord> {
  return submitRinaIntent(createUiAnalyzeIntent(prompt, projectRoot), projectRoot, context, deps)
}

export async function submitApprovedPatchIntent(
  request: RinaAgentRequest,
  payload: unknown,
  deps?: RinaRuntimeDeps,
): Promise<RinaExecutionRecord> {
  const target = String((payload as { path?: unknown } | null)?.path || 'workspace.patch')
  const intent: RinaIntent = {
    id: `ui:${randomUUID()}`,
    source: 'ui',
    kind: 'mutate',
    target,
    payload: { approved: true },
    createdAt: Date.now(),
  }
  const executionSandbox = new ExecutionSandbox(request.cwd)

  const innerRuntime = {
    evaluatePolicy() {
      return { allow: true }
    },
    createTransaction() {
      return { id: `txn:${randomUUID()}` }
    },
    executeTransaction(transaction: { id: string }) {
      return continueRinaAgentAfterFilePatchApproval(request, payload as never, {
        cwd: request.cwd,
        executionSandbox,
        transactionId: transaction.id,
      })
    },
  }

  const runtimeDeps = deps || { memory: new RinaMemoryStore(), stream: new RinaEventStream() }
  const runtime = new RinaRuntime(innerRuntime as any, runtimeDeps)

  const response = await handleIngress(
    {
      type: 'intent.submit',
      intent,
      context: { projectRoot: request.cwd, sessionId: request.sessionId },
    },
    runtime,
  )

  const result = response.result as RinaAgentResult | undefined
  const transactionId = response.events.find(isTransactionCreatedEvent)?.transactionId
  if (!transactionId || !result?.transactionOutcome || result.transactionOutcome === 'applied') {
    const record = buildExecutionRecord(intent, response)
    assertRinaExecutionResult(record)
    return record
  }

  const events = response.events.filter((event) => event.type !== 'execution.completed')
  if (result.transactionOutcome === 'rolled_back') {
    events.push({
      type: 'execution.progress',
      transactionId,
      message: 'Verification failed; restored the approved patch backup.',
    })
    events.push({ type: 'transaction.rolled_back', transactionId })
  } else {
    events.push({
      type: 'execution.failed',
      transactionId,
      error: result.explanation,
    })
  }

  const record = buildExecutionRecord(intent, { ...response, events })
  assertRinaExecutionResult(record)
  return record
}

import type { RinaExecutionRecord } from '@rinawarp/rina-core'

type RinaIngressApi = {
  submitIntent(args: unknown): Promise<RinaExecutionRecord>
}

export async function submitAnalyzeIntent(
  rina: RinaIngressApi,
  prompt: string,
  projectRoot: string,
  sessionId?: string,
): Promise<RinaExecutionRecord> {
  const sid = sessionId || `ui:${crypto.randomUUID()}`
  return rina.submitIntent({
    type: 'intent.submit',
    intent: {
      id: sid,
      source: 'ui',
      kind: 'analyze',
      target: 'workspace.build',
      payload: { prompt, projectRoot },
      createdAt: Date.now(),
    },
    context: { projectRoot, sessionId: sid },
  })
}

export function shouldRoutePromptThroughIngress(prompt: string): boolean {
  const value = prompt.trim().toLowerCase()
  if (!value) return false
  return [
    /\bfix\b.*\b(repo|project|build|typescript)\b/i,
    /\b(build|typescript)\b.*\b(fail|error|broken)\b/i,
    /\b(failed|failing)\b.*\bbuild\b/i,
    /\bcheck whether this project builds\b/i,
    /\bdebug\b/i,
    /\brefactor\b/i,
    /\badd tests?\b/i,
  ].some((pattern) => pattern.test(value))
}

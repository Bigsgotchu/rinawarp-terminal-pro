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
    /\b(fix|repair)\b.*\b(repo|project|build|typescript|test|test-fail)\b/i,
    /\b(build|typescript|test)\b.*\b(fail|error|broken|explain)\b/i,
    /\b(failed|failing)\b.*\b(build|test|project)\b/i,
    /\bcheck whether this project builds\b/i,
    /\bdebug\b/i,
    /\brefactor\b/i,
    /\badd tests?\b/i,
    /\brun.*test|\bbuild.*project\b/i,
  ].some((pattern) => pattern.test(value))
}

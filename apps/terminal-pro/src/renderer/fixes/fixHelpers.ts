export type FailedStepContext = {
  runId: string
  streamId: string
  command: string
  cwd: string
}

export function summarizeFailure(command: string, outputTail: string, exitCode: number | null): string {
  const lines = outputTail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const interesting = lines.find((line) => /error|failed|cannot|missing|denied|not found|unknown/i.test(line))
  if (interesting) return interesting.slice(0, 220)
  return `\`${command}\` exited with code ${exitCode ?? 'unknown'}.`
}

export function buildFixIntent(ctx: FailedStepContext, outputTail: string, exitCode: number | null): string {
  return [
    'The command below failed during a background execution run. Produce a minimal fix plan as runnable actions.',
    `Failed command: ${ctx.command}`,
    `cwd: ${ctx.cwd}`,
    `exit code: ${exitCode ?? 'unknown'}`,
    'Recent output tail:',
    outputTail || '(no output captured)',
    'Focus on the safest likely fix first. Avoid destructive commands unless absolutely necessary.',
  ].join('\n')
}

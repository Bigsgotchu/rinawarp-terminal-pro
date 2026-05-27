/**
 * @deprecated Legacy shell — frozen. Production paths must use runtime ingress.
 * Retained only for `RINAWARP_TOOL_SMOKE=1` dev smoke tests.
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export type LegacyExecOptions = {
  cwd?: string
  timeout?: number
  maxBuffer?: number
  shell?: string
  env?: NodeJS.ProcessEnv
}

const FROZEN_MESSAGE =
  'Legacy shell is frozen. Route execution through RinaRuntime (handleIngress). Set RINAWARP_TOOL_SMOKE=1 only for tool smoke tests.'

function assertSmokeAllowed(): void {
  if (process.env.RINAWARP_TOOL_SMOKE !== '1') {
    throw new Error(FROZEN_MESSAGE)
  }
}

export async function execCommand(
  command: string,
  options?: LegacyExecOptions,
): Promise<{ stdout: string; stderr: string }> {
  assertSmokeAllowed()
  const { stdout, stderr } = await execAsync(command, {
    cwd: options?.cwd,
    timeout: options?.timeout,
    maxBuffer: options?.maxBuffer,
    shell: options?.shell,
    env: options?.env,
  })
  return { stdout: String(stdout || ''), stderr: String(stderr || '') }
}

export function execCommandSync(command: string, options?: LegacyExecOptions): string {
  assertSmokeAllowed()
  throw new Error('execCommandSync is not available outside smoke tests; use async execCommand in smoke mode')
}

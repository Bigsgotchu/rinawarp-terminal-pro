/**
 * @rinawarp/core
 *
 * Terminal Write Tool - Real implementation that executes commands safely.
 * This tool is the only place where terminal spawning happens.
 */

import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isEngineCap, type EngineCap } from '../enforcement/engine-cap.js'
import type { Tool, ExecutionContext, ToolResult, FileChange } from '../enforcement/types.js'

import { run, type TerminalResult } from '@rinawarp/tools/terminal'
import { splitCommand, safeEnv } from '@rinawarp/tools/terminal-internals'
import { join } from 'node:path'

/**
 * Terminal input type
 */
export interface TerminalInput {
  command: string
  cwd?: string
  timeoutMs?: number
  env?: Record<string, string>
  stepId?: string
}

/**
 * Combine stdout and stderr, filtering out empty strings
 */
function combine(stdout: string, stderr: string): string {
  const out = stdout?.trim() ? stdout : ''
  const err = stderr?.trim() ? stderr : ''
  return [out, err].filter(Boolean).join('\n')
}

/**
 * Detect file changes after command execution using git diff
 * Returns empty array if not in a git repo or if git is not available
 */
function detectFileChanges(cwd: string): FileChange[] {
  try {
    const gitDir = join(cwd, '.git')
    if (!existsSync(gitDir)) return []

    const diffOutput = execSync('git diff --name-status', {
      cwd,
      encoding: 'utf8',
      timeout: 5000,
    }).trim()

    if (!diffOutput) return []

    const changes: FileChange[] = []
    for (const line of diffOutput.split('\n')) {
      const [status, filePath] = line.split('\t')
      if (!filePath || !status) continue
      let changeType: 'created' | 'modified' | 'deleted'
      if (status === 'A') changeType = 'created'
      else if (status === 'D') changeType = 'deleted'
      else changeType = 'modified'
      changes.push({ path: filePath, changeType })
    }
    return changes
  } catch {
    return []
  }
}

/**
 * Streaming terminal execution with EngineCap enforcement and timeout support
 */
async function runStreaming(cap: EngineCap, input: TerminalInput, ctx: ExecutionContext): Promise<ToolResult> {
  if (!isEngineCap(cap)) {
    return {
      success: false,
      error: 'BYPASS_ATTEMPT: EngineCap required for terminal execution',
      output: '(no output)',
      meta: { command: input.command },
    }
  }

  const { file, args } = splitCommand(input.command)
  const timeout = input.timeoutMs ?? 60_000

  const child = spawn(file, args, {
    shell: false,
    cwd: input.cwd ?? ctx.projectRoot,
    env: { ...safeEnv(process.env), ...input.env, LC_ALL: 'C', LANG: 'C' },
  })

  let stdout = ''
  let stderr = ''
  let timedOut = false

  // Timeout timer
  const timeoutHandle = setTimeout(() => {
    timedOut = true
    child.kill('SIGTERM')
    // Emit timeout event
    ctx.emit?.({
      type: 'cancel',
      streamId: input.stepId,
      stepId: input.stepId,
      command: input.command,
      reason: 'timeout',
    })
  }, timeout)

  child.stdout.on('data', (d) => {
    if (timedOut) return
    const data = d.toString()
    stdout += data
    ctx.emit?.({ type: 'chunk', stream: 'stdout', data, stepId: input.stepId })
  })

  child.stderr.on('data', (d) => {
    if (timedOut) return
    const data = d.toString()
    stderr += data
    ctx.emit?.({ type: 'chunk', stream: 'stderr', data, stepId: input.stepId })
  })

  return await new Promise((resolve) => {
    child.on('close', (code) => {
      clearTimeout(timeoutHandle)
      if (timedOut) {
        resolve({
          success: false,
          error: `TIMEOUT: Command exceeded ${timeout}ms limit`,
          output: stdout || '(no output)',
          meta: { command: input.command, timeout, stderr },
        })
        return
      }
      const output = combine(stdout, stderr) || '(no output)'
      if (code !== 0) {
        resolve({
          success: false,
          error: `Exit code ${code ?? 'unknown'}`,
          output,
          meta: { exitCode: code, command: input.command, stderr },
        })
        return
      }
      const fileChanges = detectFileChanges(input.cwd ?? ctx.projectRoot)
      resolve({
        success: true,
        output,
        meta: { exitCode: code, command: input.command, stderr, fileChanges },
      })
    })

    child.on('error', (err) => {
      clearTimeout(timeoutHandle)
      const output = combine(stdout, stderr) || '(no output)'
      resolve({
        success: false,
        error: err.message,
        output,
        meta: { command: input.command, stderr },
      })
    })
  })
}

/**
 * Terminal Write Tool - executes commands via the engine with proper enforcement
 */
export class TerminalWriteTool implements Tool<TerminalInput> {
  name = 'terminal.write'
  category = 'safe-write' as const
  requiresConfirmation = false

  async run(input: TerminalInput, ctx: ExecutionContext, cap: EngineCap): Promise<ToolResult> {
    // Streaming path: preferred when ctx.emit exists (Electron UI)
    if (ctx.emit) {
      return await runStreaming(cap, input, ctx)
    }

    // Non-streaming path: CLI/tests/etc
    if (!isEngineCap(cap)) {
      return {
        success: false,
        error: 'BYPASS_ATTEMPT: EngineCap required for terminal execution',
        output: '(no output)',
        meta: { command: input.command },
      }
    }

    let result: TerminalResult
    try {
      result = await run(input.command, {
        cwd: input.cwd ?? ctx.projectRoot,
        timeoutMs: input.timeoutMs ?? 60_000,
        env: input.env,
      })
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        output: '(no output)',
        meta: { command: input.command },
      }
    }

    const output = combine(result.stdout, result.stderr) || '(no output)'
    const fileChanges = detectFileChanges(input.cwd ?? ctx.projectRoot)
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `Exit code ${result.exitCode ?? 'unknown'}`,
        output,
        meta: { exitCode: result.exitCode, command: input.command, stderr: result.stderr, fileChanges },
      }
    }

    return {
      success: true,
      output,
      meta: { exitCode: result.exitCode, command: input.command, stderr: result.stderr, fileChanges },
    }
  }
}

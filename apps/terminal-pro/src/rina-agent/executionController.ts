import type { RinaCommandExecutionResult, RinaCommandPlan } from './types.js'

type TerminalRunner = (command: string) => Promise<RinaCommandExecutionResult>

async function runTerminalCommand(command: string, runner?: TerminalRunner): Promise<RinaCommandExecutionResult> {
  if (!runner) {
    throw new Error('No terminal runner is configured.')
  }
  return runner(command)
}

export async function executeApprovedCommand(
  plan: RinaCommandPlan,
  runner?: TerminalRunner
): Promise<RinaCommandExecutionResult> {
  if (plan.requiresApproval) {
    throw new Error('Command requires explicit user approval before execution.')
  }

  return runTerminalCommand(plan.command, runner)
}

export async function executeUserApprovedCommand(
  plan: RinaCommandPlan,
  approved: boolean,
  runner?: TerminalRunner
): Promise<RinaCommandExecutionResult> {
  if (!approved) {
    return {
      skipped: true,
      reason: 'User denied approval.',
    }
  }

  return runTerminalCommand(plan.command, runner)
}

import { describe, expect, it } from 'vitest'
import { planRinaTask } from '../rina-agent/agentPlanner.js'
import { executeApprovedCommand, executeUserApprovedCommand } from '../rina-agent/executionController.js'
import { applySafety } from '../rina-agent/safetyGate.js'
import { summarizeTaskResult } from '../rina-agent/summarizer.js'
import { extractPort, routeRinaTask } from '../rina-agent/taskRouter.js'
import { verifyTaskResult } from '../rina-agent/verifier.js'
import type { RinaCommandPlan, RinaTaskRequest } from '../rina-agent/types.js'

const request: RinaTaskRequest = {
  id: 'task-1',
  message: 'What is using port 3000?',
  cwd: '/tmp/project',
}

function command(risk: RinaCommandPlan['risk']): RinaCommandPlan {
  return {
    id: `cmd-${risk}`,
    command: risk === 'read' ? 'df -h' : 'kill 123',
    reason: 'Test command',
    risk,
    requiresApproval: false,
    expectedEffect: 'Test effect',
    rollbackAwareness: 'Test rollback',
    verificationHint: 'Test verification',
  }
}

describe('Rina Agent Core', () => {
  it('routes supported recovery prompts deterministically', () => {
    expect(routeRinaTask('Why is my disk full?')).toBe('disk_recovery')
    expect(routeRinaTask('What is using port 3000?')).toBe('port_conflict')
    expect(routeRinaTask('npm run build failed')).toBe('failed_build')
    expect(routeRinaTask('hello')).toBe('unknown')
  })

  it('extracts valid ports and rejects missing or invalid ports', () => {
    expect(extractPort('port 3000 is busy')).toBe(3000)
    expect(extractPort('port 99999 is busy')).toBeNull()
    expect(extractPort('what is using this port')).toBeNull()
  })

  it('forces approval for non-read commands', () => {
    expect(applySafety(command('read')).requiresApproval).toBe(false)
    expect(applySafety(command('safe-write')).requiresApproval).toBe(true)
    expect(applySafety(command('destructive')).requiresApproval).toBe(true)
  })

  it('plans disk and port workflows with read commands and approval-gated actions', () => {
    const disk = planRinaTask({ ...request, message: 'Why is my disk full?' }, 'disk_recovery')
    expect(disk.readOnlyCommands.every((plan) => plan.risk === 'read' && !plan.requiresApproval)).toBe(true)
    expect(disk.proposedActions.every((plan) => plan.requiresApproval)).toBe(true)

    const port = planRinaTask(request, 'port_conflict', { port: 3000 })
    expect(port.readOnlyCommands.map((plan) => plan.command)).toContain('lsof -i :3000 -P -n')
    expect(port.readOnlyCommands.every((plan) => !plan.requiresApproval)).toBe(true)
  })

  it('blocks approval-required commands on the read-only execution path', async () => {
    await expect(executeApprovedCommand(applySafety(command('safe-write')), async () => ({ ok: true }))).rejects.toThrow(
      'Command requires explicit user approval before execution.'
    )
  })

  it('skips denied commands and executes explicitly approved commands', async () => {
    const denied = await executeUserApprovedCommand(applySafety(command('safe-write')), false, async () => ({ ok: true }))
    expect(denied).toEqual({ skipped: true, reason: 'User denied approval.' })

    const executed = await executeUserApprovedCommand(applySafety(command('safe-write')), true, async (cmd) => ({
      ok: true,
      output: cmd,
    }))
    expect(executed.output).toBe('kill 123')
  })

  it('verifies and summarizes task results', () => {
    const plan = planRinaTask(request, 'port_conflict', { port: 3000 })
    const summary = summarizeTaskResult({
      kind: 'port_conflict',
      plan,
      summary: 'Port 3000 is being used by node, PID 123.',
      hasProposedActions: true,
    })
    const result = verifyTaskResult({
      taskId: request.id,
      kind: 'port_conflict',
      needsApproval: true,
      summary,
      evidence: { port: 3000, pid: 123 },
    })

    expect(result.status).toBe('needs_approval')
    expect(result.summary).toContain('Port 3000')
    expect(result.evidence).toMatchObject({ port: 3000, pid: 123 })
  })
})

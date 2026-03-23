// Self-check execution for app:self-check intent
// Creates RunModel with checklist findings grouped per policy

import type { RunModel } from '../../renderer/workbench/types.js'
import * as fs from 'fs'
import * as path from 'path'

export async function executeSelfCheck(cwd: string, ctx: {workspaceRoot: string | null, sessionId: string | null, lastRunId: string | null}): Promise<{run: RunModel, findings: string}> {
  const runId = `self-check-${Date.now()}`
  const now = new Date().toISOString()
  const workspaceOk = Boolean(ctx.workspaceRoot && fs.existsSync(ctx.workspaceRoot))
  const ipcOk = process.env.RINAWARP_ENV ? 'configured' : 'runtime-default'
  const rendererOk = 'unverified-from-main-process'
  const updaterOk = process.env.RINAWARP_UPDATE_URL ? 'configured' : 'unverified'
  const agentdOk = process.env.RINAWARP_AGENTD_URL ? 'configured' : 'unverified'
  const lastRunOk = ctx.lastRunId ? 'valid' : 'no run'
  const rawFindings = `## Trust
- Run proof: ${lastRunOk}
- Receipt pipeline: pending-write-check

## Wiring
- Workspace root: ${workspaceOk ? 'OK' : 'MISSING'}
- IPC: ${ipcOk}
- Updater: ${updaterOk}
- Agentd: ${agentdOk}

## UI
- Renderer: ${rendererOk}
- HUD: unverified-from-main-process

## Product
- Recovery: ${ctx.sessionId ? 'session-present' : 'not-checked'}
- Last run record: ${lastRunOk}

Self-check complete: ${workspaceOk ? 'SUCCESS' : 'WARNING - no workspace'}`

  const receiptDir = path.join(process.cwd(), 'runs', 'receipts')
  fs.mkdirSync(receiptDir, { recursive: true })
  const receiptPath = path.join(receiptDir, `${runId}-receipt.md`)
  fs.writeFileSync(receiptPath, rawFindings)
  const receiptOk = fs.existsSync(receiptPath) ? 'written' : 'write-failed'
  console.log('[SELF-CHECK] Receipt written to', receiptPath)

  const findingsWithVerifiedReceipt = rawFindings.replace('Receipt pipeline: pending-write-check', `Receipt pipeline: ${receiptOk}`)

  const findings = `## Self-check receipt: ${receiptPath}

## Summary
Run: ${runId}
Status: ${workspaceOk ? 'ok' : 'failed'}
Exit: ${workspaceOk ? 0 : 1}

${findingsWithVerifiedReceipt}`

  const run: RunModel = {
    id: runId,
    sessionId: ctx.sessionId || runId,
    title: 'Rina self-check',
    command: 'app:self-check',
    cwd,
    status: workspaceOk ? 'ok' : 'failed',
    startedAt: now,
    updatedAt: now,
    endedAt: now,
    exitCode: workspaceOk ? 0 : 1,
    commandCount: 1,
    failedCount: workspaceOk ? 0 : 1,
    latestReceiptId: `${runId}-receipt`,
    projectRoot: ctx.workspaceRoot || undefined,
    source: 'self-check',
    originMessageId: ctx.lastRunId || undefined,
    restored: false,
  }

  return {run, findings}
}

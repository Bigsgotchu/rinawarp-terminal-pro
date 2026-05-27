import type { Page } from '@playwright/test'

type ApprovalOutcome = 'applied' | 'rolled-back'

export async function installRinaBrowserMock(
  page: Page,
  options: { approvalOutcome?: ApprovalOutcome } = {},
): Promise<void> {
  await page.addInitScript(({ approvalOutcome }) => {
    const listeners = {
      data: new Set<(data: string) => void>(),
      exit: new Set<(event: { exitCode: number; signal: number }) => void>(),
    }
    const patchPayload = {
          path: 'tsconfig.json',
          summary: 'Align module resolution with the configured module target.',
          unifiedDiff: [
            '--- a/tsconfig.json',
            '+++ b/tsconfig.json',
            '@@',
            '-    "moduleResolution": "node",',
            '+    "moduleResolution": "NodeNext",',
          ].join('\n'),
          riskLabel: 'safe-write',
          rollbackNotes: 'Rina will save the previous contents before applying this patch.',
          verificationCommand: 'pnpm build',
          diffSummary: '1 file changed, 1 line replaced',
          approvalBoundaryMessage: 'No files have been modified yet.',
          trustIndicators: ['Read-only inspection', 'Awaiting approval'],
          minimalPatchPolicy: 'One configuration line only.',
        },
    }

    const analyzeIntent = {
      id: 'ui:e2e-analyze',
      source: 'ui',
      kind: 'analyze',
      target: 'workspace.build',
      payload: { prompt: 'Fix the failing build.', projectRoot: '/' },
      createdAt: Date.now(),
    }

    ;(window as any).rina = {
      diskFullDiagnostic: async () => ({
        summary: 'E2E mock disk diagnostic completed.',
        findings: [],
        cleanupPlan: [],
      }),
      portConflictDiagnostic: async () => ({
        summary: 'E2E mock port diagnostic completed.',
        process: null,
        stopPlan: [],
      }),
      runApprovedCleanup: async () => ({ ok: true }),
      stopPortProcess: async () => ({ ok: true }),
      workspaceDefault: async () => ({ path: '/' }),
      submitIntent: async (req: { intent: { id: string } }) => ({
        runId: 'request-e2e-inspection',
        requestId: 'request-e2e-inspection',
        intent: req.intent || analyzeIntent,
        transactions: [],
        events: [
          { type: 'intent.created', intentId: req.intent.id },
          { type: 'policy.evaluated', intentId: req.intent.id, decision: 'allow' },
          { type: 'intent.resolved', intentId: req.intent.id },
        ],
        receipts: [{ runId: 'request-e2e-inspection', artifacts: ['request-e2e-inspection'] }],
        outcome: {
          explanation: 'I found one small TypeScript configuration fix. Review the patch before I change any file.',
          risk: 'medium',
          pendingApproval: { kind: 'file_patch', payload: patchPayload },
          request: { prompt: 'Fix the failing build.', projectRoot: '/' },
        },
      }),
      agentApprovePatch: async () => {
        const mutationIntent = {
          id: 'ui:e2e-mutation',
          source: 'ui',
          kind: 'mutate',
          target: 'workspace.patch',
          createdAt: Date.now(),
        }
        if (approvalOutcome === 'rolled-back') {
          return {
            runId: 'fixture-txn-rollback-001',
            requestId: 'request-e2e-rollback',
            intent: mutationIntent,
            transactions: [{ id: 'fixture-txn-rollback-001', status: 'rolled_back' }],
            events: [
              { type: 'intent.created', intentId: 'ui:e2e-mutation' },
              { type: 'policy.evaluated', intentId: 'ui:e2e-mutation', decision: 'allow' },
              { type: 'intent.resolved', intentId: 'ui:e2e-mutation' },
              { type: 'transaction.created', transactionId: 'fixture-txn-rollback-001' },
              { type: 'execution.started', transactionId: 'fixture-txn-rollback-001' },
              {
                type: 'execution.progress',
                transactionId: 'fixture-txn-rollback-001',
                message: 'Verification failed; restored the approved patch backup.',
              },
              { type: 'transaction.rolled_back', transactionId: 'fixture-txn-rollback-001' },
            ],
            receipts: [{ runId: 'fixture-txn-rollback-001', artifacts: ['fixture-txn-rollback-001'], rollback: true }],
            outcome: {
              explanation: 'Verification failed, so Rina restored tsconfig.json from backup. Rollback complete.',
              transactionOutcome: 'rolled_back',
              risk: 'medium',
            },
          }
        }
        return {
          runId: 'fixture-txn-applied-001',
          requestId: 'request-e2e-applied',
          intent: mutationIntent,
          transactions: [{ id: 'fixture-txn-applied-001', status: 'completed' }],
          events: [
            { type: 'intent.created', intentId: 'ui:e2e-mutation' },
            { type: 'policy.evaluated', intentId: 'ui:e2e-mutation', decision: 'allow' },
            { type: 'intent.resolved', intentId: 'ui:e2e-mutation' },
            { type: 'transaction.created', transactionId: 'fixture-txn-applied-001' },
            { type: 'execution.started', transactionId: 'fixture-txn-applied-001' },
            { type: 'execution.completed', transactionId: 'fixture-txn-applied-001' },
          ],
          receipts: [{ runId: 'fixture-txn-applied-001', artifacts: ['fixture-txn-applied-001'] }],
          outcome: {
            explanation: 'Patch approval completed. The approved patch was applied and a rollback backup was preserved.',
            transactionOutcome: 'applied',
            risk: 'medium',
          },
        }
      },
      ptyStart: async () => {
        queueMicrotask(() => {
          for (const listener of listeners.data) listener('RinaWarp Terminal Pro E2E shell ready\\r\\n$ ')
        })
      },
      ptyWrite: async (data: string) => {
        queueMicrotask(() => {
          for (const listener of listeners.data) listener(data)
        })
      },
      ptyResize: async () => {},
      ptyStop: async () => {},
      onPtyData: (listener: (data: string) => void) => {
        listeners.data.add(listener)
        return () => listeners.data.delete(listener)
      },
      onPtyExit: (listener: (event: { exitCode: number; signal: number }) => void) => {
        listeners.exit.add(listener)
        return () => listeners.exit.delete(listener)
      },
    }
  }, { approvalOutcome: options.approvalOutcome || 'applied' })
}

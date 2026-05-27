import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withApp } from './_app'

test.setTimeout(120_000)

function listFilesRecursive(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? listFilesRecursive(target) : [target]
  })
}

test('approved patch rolls back real filesystem state through Electron IPC ingress', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-ipc-runtime-'))
  const target = path.join(workspace, 'tsconfig.json')
  const before = '{\n  "compilerOptions": {\n    "module": "ESNext"\n  }\n}\n'
  const after = '{\n  "compilerOptions": {\n    "module": "NodeNext"\n  }\n}\n'
  fs.writeFileSync(target, before, 'utf8')

  try {
    await withApp(async ({ page }) => {
      const record = await page.evaluate(async ({ cwd, currentContent, newContent }) => {
        return window.rina.agentApprovePatch({
          request: {
            sessionId: 'e2e-runtime-filesystem',
            userMessage: 'Apply approved patch and verify.',
            cwd,
            recentTranscript: [],
            recentCommands: [],
            limits: { maxCommandMs: 5_000 },
          },
          payload: {
            path: 'tsconfig.json',
            summary: 'Exercise rollback boundary.',
            currentContent,
            newContent,
            rerunCommand: 'node -e "process.exit(1)"',
          },
        })
      }, { cwd: workspace, currentContent: before, newContent: after })

      expect(record.events.map((event: { type: string }) => event.type)).toEqual([
        'intent.created',
        'policy.evaluated',
        'intent.resolved',
        'transaction.created',
        'execution.started',
        'execution.progress',
        'transaction.rolled_back',
      ])
      expect(record.outcome?.transactionOutcome).toBe('rolled_back')
      expect(record.outcome?.explanation).toContain('rolled back')
    })

    expect(fs.readFileSync(target, 'utf8')).toBe(before)
    const backupRoot = path.join(workspace, '.rinawarp', 'patch-backups')
    const backupFiles = listFilesRecursive(backupRoot)
    expect(backupFiles.some((entry) => entry.includes('tsconfig.json'))).toBe(true)
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true })
  }
})

import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withApp } from './_app'

test.setTimeout(120_000)

function listFilesRecursive(directory: string): string[] {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? listFilesRecursive(target) : [target]
  })
}

function createBrokenTypeScriptWorkspace(): { workspaceRoot: string; targetFile: string; before: string } {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-safe-mutation-'))
  const targetFile = path.join(workspaceRoot, 'tsconfig.json')
  const before = JSON.stringify({ compilerOptions: { module: 'ESNext' } }, null, 2)

  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'rinawarp-safe-mutation-fixture',
        version: '1.0.0',
        private: true,
        scripts: {
          build: 'node build.mjs',
        },
      },
      null,
      2
    ),
    'utf8'
  )
  fs.writeFileSync(targetFile, before, 'utf8')
  fs.writeFileSync(
    path.join(workspaceRoot, 'build.mjs'),
    [
      "import fs from 'node:fs'",
      "const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))",
      "if (config.compilerOptions?.moduleResolution !== 'NodeNext') {",
      "  console.error(\"tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.\")",
      '  process.exit(1)',
      '}',
      "console.log('Build passed')",
      '',
    ].join('\n'),
    'utf8'
  )

  return { workspaceRoot, targetFile, before }
}

async function submitFixPrompt(page: Page): Promise<void> {
  await page.locator('#agent-input').fill('Fix my project')
  await page.locator('#agent-send').click()
}

test('safe fix requires approval and produces rollback-backed receipt', async () => {
  const { workspaceRoot, targetFile, before } = createBrokenTypeScriptWorkspace()

  try {
    await withApp(async ({ page }) => {
      await page.evaluate((root) => {
        window.dispatchEvent(new CustomEvent('rina:workspace-selected', { detail: { path: root } }))
      }, workspaceRoot)

      await submitFixPrompt(page)

      const thread = page.locator('#agent-output')
      await expect(thread).toContainText(/Approval required before editing files/i, { timeout: 45_000 })
      await expect(thread).toContainText(/safe-write/i)
      await expect(thread).toContainText(/Diff:/i)
      await expect(thread).toContainText(/Touched file: tsconfig\.json/i)
      await expect(thread).toContainText(/Rollback:/i)
      await expect(thread).toContainText(/Verification: npm run build/i)
      await expect(thread.locator('.rw-inline-runblock')).toBeVisible()

      expect(fs.readFileSync(targetFile, 'utf8')).toBe(before)

      const proposal = await page.evaluate(async (root) => {
        return await window.rina.agentRun?.({ prompt: 'Fix my project', projectRoot: root })
      }, workspaceRoot)
      const approval = proposal?.outcome?.pendingApproval
      const payload = approval?.payload

      expect(approval?.kind).toBe('file_patch')
      expect(payload).toEqual(
        expect.objectContaining({
          path: 'tsconfig.json',
          riskLabel: 'safe-write',
          verificationCommand: 'npm run build',
          rollbackNotes: expect.any(String),
          unifiedDiff: expect.stringContaining('moduleResolution'),
        })
      )
      expect(payload.filesTouched).toContain('tsconfig.json')
      expect(fs.readFileSync(targetFile, 'utf8')).toBe(before)

      const approved = await page.evaluate(async ({ request, payload }) => {
        return await window.rina.agentApprovePatch?.({ request, payload })
      }, { request: proposal?.outcome?.request, payload })

      expect(fs.readFileSync(targetFile, 'utf8')).not.toBe(before)
      expect(fs.readFileSync(targetFile, 'utf8')).toContain('"moduleResolution": "NodeNext"')
      expect(listFilesRecursive(path.join(workspaceRoot, '.rinawarp', 'patch-backups')).some((file) => file.includes('tsconfig.json'))).toBe(true)
      expect(approved?.outcome?.explanation || '').toMatch(/verification passed|applied/i)
      expect(approved?.receipts?.length).toBeGreaterThan(0)
      expect(approved?.events?.map((event: { type: string }) => event.type)).toContain('execution.completed')
    })
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true })
  }
})

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { withApp } from './_app'

function createBrokenNodeWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-fix-project-'))

  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'broken-fix-project-fixture',
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

  fs.writeFileSync(
    path.join(workspaceRoot, 'package-lock.json'),
    JSON.stringify(
      {
        name: 'broken-fix-project-fixture',
        version: '1.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'broken-fix-project-fixture',
            version: '1.0.0',
          },
        },
      },
      null,
      2
    ),
    'utf8'
  )

  fs.writeFileSync(
    path.join(workspaceRoot, 'build.mjs'),
    [
      "console.error('Simulated broken build from fixture workspace.')",
      'process.exit(1)',
      '',
    ].join('\n'),
    'utf8'
  )

  return workspaceRoot
}

test('Fix Project IPC produces a repair plan for a broken local workspace', async () => {
  const workspaceRoot = createBrokenNodeWorkspace()
  const workspaceName = path.basename(workspaceRoot)

  await withApp(async ({ page }) => {
    await page.getByRole('button', { name: 'Rina workbench' }).click()

    await page.evaluate((root) => {
      window.dispatchEvent(new CustomEvent('rina:workspace-selected', { detail: { path: root } }))
    }, workspaceRoot)

    await expect(page.locator('#status-bar')).toContainText(workspaceName, { timeout: 10_000 })
    await expect(page.getByText('Click Fix Project to repair this project.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible()

    const result = await page.evaluate(async (root) => {
      return await window.rina.fixProject(root)
    }, workspaceRoot)

    expect(result.success).toBe(true)
    expect(Array.isArray(result.executableSteps)).toBe(true)
    expect(result.executableSteps.map((step: { command: string }) => step.command)).toEqual([
      'node -v',
      'npm -v',
      'npm ci',
      'npm run build',
    ])
    expect(result.verification.status).toBe('pending')
    expect(result.verification.checks).toContain('npm run build')
    expect(result.explanation).toContain('I am ready to run these repair steps:')
  })
})

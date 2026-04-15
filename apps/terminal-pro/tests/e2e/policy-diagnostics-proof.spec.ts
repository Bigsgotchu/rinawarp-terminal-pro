import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { withPackagedApp } from './_app'

test.setTimeout(120_000)

test('packaged diagnostics and policy gate proof export', async () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const evidenceDir = path.resolve(__dirname, '../../../../artifacts/release-evidence/1.1.14')
  fs.mkdirSync(evidenceDir, { recursive: true })

  await withPackagedApp(async ({ page }) => {
    const diagnostics = await page.evaluate(() => window.rina.diagnosticsPaths())
    const blocked = await page.evaluate(() =>
      window.rina.executePlanStream({
        projectRoot: '/tmp',
        confirmed: false,
        confirmationText: '',
        plan: [{ stepId: 's1', risk: 'high-impact', input: { command: 'rm -rf /tmp/rinawarp-policy-check' } }],
      })
    )

    const supportBundle = await page.evaluate(() =>
      window.rina.supportBundle({
        workspaceRoot: '/tmp',
        activeView: { primary: 'agent' },
        recentEvents: [{ type: 'policy-proof', at: Date.now() }],
      })
    )

    expect(diagnostics?.resolved?.policyYaml?.exists).toBe(true)
    expect(typeof diagnostics?.active?.policyYamlPath).toBe('string')
    expect(String(diagnostics?.active?.policyYamlPath || '')).toContain('dist-electron/policy/rinawarp-policy.yaml')

    expect(blocked?.ok).toBe(false)
    expect(String(blocked?.code || '')).toBe('PLAN_HALTED')
    expect(String(blocked?.haltReason || '')).toMatch(/policy|confirmation|approval|profile/i)

    expect(supportBundle?.ok).toBe(true)
    expect(typeof supportBundle?.path).toBe('string')
    expect(fs.existsSync(String(supportBundle.path))).toBe(true)

    fs.writeFileSync(path.join(evidenceDir, 'diagnostics.packaged-sim.json'), JSON.stringify(diagnostics, null, 2), 'utf8')
    fs.writeFileSync(path.join(evidenceDir, 'policy-block-result.packaged-sim.json'), JSON.stringify(blocked, null, 2), 'utf8')
    fs.writeFileSync(path.join(evidenceDir, 'support-bundle-result.packaged-sim.json'), JSON.stringify(supportBundle, null, 2), 'utf8')

    const copiedBundlePath = path.join(evidenceDir, path.basename(String(supportBundle.path)))
    fs.copyFileSync(String(supportBundle.path), copiedBundlePath)
    fs.writeFileSync(path.join(evidenceDir, 'support-bundle-copied-path.txt'), copiedBundlePath + '\n', 'utf8')
  }, { RINAWARP_E2E_USER_DATA_SUFFIX: `policy-proof-${Date.now()}` })
})

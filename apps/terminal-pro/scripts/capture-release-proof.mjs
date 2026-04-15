import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron } from 'playwright'

function fail(message) {
  throw new Error(message)
}

async function waitForFirstWindow(app, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const windows = app.windows()
    if (windows.length > 0) return windows[0]
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  fail(`Timed out waiting for first window after ${timeoutMs}ms`)
}

async function waitForRendererReady(page, timeoutMs = 30_000) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => (window).RINAWARP_READY === true, null, { timeout: timeoutMs })
}

function assertProof(diagnostics, blocked, supportBundle) {
  if (!diagnostics?.resolved?.policyYaml?.exists) {
    fail('Expected diagnostics.resolved.policyYaml.exists to be true')
  }
  if (typeof diagnostics?.active?.policyYamlPath !== 'string' || diagnostics.active.policyYamlPath.length === 0) {
    fail('Expected diagnostics.active.policyYamlPath to be a non-empty string')
  }
  if (!String(diagnostics.active.policyYamlPath).includes('dist-electron/policy/rinawarp-policy.yaml')) {
    fail('Expected diagnostics.active.policyYamlPath to point to dist-electron/policy/rinawarp-policy.yaml')
  }

  if (blocked?.ok !== false) fail('Expected blocked.ok to be false')
  if (String(blocked?.code || '') !== 'PLAN_HALTED') fail('Expected blocked.code to be PLAN_HALTED')
  if (!/policy|confirmation|approval|profile/i.test(String(blocked?.haltReason || ''))) {
    fail('Expected blocked.haltReason to reference policy/approval')
  }

  if (supportBundle?.ok !== true) fail('Expected supportBundle.ok to be true')
  if (typeof supportBundle?.path !== 'string' || supportBundle.path.length === 0) {
    fail('Expected supportBundle.path to be a non-empty string')
  }
  if (!fs.existsSync(String(supportBundle.path))) {
    fail(`Support bundle path does not exist: ${supportBundle.path}`)
  }
}

async function main() {
  const executablePath = process.argv[2]
  const evidenceDir = process.argv[3]
  if (!executablePath) {
    fail('Usage: node apps/terminal-pro/scripts/capture-release-proof.mjs <executable-path> <evidence-dir>')
  }
  if (!evidenceDir) {
    fail('Usage: node apps/terminal-pro/scripts/capture-release-proof.mjs <executable-path> <evidence-dir>')
  }
  if (!fs.existsSync(executablePath)) {
    fail(`Executable not found: ${executablePath}`)
  }

  fs.mkdirSync(evidenceDir, { recursive: true })

  const userDataSuffix = `release-proof-${Date.now()}`
  const cleanHome = path.join(os.tmpdir(), `rinawarp-release-proof-home-${userDataSuffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })

  const env = {
    ...process.env,
    RINAWARP_E2E: '1',
    E2E_TEST: 'true',
    RINAWARP_E2E_USER_DATA_SUFFIX: userDataSuffix,
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    ELECTRON_DISABLE_SANDBOX: '1',
  }
  delete env.ELECTRON_RUN_AS_NODE

  const app = await electron.launch({
    executablePath,
    args: [],
    env,
    cwd: path.dirname(executablePath),
  })

  try {
    const page = await waitForFirstWindow(app)
    await waitForRendererReady(page)

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

    assertProof(diagnostics, blocked, supportBundle)

    const metadata = {
      capturedAt: new Date().toISOString(),
      executablePath,
      appPath: diagnostics?.app?.appPath || null,
      isPackaged: diagnostics?.app?.isPackaged ?? null,
    }

    fs.writeFileSync(path.join(evidenceDir, 'capture-metadata.json'), JSON.stringify(metadata, null, 2), 'utf8')
    fs.writeFileSync(path.join(evidenceDir, 'diagnostics.packaged.json'), JSON.stringify(diagnostics, null, 2), 'utf8')
    fs.writeFileSync(path.join(evidenceDir, 'policy-block-result.packaged.json'), JSON.stringify(blocked, null, 2), 'utf8')
    fs.writeFileSync(path.join(evidenceDir, 'support-bundle-result.packaged.json'), JSON.stringify(supportBundle, null, 2), 'utf8')

    const copiedBundlePath = path.join(evidenceDir, path.basename(String(supportBundle.path)))
    fs.copyFileSync(String(supportBundle.path), copiedBundlePath)
    fs.writeFileSync(path.join(evidenceDir, 'support-bundle-copied-path.txt'), copiedBundlePath + '\n', 'utf8')
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

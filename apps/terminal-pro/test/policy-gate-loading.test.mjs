import test from 'node:test'
import assert from 'node:assert/strict'

const { createPolicyGate } = await import('../dist-electron/main/policy/gate.js')

test('loads policy from app-bundled path and sets active policy path during gate init', async () => {
  const resolvedCalls = []
  const policyPath = '/opt/RinaWarp Terminal Pro/resources/app.asar/dist-electron/policy/rinawarp-policy.yaml'
  const ctx = { lastLoadedPolicyPath: null }

  createPolicyGate({
    fs: {
      existsSync: (inputPath) => inputPath === policyPath,
      readFileSync: () =>
        [
          '',
          'rules:',
          'fallback:',
          '  action: require_approval',
          '  approval: click',
          '  message: "Policy fallback"',
          '',
        ].join('\n'),
    },
    ctx,
    resolveResourcePath: (relPath, devBase) => {
      resolvedCalls.push({ relPath, devBase })
      return policyPath
    },
    warnIfUnexpectedPackagedResource: () => {},
    sessionState: { entries: [] },
    getCurrentRole: () => 'owner',
  })

  assert.deepEqual(resolvedCalls[0], {
    relPath: 'dist-electron/policy/rinawarp-policy.yaml',
    devBase: 'app',
  })
  assert.equal(ctx.lastLoadedPolicyPath, policyPath)
})

test('keeps active policy path null when policy file is missing', async () => {
  const ctx = { lastLoadedPolicyPath: '/stale/path.yaml' }

  const gate = createPolicyGate({
    fs: {
      existsSync: () => false,
      readFileSync: () => '',
    },
    ctx,
    resolveResourcePath: () => '/missing/policy.yaml',
    warnIfUnexpectedPackagedResource: () => {},
    sessionState: { entries: [] },
    getCurrentRole: () => 'owner',
  })

  assert.equal(ctx.lastLoadedPolicyPath, null)
  assert.equal(gate.explainPolicy('echo hello').action, 'require_approval')
})

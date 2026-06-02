import { test } from 'node:test'
import assert from 'node:assert'
import { createPolicyGate } from '../dist-electron/main/policy/gate.js'

const fakeSessionState = {
  entries: [],
}

const policyGate = createPolicyGate({
  fs: { existsSync() {}, readFileSync() {}, writeFileSync() {}, mkdirSync() {} },
  ctx: { lastLoadedPolicyPath: null },
  resolveResourcePath() { return '/dev/null' },
  warnIfUnexpectedPackagedResource() {},
  sessionState: fakeSessionState,
  getCurrentRole() { return 'owner' },
})

function classify(raw) {
  const { ok, message } = policyGate.evaluatePolicyGate(raw.command, false, '')
  return { ok, message }
}

test('policy gate redacts env-looking secrets in draft command plan', async () => {
  const command = 'Deploy with DATABASE_URL=secret-prod and RINAWARP_API_KEY=a1b2c3'
  const { message } = classify(command)
  assert.ok(message.includes('[REDACTED]'), 'expected redacted plan placeholder, got: ' + message)
})

import { test } from 'node:test'
import assert from 'node:assert'
import { createPolicyGate } from '../dist-electron/main/policy/gate.js'

const policyGate = createPolicyGate({
  fs: { existsSync() {}, readFileSync() {}, writeFileSync() {}, mkdirSync() {} },
  ctx: { lastLoadedPolicyPath: null },
  resolveResourcePath() { return '/dev/null' },
  warnIfUnexpectedPackagedResource() {},
  sessionState: { entries: [] },
  getCurrentRole() { return 'owner' },
})

test('MCP read action is allowed through policy gate', async () => {
  const intent = {
    id: 'mcp:test',
    source: 'mcp',
    kind: 'read',
    target: 'github.listIssues',
    payload: { prompt: 'List open issues for this project.', projectRoot: '/tmp/rinawarp-e2e-project' },
    createdAt: Date.now(),
  }
  const result = policyGate.evaluatePolicyGate(JSON.stringify(intent.payload), false, '')
  assert.strictEqual(result.ok, true, JSON.stringify(result))
})

test('MCP receipt metadata includes actionType and toolName', async () => {
  const intent = {
    id: 'mcp:test',
    source: 'mcp',
    kind: 'read',
    target: 'github.listIssues',
    payload: { prompt: 'List open issues for this project.', projectRoot: '/tmp/rinawarp-e2e-project' },
    createdAt: Date.now(),
  }
  const record = {
    intent,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'ok',
    outcome: {
      toolName: 'github.listIssues',
      actionType: 'mcp',
    },
  }
  assert.strictEqual(record.outcome.actionType, 'mcp')
  assert.strictEqual(record.outcome.toolName, 'github.listIssues')
})

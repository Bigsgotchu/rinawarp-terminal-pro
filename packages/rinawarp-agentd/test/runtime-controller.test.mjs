import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('runtime external mode queues task until controller processes it', async () => {
  const agentHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-runtime-ctl-'))
  process.env.RINAWARP_AGENT_HOME = agentHome
  process.env.RINAWARP_RUNTIME_EXECUTION_MODE = 'external'
  const runtime = await import(`../dist/platform/runtime.js?ts=${Date.now()}`)

  const task = runtime.enqueueRuntimeTask({
    workspace_id: 'ws_runtime_ext_1',
    workspace_region: 'us-east-1',
    requested_region: 'us-east-1',
    command: 'echo external-mode',
  })
  assert.equal(task.status, 'queued')

  const before = runtime.getRuntimeTask(task.id)
  assert.equal(before?.status, 'queued')

  const picked = await runtime.processRuntimeQueue(2)
  assert.ok(picked.picked >= 1)

  const after = runtime.getRuntimeTask(task.id)
  assert.ok(after)
  assert.notEqual(after.status, 'queued')
  assert.ok(['running', 'completed', 'failed'].includes(after.status))

  fs.rmSync(agentHome, { recursive: true, force: true })
  delete process.env.RINAWARP_AGENT_HOME
  delete process.env.RINAWARP_RUNTIME_EXECUTION_MODE
})

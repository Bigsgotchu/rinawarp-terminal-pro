import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { OperationalTelemetry } from '../dist-electron/main/telemetry/operationalTelemetry.js'

function makeApp(userData) {
  return {
    getPath(name) {
      assert.strictEqual(name, 'userData')
      return userData
    },
    getVersion() {
      return '1.7.2-beta'
    },
  }
}

describe('OperationalTelemetry', () => {
  it('sends only anonymous install payload fields', async () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-telemetry-'))
    const calls = []
    const telemetry = new OperationalTelemetry({
      app: makeApp(userData),
      baseUrl: 'https://telemetry.example.test',
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) })
      },
    })

    const result = await telemetry.sendInstallPingOnce()
    assert.equal(result.accepted, true)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://telemetry.example.test/v1/telemetry/install')
    assert.deepEqual(Object.keys(calls[0].body).sort(), ['arch', 'installId', 'platform', 'version'])
    assert.equal(calls[0].body.version, '1.7.2-beta')
  })

  it('silently degrades when offline', async () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-telemetry-'))
    const telemetry = new OperationalTelemetry({
      app: makeApp(userData),
      fetchImpl: async () => {
        throw new Error('offline')
      },
    })

    const result = await telemetry.recordCounter('task_started')
    assert.equal(result.accepted, false)
    assert.equal(result.enabled, true)
    assert.equal(result.degraded, true)
  })

  it('records activation counters without private workflow details', async () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-telemetry-'))
    const calls = []
    const telemetry = new OperationalTelemetry({
      app: makeApp(userData),
      baseUrl: 'https://telemetry.example.test',
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) })
      },
    })

    const result = await telemetry.recordCounter('first_proof_generated')
    assert.equal(result.accepted, true)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://telemetry.example.test/v1/telemetry/event')
    assert.deepEqual(Object.keys(calls[0].body).sort(), ['arch', 'count', 'event', 'installId', 'platform', 'version'])
    assert.equal(calls[0].body.event, 'first_proof_generated')
    assert.equal(calls[0].body.count, 1)
    assert.equal(JSON.stringify(calls[0].body).includes('/home/'), false)
    assert.equal(JSON.stringify(calls[0].body).includes('sk_live_'), false)
  })

  it('does not send when opted out', async () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-telemetry-'))
    let calls = 0
    const telemetry = new OperationalTelemetry({
      app: makeApp(userData),
      fetchImpl: async () => {
        calls += 1
      },
    })

    telemetry.setEnabled(false)
    const result = await telemetry.recordCounter('approval_denied')
    assert.equal(result.accepted, false)
    assert.equal(result.enabled, false)
    assert.equal(calls, 0)
  })
})

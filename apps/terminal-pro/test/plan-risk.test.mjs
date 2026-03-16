import test from 'node:test'
import assert from 'node:assert/strict'

const { riskFromPlanStep } = await import('../dist-electron/plan-risk.js')

test('maps inspect/low-risk steps to read', () => {
  assert.equal(riskFromPlanStep({ risk: 'inspect' }), 'read')
  assert.equal(riskFromPlanStep({ risk_level: 'low' }), 'read')
})

test('maps high-impact signals to high-impact', () => {
  assert.equal(riskFromPlanStep({ confirmationScope: 'terminal.write:rm -rf /' }), 'high-impact')
  assert.equal(riskFromPlanStep({ risk: 'high-impact' }), 'high-impact')
  assert.equal(riskFromPlanStep({ risk_level: 'high' }), 'high-impact')
})

test('maps medium/safe-write and preserves fallback', () => {
  assert.equal(riskFromPlanStep({ risk: 'safe-write' }), 'safe-write')
  assert.equal(riskFromPlanStep({ risk_level: 'medium' }), 'safe-write')
  assert.equal(riskFromPlanStep({}), 'safe-write')
})

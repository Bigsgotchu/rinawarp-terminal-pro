import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeAnalyticsProperties } from '../dist/analytics.js'

test('sanitizeAnalyticsProperties redacts billing/auth secrets before telemetry', () => {
  const circular = {}
  circular.self = circular

  const sanitized = sanitizeAnalyticsProperties({
    tier: 'pro',
    customer_id: 'cus_live_123456789',
    customerId: 'cus_live_987654321',
    license_key: 'RW-LIVE-LICENSE-KEY',
    apiKey: 'sk_live_secret',
    nested: {
      refresh_token: 'refresh-token-value',
      stripe_customer_id: 'cus_nested_424242',
    },
    entries: [{ token: 'child-token' }],
    circular,
  })

  assert.equal(sanitized.tier, 'pro')
  assert.equal(sanitized.customer_id, '[redacted:6789]')
  assert.equal(sanitized.customerId, '[redacted:4321]')
  assert.equal(sanitized.license_key, '[redacted]')
  assert.equal(sanitized.apiKey, '[redacted]')
  assert.equal(sanitized.nested.refresh_token, '[redacted]')
  assert.equal(sanitized.nested.stripe_customer_id, '[redacted:4242]')
  assert.equal(sanitized.entries[0].token, '[redacted]')
  assert.equal(sanitized.circular.self, '[redacted]')
})

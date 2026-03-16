const test = require('node:test')
const assert = require('node:assert/strict')
const { redactText, shannonEntropyBitsPerChar } = require('../dist/redaction.js')

test('entropy is higher for random-like strings', () => {
  const low = shannonEntropyBitsPerChar('aaaaaaaaaaaaaaaaaaaaaaaaaaaa')
  const high = shannonEntropyBitsPerChar('aZ8_19kLmN0pQrStUvWxYz+/==12')
  assert.ok(high > low)
})

test('redacts github tokens', () => {
  const input = 'token=ghp_abcdefghijklmnopqrstuvwxyzABCDE123456'
  const result = redactText(input)
  assert.match(result.redactedText, /\[REDACTED\]/)
  assert.ok(result.hits.some((h) => h.kind.includes('github_token')))
})

test('redacts jwt', () => {
  const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaaaa.bbbbbbbbbbbb'
  const result = redactText(input)
  assert.match(result.redactedText, /\[REDACTED\]/)
  assert.ok(result.hits.some((h) => h.kind.includes('jwt')))
})

test('does not redact sha256 hashes by entropy fallback', () => {
  const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  const input = `artifact hash ${hash}`
  const result = redactText(input)
  assert.match(result.redactedText, new RegExp(hash))
  assert.equal(result.hits.length, 0)
})

test('redacts high entropy token', () => {
  const token = 'aZ8_19kLmN0pQrStUvWxYz+/==12aZ8_19kLmN0pQrSt'
  const input = `x=${token}`
  const result = redactText(input)
  assert.match(result.redactedText, /\[REDACTED\]/)
  assert.ok(result.hits.some((h) => h.kind === 'high_entropy_token'))
})

test('respects allowlist regexes', () => {
  const token = 'ghp_abcdefghijklmnopqrstuvwxyzABCDE123456'
  const input = `token=${token}`
  const result = redactText(input, { allowlistRegexes: [/ghp_/] })
  assert.match(result.redactedText, new RegExp(token))
  assert.equal(result.hits.length, 0)
})

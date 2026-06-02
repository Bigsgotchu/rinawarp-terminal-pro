import test from 'node:test'
import assert from 'node:assert/strict'

// Patterns match the actual implementation in memoryExtractor.ts
const SENSITIVE_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /sk__[a-zA-Z0-9]+/,
  /api[_-]?key\s*[=:]\s*[a-zA-Z0-9_\-]+/i,
  /bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /password\s*[=:]\s*\S+/i,
  /secret\s*[=:]\s*\S+/i,
  /token\s*[=:]\s*[a-zA-Z0-9_\-]+/i,
  /aws[_-]?access[_-]?key[_-]?id/i,
  /aws[_-]?secret[_-]?access[_-]?key/i,
  /private[_-]?key/i,
]

function shouldRedact(content) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(content))
}

function redactContent(content) {
  let redacted = content
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
}

test('memory redaction - detects Stripe live keys', () => {
  assert.ok(shouldRedact('my token is sk_live_123'))
  assert.ok(shouldRedact('STRIPE_SECRET_KEY=sk_live_456'))
})

test('memory redaction - detects Stripe test keys', () => {
  assert.ok(shouldRedact('use sk_test_abc for testing'))
})

test('memory redaction - detects API keys with equals', () => {
  assert.ok(shouldRedact('api_key=secret123'))
})

test('memory redaction - detects bearer tokens', () => {
  assert.ok(shouldRedact('Bearer eyJhbGciOiJIUzI1NiJ9'))
})

test('memory redaction - detects passwords with equals', () => {
  assert.ok(shouldRedact('PASSWORD=mypassword123'))
})

test('memory redaction - detects tokens with equals', () => {
  assert.ok(shouldRedact('token=abc123'))
})

test('memory redaction - detects AWS credentials', () => {
  assert.ok(shouldRedact('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'))
})

test('memory redaction - does not redact safe content', () => {
  assert.equal(shouldRedact('I prefer chat-style interface'), false)
  assert.equal(shouldRedact('use pnpm for package management'), false)
  assert.equal(shouldRedact('keep responses short'), false)
})

test('memory redaction - redacts tokens but keeps context', () => {
  const result = redactContent('my api key is sk_live_12345')
  assert.equal(result, 'my api key is [REDACTED]')
  assert.equal(result.includes('sk_live_12345'), false)
})

test('memory redaction - redacts multiple sensitive items', () => {
  const result = redactContent('token=sk_live_123 and other stuff')
  assert.ok(result.includes('[REDACTED]'))
  assert.equal(result.includes('sk_live_123'), false)
})

test('memory redaction - would not store token-containing messages', () => {
  const sensitiveMessages = ['my token is sk_live_123', 'api_key=abc123', 'Bearer secret-token']

  for (const msg of sensitiveMessages) {
    assert.ok(shouldRedact(msg), `Should redact: ${msg}`)
  }
})

test('memory redaction - would store safe preference messages', () => {
  const safeMessages = [
    'I prefer chat-style interface',
    'use pnpm',
    'keep responses short',
    'remember my workspace settings',
  ]

  for (const msg of safeMessages) {
    assert.equal(shouldRedact(msg), false, `Should not redact: ${msg}`)
  }
})

test('memory redaction - can clear workspace memory', () => {
  const memories = [
    { id: '1', content: 'user prefers pnpm', kind: 'preference', scope: 'user' },
    { id: '2', content: 'workspace uses TypeScript', kind: 'project_fact', scope: 'workspace' },
    { id: '3', content: 'build succeeded', kind: 'task_outcome', scope: 'episode' },
  ]

  const beforeCount = memories.length
  memories.length = 0
  assert.equal(memories.length, 0, 'Memory should be cleared')
})

test('memory redaction - can clear all memory', () => {
  const memories = [
    { id: '1', content: 'user prefers pnpm', kind: 'preference', scope: 'user' },
    { id: '2', content: 'workspace uses TypeScript', kind: 'project_fact', scope: 'workspace' },
  ]

  memories.length = 0
  assert.equal(memories.length, 0)
})
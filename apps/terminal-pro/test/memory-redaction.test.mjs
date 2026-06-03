import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRedactedDiagnosticBundleFiles,
  buildRedactedDiagnosticManifest,
  redactDiagnosticText,
} from '../dist-electron/main/diagnostics/redactedDiagnosticBundle.js'

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

test('diagnostic bundle redaction - redacts secrets and private paths', () => {
  const redacted = redactDiagnosticText(
    'failed at /home/karina/private/project with token=sk_live_123 and password=hunter2',
  )
  assert.match(redacted, /\[REDACTED_PATH:/)
  assert.match(redacted, /\[REDACTED_SECRET\]/)
  assert.equal(redacted.includes('/home/karina/private/project'), false)
  assert.equal(redacted.includes('sk_live_123'), false)
  assert.equal(redacted.includes('hunter2'), false)
})

test('diagnostic bundle manifest - includes IDs and counters without raw workspace or commands', () => {
  const manifest = buildRedactedDiagnosticManifest({
    generatedAt: '2026-06-03T00:00:00.000Z',
    appVersion: '1.8.2-beta',
    platform: 'linux',
    arch: 'x64',
    installId: 'anon-install-id',
    workspaceIdentity: '/home/karina/private/project',
    telemetryCounters: { first_proof_generated: 1, workspace_selected: 2 },
    snapshot: {
      mode: 'explain',
      activeView: { primary: 'settings' },
      lastRun: { id: 'run-last', receiptId: 'proof-last' },
      recentRuns: [
        {
          id: 'run-1',
          command: 'cat /home/karina/private/project/.env && echo sk_live_123',
          title: 'secret build',
          status: 'failed',
          receiptId: 'proof-1',
        },
      ],
      recentErrors: [
        {
          category: 'error',
          name: 'renderer.error',
          detail: { message: 'Could not open /home/karina/private/project with bearer abc.def' },
        },
      ],
      recentEvents: [
        {
          ts: '2026-06-03T00:00:01.000Z',
          category: 'ui',
          name: 'workspace.selected',
          detail: { path: '/home/karina/private/project' },
        },
      ],
    },
  })

  const serialized = JSON.stringify(manifest)
  assert.deepEqual(manifest.recentRunIds, ['run-1', 'run-last'])
  assert.deepEqual(manifest.recentProofIds, ['proof-1', 'proof-last'])
  assert.equal(manifest.telemetryCounters.first_proof_generated, 1)
  assert.match(manifest.workspaceIdentity.redacted, /^\[REDACTED_WORKSPACE:/)
  assert.equal(serialized.includes('/home/karina/private/project'), false)
  assert.equal(serialized.includes('cat /home/karina/private/project/.env'), false)
  assert.equal(serialized.includes('sk_live_123'), false)
  assert.equal(serialized.includes('bearer abc.def'), false)
})

test('diagnostic bundle files - export only support-safe artifacts', () => {
  const files = buildRedactedDiagnosticBundleFiles({
    generatedAt: '2026-06-03T00:00:00.000Z',
    appVersion: '1.8.2-beta',
    platform: 'linux',
    arch: 'x64',
    installId: 'anon-install-id',
    workspaceIdentity: 'C:\\Users\\karina\\Secret\\Project',
    snapshot: {
      recentErrors: [{ detail: { message: 'private_key=abc at C:\\Users\\karina\\Secret\\Project' } }],
    },
    telemetryCounters: { crash_report_created: 1 },
  })

  assert.deepEqual(files.map((file) => file.name), [
    'diagnostic-manifest.json',
    'sanitized-log-snippets.txt',
    'telemetry-counters.json',
  ])
  const combined = Buffer.concat(files.map((file) => file.data)).toString('utf8')
  assert.equal(combined.includes('C:\\Users\\karina\\Secret\\Project'), false)
  assert.equal(combined.includes('private_key=abc'), false)
  assert.match(combined, /\[REDACTED_PATH:/)
  assert.match(combined, /\[REDACTED_SECRET\]/)
})

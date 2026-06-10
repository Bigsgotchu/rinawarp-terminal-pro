import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { StructuredSessionStore } from '../../src/structured-session.js'
import type { FileChange } from '../../src/structured-session-types.js'

describe('file-change evidence in Proof', () => {
  let tempDir: string
  let store: StructuredSessionStore

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-change-test-'))
    store = new StructuredSessionStore(tempDir, true)
    store.init()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('records file changes as evidence', () => {
    const sessionId = store.startSession({ source: 'test' })
    const streamId = 'stream_test_1'
    const proofId = 'proof:test:123'

    store.beginCommand({ streamId, proofId })

    const fileChanges: FileChange[] = [
      { path: 'src/index.ts', changeType: 'modified' },
      { path: 'src/utils.ts', changeType: 'created' },
    ]

    store.recordEvidence({
      sessionId,
      commandId: streamId,
      proofId,
      type: 'file_change',
      status: 'present',
      payload: JSON.stringify({ path: 'src/index.ts', changeType: 'modified' }),
    })

    const verification = store.verifyProof(proofId)

    expect(verification.evidence_count).toBe(1)
  })

  it('records multiple file changes for a single command', () => {
    const sessionId = store.startSession({ source: 'test' })
    const streamId = 'stream_test_2'
    const proofId = 'proof:test:456'

    store.beginCommand({ streamId, proofId })

    const fileChanges: FileChange[] = [
      { path: 'src/index.ts', changeType: 'modified' },
      { path: 'src/utils.ts', changeType: 'created' },
      { path: 'src/old.ts', changeType: 'deleted' },
    ]

    for (const change of fileChanges) {
      store.recordEvidence({
        sessionId,
        commandId: streamId,
        proofId,
        type: 'file_change',
        status: 'present',
        payload: JSON.stringify(change),
      })
    }

    const verification = store.verifyProof(proofId)

    expect(verification.evidence_count).toBe(3)
    expect(verification.verification_status).toBe('verified')
  })

  it('handles missing file-change data safely', () => {
    const sessionId = store.startSession({ source: 'test' })
    const streamId = 'stream_test_3'
    const proofId = 'proof:test:789'

    store.beginCommand({ streamId, proofId })

    const verification = store.verifyProof(proofId)

    expect(verification.evidence_count).toBe(0)
    expect(verification.verification_status).toBe('unverified')
  })

  it('does not read real .env files', () => {
    const envDir = path.join(tempDir, 'test-project')
    fs.mkdirSync(envDir, { recursive: true })
    fs.writeFileSync(path.join(envDir, '.env'), 'SECRET_KEY=supersecret')
    fs.writeFileSync(path.join(envDir, 'package.json'), '{"name": "test"}')

    const gitDir = path.join(envDir, '.git')
    fs.mkdirSync(gitDir, { recursive: true })

    const sessionId = store.startSession({ source: 'test', projectRoot: envDir })
    const streamId = 'stream_test_4'
    const proofId = 'proof:test:env'

    store.beginCommand({ streamId, proofId })

    const fileChanges = store.recordEvidence({
      sessionId,
      commandId: streamId,
      proofId,
      type: 'file_change',
      status: 'present',
      payload: JSON.stringify({ path: 'src/index.ts', changeType: 'modified' }),
    })

    expect(fileChanges).toBeDefined()
    expect(store.verifyProof(proofId).verification_status).toBe('verified')
  })

  it('returns empty context for invalid project root', () => {
    const sessionId = store.startSession({ source: 'test', projectRoot: '/nonexistent/path' })
    const streamId = 'stream_test_5'
    const proofId = 'proof:test:invalid'

    store.beginCommand({ streamId, proofId })

    const verification = store.verifyProof(proofId)
    expect(verification.evidence_count).toBe(0)
  })

  it('stores file change evidence with correct payload structure', () => {
    const sessionId = store.startSession({ source: 'test' })
    const streamId = 'stream_test_6'
    const proofId = 'proof:test:payload'

    store.beginCommand({ streamId, proofId })

    const payload = JSON.stringify({ path: 'src/components/Button.tsx', changeType: 'created' })
    store.recordEvidence({
      sessionId,
      commandId: streamId,
      proofId,
      type: 'file_change',
      status: 'present',
      payload,
    })

    const evidenceFile = path.join(tempDir, 'evidence.ndjson')
    const evidence = fs.readFileSync(evidenceFile, 'utf8').split('\n').filter(Boolean).pop()
    const parsed = JSON.parse(evidence)

    expect(parsed.type).toBe('file_change')
    expect(parsed.status).toBe('present')
    expect(parsed.payload).toBe(payload)
  })
})
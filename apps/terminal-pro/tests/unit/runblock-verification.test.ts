import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RinaExecutionRecord } from '@rinawarp/rina-core'

import { renderInlineRunBlock } from '../../src/renderer/workbench/components/agentSurface.js'
import type { InlineRunViewModel } from '../../src/renderer/workbench/view-models/agentThreadModel.js'
import { runBlockFromExecutionRecord } from '../../src/workbench/runBlocks/fromExecutionRecord.js'
import type { VerificationStatus } from '../../src/structured-session-types.js'

type TestDomNode = {
  tagName?: string
  textContent: string
  children: TestDomNode[]
  dataset: Record<string, string>
  className: string
  appendChild: (child: TestDomNode) => TestDomNode
  setAttribute: (name: string, value: string) => void
  addEventListener: () => void
}

function createTestDomNode(tagName?: string, text = ''): TestDomNode {
  return {
    tagName,
    textContent: text,
    children: [],
    dataset: {},
    className: '',
    appendChild(child) {
      this.children.push(child)
      this.textContent += child.textContent
      return child
    },
    setAttribute() {},
    addEventListener() {},
  }
}

function installTestDocument(): void {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => createTestDomNode(tagName) as unknown as HTMLElement,
    createTextNode: (text: string) => createTestDomNode(undefined, text) as unknown as Text,
    createDocumentFragment: () => createTestDomNode('fragment') as unknown as DocumentFragment,
  })
}

function executionRecord(fields: {
  verification_status?: VerificationStatus
  evidence_count?: number
}): RinaExecutionRecord {
  return {
    runId: 'run_123',
    requestId: 'request_123',
    intent: {
      id: 'intent_123',
      source: 'ui',
      kind: 'execute',
      target: 'Run tests',
      createdAt: 1,
    },
    plan: { summary: 'Run tests' },
    transactions: [],
    events: [{ type: 'execution.completed' }],
    receipts: [{ runId: 'run_123', exitCode: 0, artifacts: [], summary: 'Done' }],
    outcome: { explanation: 'Done' },
    ...fields,
  } as RinaExecutionRecord
}

function inlineRunModel(overrides: Partial<InlineRunViewModel> = {}): InlineRunViewModel {
  return {
    id: 'run_123',
    title: 'Run tests',
    command: 'npm test',
    cwd: '/tmp/project',
    status: 'success',
    proofBadge: 'PROOF',
    exitSummary: 'exit 0',
    receiptId: 'proof_123',
    restored: false,
    expanded: false,
    hasOutput: false,
    outputText: '',
    outputPlaceholder: 'Output hidden',
    cognitionLines: [],
    verificationSummary: 'runtime summary stays separate',
    topActions: [],
    bottomActions: [],
    overflowActions: [],
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RunBlock runtime verification mapping', () => {
  it('copies runtime-provided verification_status and evidence_count into RunBlock fields', () => {
    const runBlock = runBlockFromExecutionRecord(
      executionRecord({
        verification_status: 'verified',
        evidence_count: 3,
      })
    )

    expect(runBlock.verificationStatus).toBe('verified')
    expect(runBlock.evidenceCount).toBe(3)
  })

  it('does not infer verification fields when runtime status is missing', () => {
    const runBlock = runBlockFromExecutionRecord(executionRecord({}))

    expect(runBlock.status).toBe('success')
    expect(runBlock.exitCode).toBe(0)
    expect(runBlock.verificationStatus).toBeUndefined()
    expect(runBlock.evidenceCount).toBeUndefined()
  })
})

describe('renderInlineRunBlock proof verification display', () => {
  it('renders verified status from runtime-provided verificationStatus', () => {
    installTestDocument()

    const node = renderInlineRunBlock(inlineRunModel({ verificationStatus: 'verified' }))

    expect(node.textContent).toContain('Proof verified')
    expect(node.textContent).toContain('runtime summary stays separate')
  })

  it('renders partially verified status from runtime-provided verificationStatus', () => {
    installTestDocument()

    const node = renderInlineRunBlock(inlineRunModel({ verificationStatus: 'partially_verified' }))

    expect(node.textContent).toContain('Proof partially verified')
  })

  it('renders unverified status from runtime-provided verificationStatus', () => {
    installTestDocument()

    const node = renderInlineRunBlock(inlineRunModel({ verificationStatus: 'unverified' }))

    expect(node.textContent).toContain('Proof unverified')
  })

  it('renders singular and plural evidence counts', () => {
    installTestDocument()

    const one = renderInlineRunBlock(inlineRunModel({ evidenceCount: 1 }))
    const many = renderInlineRunBlock(inlineRunModel({ evidenceCount: 4 }))

    expect(one.textContent).toContain('1 evidence item')
    expect(many.textContent).toContain('4 evidence items')
  })

  it('does not crash or render inferred status when verificationStatus is missing', () => {
    installTestDocument()

    const node = renderInlineRunBlock(inlineRunModel({ verificationStatus: undefined, evidenceCount: undefined }))

    expect(node.textContent).not.toContain('Proof verified')
    expect(node.textContent).not.toContain('Proof partially verified')
    expect(node.textContent).not.toContain('Proof unverified')
  })
})

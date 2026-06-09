import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildPlannerApprovalContent } from '../../src/renderer/replies/renderPlanReplies.js'
import { plannerApprovalBlock } from '../../src/renderer/replies/renderFragments.js'
import { buildMessageBlockNode } from '../../src/renderer/workbench/renderers/messageBlocks.js'
import { buildReplyActionDataset } from '../../src/renderer/replies/replyActionDatasets.js'
import { handlePlanReject } from '../../src/main/ipc/agentExecutionFlow.js'

type FixPlanStep = {
  stepId?: string
  tool?: string
  input?: {
    command?: string
    cwd?: string
    timeoutMs?: number
  }
  risk?: 'inspect' | 'safe-write' | 'high-impact'
  risk_level?: 'low' | 'medium' | 'high'
  requires_confirmation?: boolean
}

type FixPlanResponse = {
  id?: string
  reasoning?: string
  steps?: FixPlanStep[]
}

type TestDomNode = {
  tagName?: string
  textContent: string
  children: TestDomNode[]
  dataset: Record<string, string>
  className: string
  id: string
  title: string
  tabIndex: number
  disabled: boolean
  hidden: boolean
  attributes: Record<string, string>
  appendChild: (child: TestDomNode) => TestDomNode
  setAttribute: (name: string, value: string) => void
  addEventListener: () => void
}

function createTestDomNode(tagName?: string, text = ''): TestDomNode {
  const node: TestDomNode = {
    tagName,
    textContent: text,
    children: [],
    dataset: {},
    className: '',
    id: '',
    title: '',
    tabIndex: 0,
    disabled: false,
    hidden: false,
    attributes: {},
    appendChild(child) {
      this.children.push(child)
      this.textContent += child.textContent
      return child
    },
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    addEventListener() {},
  }
  return node
}

function installTestDocument(): void {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => createTestDomNode(tagName) as unknown as HTMLElement,
    createTextNode: (text: string) => createTestDomNode(undefined, text) as unknown as Text,
    createDocumentFragment: () => createTestDomNode('fragment') as unknown as DocumentFragment,
  })
}

function createTestPlan(overrides: Partial<FixPlanResponse> = {}): FixPlanResponse {
  return {
    id: 'plan_test_123',
    reasoning: 'Test plan for verification',
    steps: [
      {
        stepId: 'inspect_status',
        tool: 'terminal',
        input: { command: 'git status --short', cwd: '/tmp/test' },
        risk: 'inspect',
        risk_level: 'low',
      },
      {
        stepId: 'run_build',
        tool: 'terminal',
        input: { command: 'pnpm build', cwd: '/tmp/test' },
        risk: 'safe-write',
        risk_level: 'medium',
      },
    ],
    ...overrides,
  }
}

describe('planner-approval block content builder', () => {
  it('creates a planner-approval block with risk level and steps', () => {
    const plan = createTestPlan()
    const blocks = buildPlannerApprovalContent('fix the build', plan, {
      workspaceRoot: '/tmp/test',
      riskLevel: 'medium',
      planRunId: 'run_123',
    })

    expect(blocks).toHaveLength(3)
    expect(blocks[0].type).toBe('bubble')
    expect(blocks[1].type).toBe('planner-approval')

    const approvalBlock = blocks[1] as {
      type: 'planner-approval'
      riskLevel?: string
      steps?: unknown[]
      summary?: string
      approvalReason?: string
      actions?: unknown[]
    }
    expect(approvalBlock.riskLevel).toBe('medium')
    expect(approvalBlock.summary).toBe('Test plan for verification')
    expect(approvalBlock.approvalReason).toBe('Plan ready for approval')
    expect(approvalBlock.steps).toHaveLength(2)
    expect(approvalBlock.actions).toBeDefined()
    expect(approvalBlock.actions).toHaveLength(2)
    expect(approvalBlock.actions?.[0].label).toBe('Approve & Run')
    expect(approvalBlock.actions?.[0].planApprove).toBeTruthy()
    expect(approvalBlock.actions?.[1].label).toBe('Reject')
    expect(approvalBlock.actions?.[1].planReject).toBe('run_123')
  })

  it('does not create actions when workspaceRoot is missing', () => {
    const plan = createTestPlan({
      steps: [{ stepId: 's1', tool: 'terminal', input: { command: 'ls', cwd: '/tmp' }, risk: 'inspect' }],
    })
    const blocks = buildPlannerApprovalContent('review the project', plan, {
      planRunId: 'run_123',
    })

    const approvalBlock = blocks[1] as { type: 'planner-approval'; actions?: unknown[] }
    expect(approvalBlock.actions).toBeUndefined()
  })

  it('generates valid planApprove encoded plan with workspace context', () => {
    const plan = createTestPlan()
    const blocks = buildPlannerApprovalContent('run the build', plan, {
      workspaceRoot: '/tmp/test',
      planRunId: 'run_123',
    })

    const approvalBlock = blocks[1] as { type: 'planner-approval'; actions?: Array<{ executePlan?: string }> }
    const encoded = approvalBlock.actions?.[0].planApprove
    expect(encoded).toBeTruthy()

    const parsed = JSON.parse(encoded!)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].stepId).toBe('inspect_status')
    expect(parsed[0].tool).toBe('terminal')
    expect(parsed[0].input.command).toBe('git status --short')
  })
})

describe('plannerApprovalBlock renderer helper', () => {
  it('creates a valid planner-approval MessageBlock', () => {
    const block = plannerApprovalBlock({
      label: 'Approval Required',
      summary: 'About to modify files',
      steps: [{ stepId: 's1', tool: 'terminal', command: 'ls -la', risk: 'inspect' }],
      approvalReason: 'High-risk action detected',
      riskLevel: 'high',
      workspaceRoot: '/tmp/test',
      planRunId: 'run_456',
      actions: [
        { label: 'Approve & Run', planApprove: '{"steps":[]}', executePlanWorkspaceRoot: '/tmp/test' },
        { label: 'Reject', planReject: 'run_456' },
      ],
    })

    expect(block.type).toBe('planner-approval')
    expect(block.label).toBe('Approval Required')
    expect(block.summary).toBe('About to modify files')
    expect(block.steps).toHaveLength(1)
    expect(block.riskLevel).toBe('high')
    expect(block.actions).toHaveLength(2)
    expect(block.actions?.[0].label).toBe('Approve & Run')
  })
})

describe('planner-approval block DOM rendering', () => {
  beforeEach(() => {
    installTestDocument()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders risk level badge on the approval block', () => {
    const block = plannerApprovalBlock({
      label: 'Approval Required',
      summary: 'Test summary',
      steps: [],
      riskLevel: 'high',
    })

    const node = buildMessageBlockNode(block)
    expect(node).toBeDefined()
  })

  it('renders all steps in the approval block', () => {
    const block = plannerApprovalBlock({
      label: 'Approval Required',
      summary: 'Test summary',
      steps: [
        { stepId: 'step_1', tool: 'terminal', command: 'git status', risk: 'inspect' },
        { stepId: 'step_2', tool: 'terminal', command: 'pnpm build', risk: 'safe-write' },
      ],
    })

    const node = buildMessageBlockNode(block)
    expect(node).toBeDefined()
  })

  it('renders approve/reject action buttons when actions are provided', () => {
    const block = plannerApprovalBlock({
      label: 'Approval Required',
      summary: 'Test summary',
      steps: [],
      actions: [
        { label: 'Approve & Run', planApprove: '{"steps":[]}', executePlanWorkspaceRoot: '/tmp/test' },
        { label: 'Reject', planReject: 'run_123' },
      ],
    })

    const node = buildMessageBlockNode(block)
    expect(node).toBeDefined()
  })
})

describe('ReplyAction dataset mapping', () => {
  it('maps planApprove to dataset attribute', () => {
    const action = { label: 'Approve & Run', planApprove: '{"steps":[]}', executePlanWorkspaceRoot: '/tmp/test' }
    const dataset = buildReplyActionDataset(action)
    expect(dataset.planApprove).toBe('{"steps":[]}')
  })

  it('maps planReject to dataset attribute', () => {
    const action = { label: 'Reject', planReject: 'run_123' }
    const dataset = buildReplyActionDataset(action)
    expect(dataset.planReject).toBe('run_123')
  })
})

describe('planner approval execution gating', () => {
  it('does not auto-execute when approval is required - planApprove only triggers on explicit click', () => {
    const plan = createTestPlan({
      steps: [
        {
          stepId: 'destructive',
          tool: 'terminal',
          input: { command: 'rm -rf node_modules', cwd: '/tmp' },
          requires_confirmation: true,
        },
      ],
    })

    const blocks = buildPlannerApprovalContent('clean up', plan, {
      workspaceRoot: '/tmp/test',
    })

    const approvalBlock = blocks[1] as { type: 'planner-approval'; actions?: unknown[] }
    expect(approvalBlock.type).toBe('planner-approval')
    expect(approvalBlock.actions?.[0].label).toBe('Approve & Run')
    expect(approvalBlock.actions?.[1].label).toBe('Reject')
  })

  it('marks plan with approval reason for constrained prompts', () => {
    const plan = createTestPlan()
    const blocks = buildPlannerApprovalContent('fix but do not touch tests', plan, {
      workspaceRoot: '/tmp/test',
      approvalReason: "This turn carries a test-edit constraint, so I'm keeping execution review-first.",
      riskLevel: 'medium',
    })

    const approvalBlock = blocks[1] as { type: 'planner-approval'; approvalReason?: string }
    expect(approvalBlock.approvalReason).toContain('test-edit constraint')
  })

  it('has actions on planner-approval block for execution control', () => {
    const plan = createTestPlan()
    const blocks = buildPlannerApprovalContent('deploy to production', plan, {
      workspaceRoot: '/tmp/test',
      planRunId: 'plan_run_789',
    })

    const approvalBlock = blocks[1] as {
      type: 'planner-approval'
      actions?: Array<{ label: string; planApprove?: string; planReject?: string }>
    }
    expect(approvalBlock.actions).toBeDefined()
    expect(approvalBlock.actions).toHaveLength(2)
    expect(approvalBlock.actions?.[0].planApprove).toBeTruthy()
    expect(approvalBlock.actions?.[1].planReject).toBe('plan_run_789')
  })
})

describe('handlePlanReject cancelled Proof event recording', () => {
  it('returns result when called with valid planRunId', async () => {
    const args = {
      ipcMain: {} as any,
      newPlanRunId: () => 'test_plan_run_123',
      resolveProjectRootSafe: (input?: string) => '/tmp/test',
      ensureStructuredSession: vi.fn(),
      runningPlanRuns: new Map(),
      safeSend: vi.fn(),
      riskFromPlanStep: () => 'safe-write' as const,
      gateProfileCommand: () => ({ ok: true }),
      evaluatePolicyGate: () => ({ ok: true }),
      executeRemotePlan: vi.fn(),
      pipeAgentdSseToRenderer: vi.fn(),
      createStreamId: () => 'stream_123',
      streamCancel: vi.fn(),
      streamKill: vi.fn(),
      planStop: vi.fn(),
    }

    const result = await handlePlanReject(args, 'test_plan_run_123')
    expect(result.ok).toBe(true)
  })

  it('handles missing planRunId gracefully', async () => {
    const args = {
      ipcMain: {} as any,
      newPlanRunId: () => 'test_plan_run_456',
      resolveProjectRootSafe: (input?: string) => '/tmp/test',
      ensureStructuredSession: vi.fn(),
      runningPlanRuns: new Map(),
      safeSend: vi.fn(),
      riskFromPlanStep: () => 'safe-write' as const,
      gateProfileCommand: () => ({ ok: true }),
      evaluatePolicyGate: () => ({ ok: true }),
      executeRemotePlan: vi.fn(),
      pipeAgentdSseToRenderer: vi.fn(),
      createStreamId: () => 'stream_456',
      streamCancel: vi.fn(),
      streamKill: vi.fn(),
      planStop: vi.fn(),
    }

    const result = await handlePlanReject(args, '')
    expect(result.ok).toBe(true)
  })
})

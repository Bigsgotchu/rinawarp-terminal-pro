import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

import { buildExecutionPlanContent, buildPlannerApprovalContent } from '../../src/renderer/replies/renderPlanReplies.js'
import { plannerApprovalBlock } from '../../src/renderer/replies/renderFragments.js'
import { buildMessageBlockNode } from '../../src/renderer/workbench/renderers/messageBlocks.js'
import { buildReplyActionDataset } from '../../src/renderer/replies/replyActionDatasets.js'
import { handleExecutePlanStream, handlePlanReject } from '../../src/main/ipc/agentExecutionFlow.js'
import { StructuredSessionStore } from '../../src/structured-session.js'
import { createApprovedPlanAdapter } from '../../src/main/runtime/approvedPlanAdapter.js'
import {
  createMemoryWorkspaceFactStore,
  resetMemoryWorkspaceFactStore,
} from '../../src/main/memory/workspaceFactStore.js'
import { acquireWorkspaceFactsFromVerifiedProof } from '../../src/main/memory/workspaceKnowledgeAcquisition.js'
import { inspectProjectWorkspace } from '../../src/main/memory/projectInspector.js'
import { hydrateWorkspaceKnowledge } from '../../src/main/memory/workspaceKnowledge.js'
import { buildWorkspaceContext } from '../../src/main/memory/workspaceContextBuilder.js'
import { createBuildPlanHelpers } from '../../src/main/planning/buildPlan.js'
import type { VerificationStatus } from '../../src/structured-session-types.js'

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

function createExecutionArgs(overrides: Record<string, unknown> = {}) {
  return {
    ipcMain: {} as any,
    newPlanRunId: () => 'test_plan_run_123',
    resolveProjectRootSafe: (input?: string) => input || '/tmp/test',
    ensureStructuredSession: vi.fn(),
    runningPlanRuns: new Map(),
    safeSend: vi.fn(),
    riskFromPlanStep: (step: FixPlanStep) => (step.risk === 'inspect' ? 'read' : step.risk || 'safe-write'),
    gateProfileCommand: vi.fn(() => ({ ok: true })),
    evaluatePolicyGate: vi.fn(() => ({ ok: true })),
    executeRemotePlan: vi.fn(async () => ({ ok: true, planRunId: 'agentd_plan_123' })),
    pipeAgentdSseToRenderer: vi.fn(async () => ''),
    createStreamId: () => 'stream_123',
    streamCancel: vi.fn(),
    streamKill: vi.fn(),
    planStop: vi.fn(),
    ...overrides,
  } as any
}

function createEventSender() {
  return {
    send: vi.fn(),
    isDestroyed: () => false,
  } as any
}

function readNdjson(filePath: string): any[] {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
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
    const action = {
      label: 'Approve & Run',
      planApprove: '{"steps":[]}',
      planId: 'plan_test_123',
      executePlanWorkspaceRoot: '/tmp/test',
    }
    const dataset = buildReplyActionDataset(action)
    expect(dataset.planApprove).toBe('{"steps":[]}')
    expect(dataset.planId).toBe('plan_test_123')
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

  it('acceptance: observes, plans, approves, executes, verifies Proof, and remembers verified knowledge on real paths', async () => {
    resetMemoryWorkspaceFactStore()
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-core-loop-project-'))
    const sessionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-core-loop-session-'))
    try {
      fs.mkdirSync(path.join(projectRoot, 'scripts'), { recursive: true })
      fs.writeFileSync(
        path.join(projectRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'rina-core-loop-real-path',
            private: true,
            scripts: {
              build: 'node scripts/verify.cjs',
            },
            dependencies: {
              '@clerk/clerk-react': '^5.0.0',
              'better-sqlite3': '^12.0.0',
              react: '^18.0.0',
            },
            devDependencies: {
              vite: '^5.0.0',
            },
          },
          null,
          2
        )
      )
      fs.writeFileSync(path.join(projectRoot, 'package-lock.json'), '{"lockfileVersion":3}\n')
      fs.writeFileSync(path.join(projectRoot, 'vercel.json'), '{"version":2}\n')
      fs.writeFileSync(path.join(projectRoot, 'scripts', 'verify.cjs'), "console.log('core loop verification passed')\n")

      const inspection = await inspectProjectWorkspace(projectRoot)
      expect(inspection.packageManager).toBe('npm')
      expect(inspection.frameworks).toEqual(expect.arrayContaining(['react', 'vite']))
      expect(inspection.authPackages).toContain('@clerk/clerk-react')
      expect(inspection.databasePackages).toContain('better-sqlite3')
      expect(inspection.canDeploy).toBe(true)

      const factStore = createMemoryWorkspaceFactStore()
      const workspaceContext = buildWorkspaceContext(await hydrateWorkspaceKnowledge(factStore), inspection)
      expect(workspaceContext.dependencies.some((fact) => fact.key === 'package.manager')).toBe(true)
      expect(workspaceContext.dependencies.some((fact) => fact.key === 'auth.provider')).toBe(true)
      expect(workspaceContext.dependencies.some((fact) => fact.key === 'database.primary')).toBe(true)

      const helpers = createBuildPlanHelpers({
        fs: {},
        path: {},
        playbooks: [],
        topCpuCmdSafeShort: 'ps aux',
      } as any)
      const plan = await helpers.makePlan('build the project', projectRoot)
      const executableStep = plan.steps.find((step: any) => step.input?.command === 'npm run build')
      expect(executableStep).toBeTruthy()

      const approval = {
        planId: plan.id,
        approvedAt: '2026-06-09T00:00:00.000Z',
        actor: 'user',
      }
      const proofId = `proof:${plan.id}:core-loop`
      const runtimeId = 'runtime:core-loop'
      const store = new StructuredSessionStore(sessionRoot, true, {
        onProofVerified: (verification) => {
          void acquireWorkspaceFactsFromVerifiedProof({
            verification,
            store: factStore,
            successfulCommands: 1,
            failedCommands: 0,
          })
        },
      })
      store.init()
      const sessionId = store.startSession({ source: 'core_loop_acceptance', projectRoot, preferredId: plan.id })
      const streamId = 'stream_core_loop_real_execution'

      store.beginCommand({
        sessionId,
        streamId,
        command: executableStep!.input.command,
        cwd: projectRoot,
        risk: executableStep!.risk,
        source: 'planner_approval',
        planId: approval.planId,
        approvalTimestamp: approval.approvedAt,
        approvalActor: approval.actor,
        runtimeId,
        proofId,
      })

      const executed = spawnSync('npm', ['run', 'build'], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      if (executed.stdout) store.appendChunk(streamId, 'stdout', executed.stdout)
      if (executed.stderr) store.appendChunk(streamId, 'stderr', executed.stderr)
      expect(executed.status).toBe(0)
      store.recordEvidence({
        sessionId,
        proofId,
        type: 'command_execution',
        status: 'present',
        payload: executableStep!.input.command,
      })
      store.recordEvidence({
        sessionId,
        proofId,
        type: 'exit_code',
        status: 'present',
        payload: '0',
      })
      store.recordEvidence({
        sessionId,
        proofId,
        type: 'runtime_event',
        status: 'present',
        payload: runtimeId,
      })
      store.endCommand({
        streamId,
        ok: true,
        code: executed.status,
        cancelled: false,
      })

      const verification = store.verifyProof(proofId)
      await Promise.resolve()
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(verification).toMatchObject({
        proof_id: proofId,
        verification_status: 'verified',
        evidence_count: 3,
      })

      const commandRows = readNdjson(path.join(sessionRoot, 'sessions', sessionId, 'commands.ndjson'))
      const startRow = commandRows.find((row) => row.stream_id === streamId && !row.ended_at)
      const endRow = commandRows.find((row) => row.stream_id === streamId && row.ended_at)
      expect(startRow).toMatchObject({
        input: 'npm run build',
        cwd: expect.any(String),
        plan_id: approval.planId,
        approval_timestamp: approval.approvedAt,
        approval_actor: approval.actor,
        runtime_id: runtimeId,
        proof_id: proofId,
      })
      expect(endRow).toMatchObject({
        input: 'npm run build',
        ok: true,
        exit_code: 0,
        proof_id: proofId,
      })

      const evidenceRows = readNdjson(path.join(sessionRoot, 'evidence.ndjson'))
      expect(evidenceRows.map((row) => row.type)).toEqual(['command_execution', 'exit_code', 'runtime_event'])
      expect(evidenceRows.every((row) => row.status === 'present' && row.proof_id === proofId)).toBe(true)

      const proofFacts = await factStore.listFacts({ source: 'proof' })
      expect(proofFacts.map((fact) => fact.key)).toEqual([
        `proof.${proofId}.verification_status`,
        `proof.${proofId}.evidence_count`,
        `proof.${proofId}.successful_commands`,
        `proof.${proofId}.failed_commands`,
      ])
      expect(proofFacts.every((fact) => fact.confidence === 'high')).toBe(true)
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
      fs.rmSync(sessionRoot, { recursive: true, force: true })
      resetMemoryWorkspaceFactStore()
    }
  })

  it('does not start execution for a write plan before approval', async () => {
    const args = createExecutionArgs({
      gateProfileCommand: vi.fn(() => ({ ok: false, message: 'Confirmation required.' })),
    })

    const result = await handleExecutePlanStream(args, createEventSender(), {
      plan: [{ stepId: 'write', tool: 'terminal', input: { command: 'touch file.txt' }, risk: 'safe-write' }],
      projectRoot: '/tmp/test',
      confirmed: false,
      confirmationText: '',
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('PLAN_HALTED')
    expect(args.executeRemotePlan).not.toHaveBeenCalled()
    expect(args.pipeAgentdSseToRenderer).not.toHaveBeenCalled()
  })

  it('approve forwards approval metadata to the real execution backend and stream pipe', async () => {
    const approval = {
      planId: 'plan_test_123',
      approvedAt: '2026-06-09T00:00:00.000Z',
      actor: 'user',
    }
    const args = createExecutionArgs()

    const result = await handleExecutePlanStream(args, createEventSender(), {
      plan: [{ stepId: 'write', tool: 'terminal', input: { command: 'touch file.txt' }, risk: 'safe-write' }],
      projectRoot: '/tmp/test',
      confirmed: true,
      confirmationText: 'User approved Planner Approval flow',
      approval,
    })

    expect(result.ok).toBe(true)
    expect(args.executeRemotePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmed: true,
        approval,
      })
    )
    expect(args.pipeAgentdSseToRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        agentdPlanRunId: 'agentd_plan_123',
        approval,
      })
    )
  })

  it('structured command proof records retain plan, approval, actor, runtime, and proof ids', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-approval-proof-'))
    try {
      const store = new StructuredSessionStore(root, true)
      store.init()
      const sessionId = store.startSession({ source: 'test', projectRoot: '/tmp/test', preferredId: 'plan_test_123' })
      store.beginCommand({
        sessionId,
        streamId: 'stream_123',
        command: 'touch file.txt',
        cwd: '/tmp/test',
        risk: 'safe-write',
        source: 'planner_approval',
        planId: 'plan_test_123',
        approvalTimestamp: '2026-06-09T00:00:00.000Z',
        approvalActor: 'user',
        runtimeId: 'agentd_plan_123',
        proofId: 'proof:plan_test_123',
      })
      store.endCommand({
        streamId: 'stream_123',
        ok: true,
        code: 0,
        cancelled: false,
      })

      const commandsFile = path.join(root, 'sessions', sessionId, 'commands.ndjson')
      const rows = fs
        .readFileSync(commandsFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
      expect(rows[0]).toMatchObject({
        plan_id: 'plan_test_123',
        approval_timestamp: '2026-06-09T00:00:00.000Z',
        approval_actor: 'user',
        runtime_id: 'agentd_plan_123',
        proof_id: 'proof:plan_test_123',
      })
      expect(rows[1]).toMatchObject({
        proof_id: 'proof:plan_test_123',
        ok: true,
        exit_code: 0,
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
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
      recordPlanApprovalRejection: vi.fn(),
    } as any

    const result = await handlePlanReject(args, 'test_plan_run_123')
    expect(result.ok).toBe(true)
    expect(result.proofId).toBe('proof:test_plan_run_123:rejected')
    expect(args.executeRemotePlan).not.toHaveBeenCalled()
    expect(args.recordPlanApprovalRejection).toHaveBeenCalledWith(
      expect.objectContaining({
        planRunId: 'test_plan_run_123',
        proofId: 'proof:test_plan_run_123:rejected',
        actor: 'user',
      })
    )
  })

  it('handles missing planRunId gracefully', async () => {
    const args = createExecutionArgs({ newPlanRunId: () => 'test_plan_run_456' })

    const result = await handlePlanReject(args, '')
    expect(result.ok).toBe(false)
    expect(args.executeRemotePlan).not.toHaveBeenCalled()
  })

  it('records rejected plans as cancelled proof evidence', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-rejected-proof-'))
    try {
      const store = new StructuredSessionStore(root, true)
      store.init()
      const args = createExecutionArgs({
        recordPlanApprovalRejection: ({ planRunId, proofId, rejectedAt, actor }: any) => {
          const sessionId = store.startSession({
            source: 'planner_approval_reject',
            preferredId: planRunId,
          })
          store.beginCommand({
            sessionId,
            streamId: planRunId,
            command: `Planner approval rejected: ${planRunId}`,
            risk: 'cancelled',
            source: 'planner_approval_reject',
            planId: planRunId,
            approvalTimestamp: rejectedAt,
            approvalActor: actor,
            runtimeId: 'not_started',
            proofId,
          })
          store.endCommand({
            streamId: planRunId,
            ok: false,
            code: null,
            cancelled: true,
            error: 'Plan rejected before execution.',
          })
        },
      })

      const result = await handlePlanReject(args, 'test_plan_run_reject')
      expect(result.ok).toBe(true)

      const commandsFile = path.join(root, 'sessions', 'test_plan_run_reject', 'commands.ndjson')
      const rows = fs
        .readFileSync(commandsFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))

expect(rows[0]).toMatchObject({
         plan_id: 'test_plan_run_reject',
         approval_actor: 'user',
         runtime_id: 'not_started',
         proof_id: 'proof:test_plan_run_reject:rejected',
       })
       expect(rows[1]).toMatchObject({
         proof_id: 'proof:test_plan_run_reject:rejected',
         cancelled: true,
         ok: false,
       })
     } finally {
       fs.rmSync(root, { recursive: true, force: true })
     }
   })
})

describe('executeApprovedPlan adapter', () => {
   it('rejects when approved_plan is empty or invalid', async () => {
     const mockDeps = {
       executeRemotePlan: vi.fn(),
       pipeAgentdSseToRenderer: vi.fn(),
       createStreamId: vi.fn(() => 'stream_test'),
       newPlanRunId: vi.fn(() => 'plan_run_test'),
       ensureStructuredSession: vi.fn(),
       safeSend: vi.fn(),
       resolveProjectRootSafe: vi.fn((input) => input || '/tmp/test'),
     }

     const adapter = createApprovedPlanAdapter(mockDeps)

     const result = await adapter.executeApprovedPlan(
       { plan_id: 'plan_123', approved_plan: [], approval_timestamp: '2026-06-09T00:00:00.000Z', approval_actor: 'user' },
       createEventSender(),
     )

     expect(result.ok).toBe(false)
     expect((result as { error: string }).error).toContain('Empty or invalid approved plan')
   })

   it('executes approved plan with metadata when valid input provided', async () => {
     const executeRemotePlan = vi.fn(async () => ({ ok: true, planRunId: 'agentd_plan_123' }))
     const pipeAgentdSseToRenderer = vi.fn(async () => undefined)
     const safeSend = vi.fn()
     const ensureStructuredSession = vi.fn()

     const adapter = createApprovedPlanAdapter({
       executeRemotePlan,
       pipeAgentdSseToRenderer,
       createStreamId: () => 'stream_test',
       newPlanRunId: () => 'plan_run_test',
       ensureStructuredSession,
       safeSend,
       resolveProjectRootSafe: (input) => input || '/tmp/test',
     })

     const eventSender = createEventSender()
     const input = {
       plan_id: 'plan_123',
       approved_plan: [{ stepId: 's1', tool: 'terminal', input: { command: 'ls' } }],
       approval_timestamp: '2026-06-09T00:00:00.000Z',
       approval_actor: 'user',
     }

     const result = await adapter.executeApprovedPlan(input, eventSender)

     expect(result.ok).toBe(true)
     expect((result as { runtime_id: string }).runtime_id).toBe('agentd_plan_123')
     expect(executeRemotePlan).toHaveBeenCalledWith(
       expect.objectContaining({
         confirmed: true,
         approval: { planId: 'plan_123', approvedAt: '2026-06-09T00:00:00.000Z', actor: 'user' },
       }),
     )
     expect(pipeAgentdSseToRenderer).toHaveBeenCalledWith(
       expect.objectContaining({
         agentdPlanRunId: 'agentd_plan_123',
         approval: { planId: 'plan_123', approvedAt: '2026-06-09T00:00:00.000Z', actor: 'user' },
       }),
     )
   })

   it('passes session_id to resolveProjectRootSafe', async () => {
     const resolveProjectRootSafe = vi.fn((input) => input || '/default')
     const adapter = createApprovedPlanAdapter({
       executeRemotePlan: vi.fn(async () => ({ ok: true, planRunId: 'test' })),
       pipeAgentdSseToRenderer: vi.fn(),
       createStreamId: () => 'stream_test',
       newPlanRunId: () => 'plan_run_test',
       ensureStructuredSession: vi.fn(),
       safeSend: vi.fn(),
       resolveProjectRootSafe,
     })

     await adapter.executeApprovedPlan(
       { plan_id: 'p1', approved_plan: [{ stepId: 's1' }], approval_timestamp: '2026-06-09T00:00:00Z', approval_actor: 'user', session_id: '/custom/workspace' },
       createEventSender(),
     )

     expect(resolveProjectRootSafe).toHaveBeenCalledWith('/custom/workspace')
   })

   it('uses thread_id as planRunId when provided', async () => {
     let receivedPlanRunId = ''
     const ensureStructuredSession = vi.fn((args) => { receivedPlanRunId = args.preferredId })
     const adapter = createApprovedPlanAdapter({
       executeRemotePlan: vi.fn(async () => ({ ok: true, planRunId: 'remote_plan' })),
       pipeAgentdSseToRenderer: vi.fn(),
       createStreamId: () => 'stream_test',
       newPlanRunId: vi.fn(() => 'generated_plan_run_id'),
       ensureStructuredSession,
       safeSend: vi.fn(),
       resolveProjectRootSafe: () => '/tmp/test',
     })

     await adapter.executeApprovedPlan(
       { plan_id: 'p1', approved_plan: [{ stepId: 's1' }], approval_timestamp: '2026-06-09T00:00:00Z', approval_actor: 'user', thread_id: 'thread_custom_123' },
       createEventSender(),
     )

expect(receivedPlanRunId).toBe('thread_custom_123')
    })

it('handleExecutePlanStream delegates to adapter when approval present', async () => {
       const executeRemotePlan = vi.fn(async () => ({ ok: true, planRunId: 'agentd_plan_delegated' }))
       const pipeAgentdSseToRenderer = vi.fn(async () => '')
       const safeSend = vi.fn()
       const args = createExecutionArgs({
         executeRemotePlan,
         pipeAgentdSseToRenderer,
         safeSend,
         ensureStructuredSession: vi.fn(),
       })

       const result = await handleExecutePlanStream(args, createEventSender(), {
         plan: [{ stepId: 's1', tool: 'terminal', input: { command: 'ls' } }],
         projectRoot: '/tmp/test',
         confirmed: true,
         confirmationText: 'approved',
         approval: {
           planId: 'plan_delegated_123',
           approvedAt: '2026-06-09T00:00:00.000Z',
           actor: 'user',
         },
       })

       expect(result.ok).toBe(true)
       expect(executeRemotePlan).toHaveBeenCalled()
       expect(pipeAgentdSseToRenderer).toHaveBeenCalled()
       expect(safeSend).toHaveBeenCalledWith(expect.anything(), 'rina:plan:run:start', expect.objectContaining({ planRunId: expect.any(String) }))
     })
   })

   describe('product guard: approved plan execution must use executeApprovedPlan', () => {
     it('fails when approval present but handleExecutePlanStream bypasses adapter (calls runRemotePlan directly)', async () => {
       const executeRemotePlan = vi.fn(async () => ({ ok: true, planRunId: 'bypass_plan' }))
       const pipeAgentdSseToRenderer = vi.fn(async () => '')
       const safeSend = vi.fn()
       const ensureStructuredSession = vi.fn()

       const args = createExecutionArgs({
         executeRemotePlan,
         pipeAgentdSseToRenderer,
         safeSend,
         ensureStructuredSession,
       })

       await handleExecutePlanStream(args, createEventSender(), {
         plan: [{ stepId: 's1', tool: 'terminal', input: { command: 'ls' } }],
         projectRoot: '/tmp/test',
         confirmed: true,
         confirmationText: 'approved',
         approval: { planId: 'p1', approvedAt: '2026-06-09T00:00:00.000Z' },
       })

       expect(executeRemotePlan).toHaveBeenCalledWith(
         expect.objectContaining({
           confirmed: true,
           approval: expect.objectContaining({ planId: 'p1', approvedAt: expect.any(String) }),
         })
       )

       expect(ensureStructuredSession).toHaveBeenCalledWith(
         expect.objectContaining({ source: 'execute_approved_plan', projectRoot: '/tmp/test' })
       )
     })

     it('ensures Proof metadata contains all required fields for approved plans', async () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-guard-proof-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()
         const sessionId = store.startSession({ source: 'test', projectRoot: '/tmp/test', preferredId: 'guard_plan_123' })
         store.beginCommand({
           sessionId,
           streamId: 'stream_123',
           command: 'test command',
           cwd: '/tmp/test',
           risk: 'safe-write',
           source: 'planner_approval',
           planId: 'guard_plan_123',
           approvalTimestamp: '2026-06-09T00:00:00.000Z',
           approvalActor: 'user',
           runtimeId: 'runtime_123',
           proofId: 'proof:guard_plan_123',
         })
         store.endCommand({ streamId: 'stream_123', ok: true, code: 0, cancelled: false })

         const commandsFile = path.join(root, 'sessions', sessionId, 'commands.ndjson')
         const rows = fs.readFileSync(commandsFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse)

         const requiredFields = ['plan_id', 'approval_timestamp', 'approval_actor', 'runtime_id', 'proof_id']
         requiredFields.forEach((field) => {
           expect(rows[0]).toHaveProperty(field)
           expect(rows[0][field]).toBeTruthy()
         })
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('ensures non-approved plans do not carry approval metadata to backend', async () => {
       const executeRemotePlan = vi.fn(async () => ({ ok: true, planRunId: 'no_approval_plan' }))
       const pipeAgentdSseToRenderer = vi.fn(async () => '')
       const safeSend = vi.fn()
       const args = createExecutionArgs({
         executeRemotePlan,
         pipeAgentdSseToRenderer,
         safeSend,
         ensureStructuredSession: vi.fn(),
       })

       await handleExecutePlanStream(args, createEventSender(), {
         plan: [{ stepId: 's1', tool: 'terminal', input: { command: 'ls' } }],
         projectRoot: '/tmp/test',
         confirmed: true,
         confirmationText: 'direct execution without approval',
       })

expect(executeRemotePlan).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmed: true,
            approval: undefined,
          })
        )
      })
    })

   describe('Proof Verification pipeline', () => {
     it('marks command as verified when execution completes with exit code and output', async () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-proof-verified-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()
         const sessionId = store.startSession({ source: 'test', projectRoot: '/tmp/test', preferredId: 'proof_verified_123' })
         store.beginCommand({
           sessionId,
           streamId: 'stream_verified',
           command: 'echo done',
           cwd: '/tmp/test',
           risk: 'read',
           source: 'planner_approval',
           proofId: 'proof:proof_verified_123',
         })
         store.appendChunk('stream_verified', 'stdout', 'done\n')
         store.endCommand({
           streamId: 'stream_verified',
           ok: true,
           code: 0,
           cancelled: false,
         })

         const commandsFile = path.join(root, 'sessions', sessionId, 'commands.ndjson')
         const rows = fs.readFileSync(commandsFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse)

         const startRow = rows[0]
         const endRow = rows[1]
         expect(endRow.verification_status).toBe('verified')
         expect(endRow.evidence_count).toBe(1)
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('marks command as partially_verified when execution has exit code but no output', async () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-proof-partial-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()
         const sessionId = store.startSession({ source: 'test', projectRoot: '/tmp/test', preferredId: 'proof_partial_123' })
         store.beginCommand({
           sessionId,
           streamId: 'stream_partial',
           command: 'touch empty.txt',
           cwd: '/tmp/test',
           risk: 'safe-write',
           source: 'planner_approval',
           proofId: 'proof:proof_partial_123',
         })
         store.endCommand({
           streamId: 'stream_partial',
           ok: true,
           code: 0,
           cancelled: false,
         })

         const commandsFile = path.join(root, 'sessions', sessionId, 'commands.ndjson')
         const rows = fs.readFileSync(commandsFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse)

         expect(rows[1].verification_status).toBe('partially_verified')
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('marks command as unverified when execution has neither exit code nor output', async () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-proof-unverified-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()
         const sessionId = store.startSession({ source: 'test', projectRoot: '/tmp/test', preferredId: 'proof_unverified_123' })
         store.beginCommand({
           sessionId,
           streamId: 'stream_unverified',
           command: 'pending operation',
           cwd: '/tmp/test',
           risk: 'read',
           source: 'planner_approval',
           proofId: 'proof:proof_unverified_123',
         })
         store.appendChunk('stream_unverified', 'meta', 'starting...\n')
         store.endCommand({
           streamId: 'stream_unverified',
           ok: false,
           code: null,
           cancelled: false,
           error: 'Command timed out',
         })

         const commandsFile = path.join(root, 'sessions', sessionId, 'commands.ndjson')
         const rows = fs.readFileSync(commandsFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse)

         expect(rows[1].verification_status).toBe('partially_verified')
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('verifyProof returns verified when all evidence present', () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-verify-proof-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()

         store.recordEvidence({ sessionId: 's1', type: 'command_execution', status: 'present', payload: 'exec', proofId: 'proof:test' })
         store.recordEvidence({ sessionId: 's1', type: 'exit_code', status: 'present', payload: '0', proofId: 'proof:test' })
         store.recordEvidence({ sessionId: 's1', type: 'runtime_event', status: 'present', payload: 'event', proofId: 'proof:test' })

         const result = store.verifyProof('proof:test')
         expect(result.verification_status).toBe('verified')
         expect(result.evidence_count).toBe(3)
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('verifyProof returns unverified when no evidence', () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-verify-unverified-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()

         const result = store.verifyProof('proof:noevidence')
         expect(result.verification_status).toBe('unverified')
         expect(result.evidence_count).toBe(0)
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('verifyProof returns partially_verified when some evidence present', () => {
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-verify-partial-'))
       try {
         const store = new StructuredSessionStore(root, true)
         store.init()

         store.recordEvidence({ sessionId: 's1', type: 'command_execution', status: 'present', payload: 'exec', proofId: 'proof:partial' })
         store.recordEvidence({ sessionId: 's1', type: 'exit_code', status: 'missing', payload: 'n/a', proofId: 'proof:partial' })

         const result = store.verifyProof('proof:partial')
         expect(result.verification_status).toBe('partially_verified')
         expect(result.evidence_count).toBe(2)
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
       }
     })

     it('persists proof-derived WorkspaceFacts when Proof verification completes as verified', async () => {
       resetMemoryWorkspaceFactStore()
       const factStore = createMemoryWorkspaceFactStore()
       const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-verify-acquire-'))
       try {
         const store = new StructuredSessionStore(root, true, {
           onProofVerified: (verification) => {
             void acquireWorkspaceFactsFromVerifiedProof({ verification, store: factStore })
           },
         })
         store.init()

         store.recordEvidence({ sessionId: 's1', type: 'command_execution', status: 'present', payload: 'exec', proofId: 'proof:learn' })
         store.recordEvidence({ sessionId: 's1', type: 'exit_code', status: 'present', payload: '0', proofId: 'proof:learn' })

         const result = store.verifyProof('proof:learn')
         await Promise.resolve()
         await Promise.resolve()

         const facts = await factStore.listFacts({ source: 'proof' })
         expect(result.verification_status).toBe('verified')
         expect(facts.map((fact) => fact.key)).toEqual([
           'proof.proof:learn.verification_status',
           'proof.proof:learn.evidence_count',
         ])
         expect(facts.find((fact) => fact.key.endsWith('verification_status'))?.value).toBe('verified')
         expect(facts.find((fact) => fact.key.endsWith('evidence_count'))?.value).toBe('2')
       } finally {
         fs.rmSync(root, { recursive: true, force: true })
         resetMemoryWorkspaceFactStore()
       }
     })

     it('does not persist proof-derived WorkspaceFacts when Proof verification is partial', async () => {
        resetMemoryWorkspaceFactStore()
        const factStore = createMemoryWorkspaceFactStore()
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-verify-no-acquire-'))
        try {
          const store = new StructuredSessionStore(root, true, {
            onProofVerified: (verification) => {
              void acquireWorkspaceFactsFromVerifiedProof({ verification, store: factStore })
            },
          })
          store.init()

          store.recordEvidence({ sessionId: 's1', type: 'command_execution', status: 'present', payload: 'exec', proofId: 'proof:partial-learn' })
          store.recordEvidence({ sessionId: 's1', type: 'exit_code', status: 'missing', payload: 'n/a', proofId: 'proof:partial-learn' })

          const result = store.verifyProof('proof:partial-learn')
          await Promise.resolve()
          await Promise.resolve()

          expect(result.verification_status).toBe('partially_verified')
          expect(await factStore.listFacts({ source: 'proof' })).toEqual([])
        } finally {
          fs.rmSync(root, { recursive: true, force: true })
          resetMemoryWorkspaceFactStore()
        }
      })
    })

describe('buildExecutionPlanContent trust blocker fix', () => {
  it('shows approval block with commands when reviewOnly is true', () => {
    const plan: FixPlanResponse = {
      id: 'plan_123',
      reasoning: 'Build the project safely',
      steps: [
        { stepId: 's1', tool: 'terminal', input: { command: 'npm install', cwd: '/tmp/test' }, risk: 'safe-write' },
        { stepId: 's2', tool: 'terminal', input: { command: 'npm run build', cwd: '/tmp/test' }, risk: 'inspect' },
      ],
    }

    const blocks = buildExecutionPlanContent('build the project', plan, [], {
      introText: 'Plan ready for approval',
      reviewOnly: true,
      workspaceRoot: '/tmp/test',
    })

    // Should return planner-approval block type for review-only
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[1].type).toBe('planner-approval')

    const approvalBlock = blocks[1] as {
      type: 'planner-approval'
      steps?: Array<{ stepId: string; command: string; risk?: string }>
      actions?: Array<{ label: string }>
    }

    // Commands must be visible
    expect(approvalBlock.steps).toHaveLength(2)
    expect(approvalBlock.steps?.[0].command).toBe('npm install')
    expect(approvalBlock.steps?.[1].command).toBe('npm run build')

    // Approval actions must be present
    expect(approvalBlock.actions).toBeDefined()
    expect(approvalBlock.actions?.[0].label).toBe('Approve & Run')
    expect(approvalBlock.actions?.[1].label).toBe('Reject')
  })

  it('does not invent commands - renderer uses planner data only', () => {
    const plan: FixPlanResponse = {
      id: 'plan_456',
      reasoning: 'Test plan',
      steps: [
        { stepId: 's1', tool: 'terminal', input: { command: 'echo hello', cwd: '/tmp' }, risk: 'inspect' },
      ],
    }

    const blocks = buildExecutionPlanContent('test', plan, [], {
      reviewOnly: true,
      workspaceRoot: '/tmp/test',
    })

    const approvalBlock = blocks[1] as { steps?: Array<{ command: string }> }
    expect(approvalBlock.steps?.[0].command).toBe('echo hello')
    // Should NOT have invented any commands
    expect(approvalBlock.steps?.[0].command).not.toContain('injected')
  })

  it('handles missing commands gracefully without crashing', () => {
    const plan: FixPlanResponse = {
      id: 'plan_789',
      reasoning: 'Plan with missing commands',
      steps: [
        { stepId: 's1', tool: 'terminal', input: {}, risk: 'inspect' },
      ],
    }

    // Should not throw
    const blocks = buildExecutionPlanContent('test', plan, [], {
      reviewOnly: true,
      workspaceRoot: '/tmp/test',
    })

    expect(blocks.length).toBeGreaterThan(0)
    const approvalBlock = blocks[1] as { steps?: Array<{ command: string }> }
    expect(approvalBlock.steps?.[0].command).toBe('')
  })

  it('shows risk level in approval block', () => {
    const plan: FixPlanResponse = {
      id: 'plan_risk',
      reasoning: 'High risk plan',
      steps: [
        { stepId: 's1', tool: 'terminal', input: { command: 'rm -rf /', cwd: '/tmp' }, risk: 'dangerous' },
      ],
    }

    const blocks = buildExecutionPlanContent('dangerous command', plan, [], {
      reviewOnly: true,
      workspaceRoot: '/tmp/test',
    })

    const approvalBlock = blocks[1] as { riskLevel?: string }
    expect(approvalBlock.riskLevel).toBe('high')
  })

  it('shows approval for command steps regardless of risk level', () => {
    const plan: FixPlanResponse = {
      id: 'plan_exec',
      reasoning: 'Direct execution',
      steps: [
        { stepId: 's1', tool: 'terminal', input: { command: 'npm run build', cwd: '/tmp' }, risk: 'inspect' },
      ],
    }

    const blocks = buildExecutionPlanContent('build', plan, [], {
      reviewOnly: false,
      workspaceRoot: '/tmp/test',
    })

    // Should be planner-approval type because step has a command
    expect(blocks[1].type).toBe('planner-approval')
  })

  it('shows approval block for reviewOnly even without commands', () => {
    const plan: FixPlanResponse = {
      id: 'plan_review_only',
      reasoning: 'Review-only plan without commands',
      steps: [
        { stepId: 's1', tool: 'terminal', input: {}, risk: 'inspect' },
      ],
    }

    const blocks = buildExecutionPlanContent('review only', plan, [], {
      reviewOnly: true,
      workspaceRoot: '/tmp/test',
    })

    // Should return planner-approval block type even without commands
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[1].type).toBe('planner-approval')

    const approvalBlock = blocks[1] as {
      type: 'planner-approval'
      steps?: Array<{ stepId: string; command: string }>
      actions?: Array<{ label: string }>
    }

    // Steps should be present with empty command
    expect(approvalBlock.steps).toHaveLength(1)
    expect(approvalBlock.steps?.[0].command).toBe('')

    // Approval actions must be present
    expect(approvalBlock.actions).toBeDefined()
    expect(approvalBlock.actions?.[0].label).toBe('Approve & Run')
    expect(approvalBlock.actions?.[1].label).toBe('Reject')
  })

  it('shows reply-card (not approval) when no commands and reviewOnly is false', () => {
    const plan: FixPlanResponse = {
      id: 'plan_no_cmd',
      reasoning: 'Plan without commands',
      steps: [
        { stepId: 's1', tool: 'terminal', input: {}, risk: 'inspect' },
      ],
    }

    const blocks = buildExecutionPlanContent('no commands', plan, [], {
      reviewOnly: false,
      workspaceRoot: '/tmp/test',
    })

    // Should be reply-card type, not planner-approval
    expect(blocks[1].type).toBe('reply-card')
  })
})

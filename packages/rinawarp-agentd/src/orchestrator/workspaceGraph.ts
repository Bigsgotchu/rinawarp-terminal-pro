import fs from 'node:fs'
import path from 'node:path'
import { addTask, paths } from '../daemon/state.js'

export type GraphNodeType = 'issue' | 'branch' | 'pull_request' | 'task' | 'workflow' | 'ci_run' | 'review_comment'
export type GraphEdgeType = 'resolves' | 'based_on' | 'generated_by' | 'blocked_by' | 'updates'

export type GraphNode = {
  id: string
  type: GraphNodeType
  label: string
  data?: Record<string, unknown>
  createdAt: string
}

export type GraphEdge = {
  id: string
  from: string
  to: string
  type: GraphEdgeType
  createdAt: string
}

type WorkspaceGraph = {
  version: 1
  nodes: GraphNode[]
  edges: GraphEdge[]
  updatedAt: string
}

type WorkflowState = 'planned' | 'active' | 'blocked' | 'needs_revision' | 'verified' | 'completed' | 'failed'

function graphFilePath(): string {
  return path.join(paths().baseDir, 'workspace-graph.json')
}

function defaultGraph(): WorkspaceGraph {
  return { version: 1, nodes: [], edges: [], updatedAt: new Date().toISOString() }
}

export function readWorkspaceGraph(): WorkspaceGraph {
  const fp = graphFilePath()
  if (!fs.existsSync(fp)) return defaultGraph()
  const raw = fs.readFileSync(fp, 'utf8')
  return JSON.parse(raw) as WorkspaceGraph
}

function writeWorkspaceGraph(graph: WorkspaceGraph): void {
  fs.mkdirSync(path.dirname(graphFilePath()), { recursive: true })
  fs.writeFileSync(graphFilePath(), `${JSON.stringify(graph, null, 2)}\n`, 'utf8')
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function putNode(graph: WorkspaceGraph, node: GraphNode): void {
  const idx = graph.nodes.findIndex((n) => n.id === node.id)
  if (idx >= 0) {
    const prev = graph.nodes[idx]
    graph.nodes[idx] = {
      ...prev,
      ...node,
      // Preserve original creation timestamp for stable history.
      createdAt: prev.createdAt,
      data: {
        ...(prev.data || {}),
        ...(node.data || {}),
      },
    }
    return
  }
  graph.nodes.push(node)
}

function pushEdge(graph: WorkspaceGraph, edge: Omit<GraphEdge, 'id' | 'createdAt'>): void {
  const exists = graph.edges.some((e) => e.from === edge.from && e.to === edge.to && e.type === edge.type)
  if (exists) return
  graph.edges.push({
    id: newId('edge'),
    createdAt: new Date().toISOString(),
    ...edge,
  })
}

const WORKFLOW_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  planned: ['active', 'blocked', 'needs_revision', 'verified', 'completed', 'failed'],
  active: ['active', 'blocked', 'needs_revision', 'verified', 'completed', 'failed'],
  blocked: ['needs_revision', 'active', 'failed'],
  needs_revision: ['active', 'failed', 'completed', 'verified'],
  verified: ['completed', 'needs_revision', 'failed', 'verified'],
  completed: ['completed'],
  failed: ['failed', 'needs_revision'],
}

function asWorkflowState(value: unknown): WorkflowState | null {
  if (typeof value !== 'string') return null
  if (
    value === 'planned' ||
    value === 'active' ||
    value === 'blocked' ||
    value === 'needs_revision' ||
    value === 'verified' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value
  }
  return null
}

function transitionWorkflowState(
  graph: WorkspaceGraph,
  workflowNodeId: string,
  nextState: WorkflowState,
  now: string,
  details?: Record<string, unknown>
): void {
  const existing = graph.nodes.find((n) => n.id === workflowNodeId)
  const currentState = asWorkflowState(existing?.data?.state) || 'planned'
  const allowed = WORKFLOW_TRANSITIONS[currentState] || []
  const accepted = currentState === nextState || allowed.includes(nextState)
  const history = Array.isArray(existing?.data?.stateHistory) ? existing?.data?.stateHistory : []
  const historyNext = [...history, { at: now, from: currentState, to: nextState, accepted }].slice(-30)

  if (!accepted) {
    putNode(graph, {
      id: workflowNodeId,
      type: 'workflow',
      label: `Issue->PR ${String(existing?.data?.workflowId || workflowNodeId.replace(/^workflow_/, ''))}`,
      data: {
        ...(existing?.data || {}),
        lastUpdatedAt: now,
        state: currentState,
        stateHistory: historyNext,
        lastTransitionRejected: { at: now, from: currentState, to: nextState, details: details || null },
      },
      createdAt: now,
    })
    return
  }

  putNode(graph, {
    id: workflowNodeId,
    type: 'workflow',
    label: `Issue->PR ${String(existing?.data?.workflowId || workflowNodeId.replace(/^workflow_/, ''))}`,
    data: {
      ...(existing?.data || {}),
      ...(details || {}),
      state: nextState,
      stateHistory: historyNext,
      lastUpdatedAt: now,
      lastTransitionRejected: null,
    },
    createdAt: now,
  })
}

function ensureWorkflowNode(graph: WorkspaceGraph, workflowId: string, now: string): string {
  const workflowNodeId = `workflow_${workflowId}`
  const existing = graph.nodes.find((n) => n.id === workflowNodeId)
  const currentState = asWorkflowState(existing?.data?.state) || 'planned'
  putNode(graph, {
    id: workflowNodeId,
    type: 'workflow',
    label: existing?.label || `Issue->PR ${workflowId}`,
    data: {
      ...(existing?.data || {}),
      workflowId,
      state: currentState,
      reconciled: true,
      lastUpdatedAt: now,
    },
    createdAt: now,
  })
  return workflowNodeId
}

export function createIssueToPrWorkflow(input: {
  issueId: string
  repoPath: string
  branchName?: string
  command?: string
  repoSlug?: string
  push?: boolean
  prDryRun?: boolean
  baseBranch?: string
  prTitle?: string
  prBody?: string
  commitMessage?: string
}): {
  ok: true
  workflowId: string
  taskId: string
  graph: { nodes: number; edges: number }
} {
  const now = new Date().toISOString()
  const workflowId = newId('wf')
  const issueNodeId = `issue_${input.issueId}`
  const branchName = input.branchName?.trim() || `rina/fix-${String(input.issueId).replace(/[^\w-]+/g, '-')}`
  const branchNodeId = `branch_${branchName}`
  const prNodeId = `pr_${workflowId}`
  const workflowNodeId = `workflow_${workflowId}`
  const command = input.command?.trim() || 'npm test'

  const queued = addTask({
    type: 'run_command',
    payload: {
      command,
      cwd: input.repoPath,
      workflowId,
      issueId: input.issueId,
      branchName,
      mode: 'issue_to_pr',
      repoSlug: input.repoSlug,
      push: input.push === true,
      prDryRun: input.prDryRun !== false,
      baseBranch: input.baseBranch || 'main',
      prTitle: input.prTitle || `Fix issue ${input.issueId}`,
      prBody: input.prBody || `Automated fix for issue ${input.issueId}.`,
      commitMessage: input.commitMessage || `fix: issue ${input.issueId}`,
    },
    maxAttempts: 2,
  })

  const taskNodeId = `task_${queued.id}`
  const graph = readWorkspaceGraph()
  putNode(graph, {
    id: workflowNodeId,
    type: 'workflow',
    label: `Issue->PR ${input.issueId}`,
    data: { workflowId },
    createdAt: now,
  })
  putNode(graph, {
    id: issueNodeId,
    type: 'issue',
    label: `Issue ${input.issueId}`,
    data: { issueId: input.issueId },
    createdAt: now,
  })
  putNode(graph, { id: branchNodeId, type: 'branch', label: branchName, data: { branchName }, createdAt: now })
  putNode(graph, { id: taskNodeId, type: 'task', label: command, data: { taskId: queued.id }, createdAt: now })
  putNode(graph, {
    id: prNodeId,
    type: 'pull_request',
    label: `PR for ${input.issueId}`,
    data: { status: 'planned' },
    createdAt: now,
  })
  pushEdge(graph, { from: issueNodeId, to: workflowNodeId, type: 'based_on' })
  pushEdge(graph, { from: workflowNodeId, to: taskNodeId, type: 'generated_by' })
  pushEdge(graph, { from: taskNodeId, to: branchNodeId, type: 'generated_by' })
  pushEdge(graph, { from: branchNodeId, to: prNodeId, type: 'generated_by' })
  pushEdge(graph, { from: prNodeId, to: issueNodeId, type: 'resolves' })
  transitionWorkflowState(graph, workflowNodeId, 'active', now, {
    issueId: input.issueId,
    branchName,
    latestTaskId: queued.id,
    repoPath: input.repoPath,
  })
  graph.updatedAt = now
  writeWorkspaceGraph(graph)

  return {
    ok: true,
    workflowId,
    taskId: queued.id,
    graph: { nodes: graph.nodes.length, edges: graph.edges.length },
  }
}

export function recordCiStatus(input: {
  workflowId: string
  provider: string
  status: 'queued' | 'running' | 'passed' | 'failed'
  url?: string
}): { ok: true; ciNodeId: string; graph: { nodes: number; edges: number } } {
  const now = new Date().toISOString()
  const graph = readWorkspaceGraph()
  const workflowNodeId = ensureWorkflowNode(graph, input.workflowId, now)
  const ciNodeId = `ci_${input.workflowId}_${Date.now().toString(36)}`
  putNode(graph, {
    id: ciNodeId,
    type: 'ci_run',
    label: `${input.provider}:${input.status}`,
    data: {
      workflowId: input.workflowId,
      provider: input.provider,
      status: input.status,
      url: input.url || null,
    },
    createdAt: now,
  })
  pushEdge(graph, { from: workflowNodeId, to: ciNodeId, type: 'updates' })
  if (input.status === 'failed') {
    pushEdge(graph, { from: ciNodeId, to: workflowNodeId, type: 'blocked_by' })
  }
  const workflowState = input.status === 'failed' ? 'blocked' : input.status === 'passed' ? 'verified' : 'active'
  transitionWorkflowState(graph, workflowNodeId, workflowState, now, {
    workflowId: input.workflowId,
    lastCiStatus: input.status,
    lastCiProvider: input.provider,
    lastCiUrl: input.url || null,
  })
  graph.updatedAt = now
  writeWorkspaceGraph(graph)
  return { ok: true, ciNodeId, graph: { nodes: graph.nodes.length, edges: graph.edges.length } }
}

export function queueRevisionFromReview(input: {
  workflowId: string
  repoPath: string
  issueId: string
  branchName: string
  comment: string
  command?: string
  repoSlug?: string
  baseBranch?: string
  prDryRun?: boolean
}): { ok: true; taskId: string; reviewNodeId: string; graph: { nodes: number; edges: number } } {
  const now = new Date().toISOString()
  const graph = readWorkspaceGraph()
  const workflowNodeId = ensureWorkflowNode(graph, input.workflowId, now)
  const issueNodeId = `issue_${input.issueId}`
  const branchNodeId = `branch_${input.branchName}`
  putNode(graph, {
    id: issueNodeId,
    type: 'issue',
    label: `Issue ${input.issueId}`,
    data: { issueId: input.issueId },
    createdAt: now,
  })
  putNode(graph, {
    id: branchNodeId,
    type: 'branch',
    label: input.branchName,
    data: { branchName: input.branchName },
    createdAt: now,
  })
  pushEdge(graph, { from: issueNodeId, to: workflowNodeId, type: 'based_on' })
  pushEdge(graph, { from: workflowNodeId, to: branchNodeId, type: 'updates' })

  const reviewNodeId = `review_${input.workflowId}_${Date.now().toString(36)}`
  putNode(graph, {
    id: reviewNodeId,
    type: 'review_comment',
    label: `Review feedback`,
    data: {
      workflowId: input.workflowId,
      comment: input.comment,
    },
    createdAt: now,
  })
  pushEdge(graph, { from: workflowNodeId, to: reviewNodeId, type: 'updates' })
  pushEdge(graph, { from: reviewNodeId, to: workflowNodeId, type: 'blocked_by' })

  const queued = addTask({
    type: 'run_command',
    payload: {
      mode: 'issue_to_pr',
      workflowId: input.workflowId,
      issueId: input.issueId,
      branchName: input.branchName,
      repoSlug: input.repoSlug,
      baseBranch: input.baseBranch || 'main',
      prDryRun: input.prDryRun !== false,
      command: input.command || 'npm test',
      cwd: input.repoPath,
      reviewComment: input.comment,
      commitMessage: `fix: review updates for issue ${input.issueId}`,
      prTitle: `Update for issue ${input.issueId}`,
      prBody: `Applied review feedback:\n\n${input.comment}`,
    },
    maxAttempts: 2,
  })
  const taskNodeId = `task_${queued.id}`
  putNode(graph, {
    id: taskNodeId,
    type: 'task',
    label: 'review_revision',
    data: { taskId: queued.id, workflowId: input.workflowId },
    createdAt: now,
  })
  pushEdge(graph, { from: reviewNodeId, to: taskNodeId, type: 'generated_by' })
  pushEdge(graph, { from: taskNodeId, to: workflowNodeId, type: 'updates' })
  transitionWorkflowState(graph, workflowNodeId, 'needs_revision', now, {
    workflowId: input.workflowId,
    lastReviewComment: input.comment,
    latestTaskId: queued.id,
  })

  graph.updatedAt = now
  writeWorkspaceGraph(graph)
  return { ok: true, taskId: queued.id, reviewNodeId, graph: { nodes: graph.nodes.length, edges: graph.edges.length } }
}

export function recordWorkflowTaskStatus(input: {
  workflowId: string
  taskId: string
  status: 'running' | 'completed' | 'failed'
  branchName?: string
  issueId?: string
  error?: string | null
  metadata?: Record<string, unknown>
}): { ok: true; graph: { nodes: number; edges: number } } {
  const now = new Date().toISOString()
  const graph = readWorkspaceGraph()
  const workflowNodeId = ensureWorkflowNode(graph, input.workflowId, now)
  const taskNodeId = `task_${input.taskId}`
  const taskState = input.status
  putNode(graph, {
    id: taskNodeId,
    type: 'task',
    label: input.metadata?.command ? String(input.metadata.command) : `task:${input.taskId}`,
    data: {
      ...(input.metadata || {}),
      taskId: input.taskId,
      workflowId: input.workflowId,
      status: taskState,
      error: input.error || null,
      updatedAt: now,
    },
    createdAt: now,
  })
  pushEdge(graph, { from: workflowNodeId, to: taskNodeId, type: 'updates' })
  if (input.branchName) {
    const branchNodeId = `branch_${input.branchName}`
    putNode(graph, {
      id: branchNodeId,
      type: 'branch',
      label: input.branchName,
      data: { branchName: input.branchName },
      createdAt: now,
    })
    pushEdge(graph, { from: taskNodeId, to: branchNodeId, type: 'updates' })
  }
  const nextState: WorkflowState =
    input.status === 'running' ? 'active' : input.status === 'failed' ? 'failed' : 'completed'
  transitionWorkflowState(graph, workflowNodeId, nextState, now, {
    workflowId: input.workflowId,
    latestTaskId: input.taskId,
    lastTaskStatus: input.status,
    issueId: input.issueId || null,
    branchName: input.branchName || null,
    taskError: input.error || null,
  })
  graph.updatedAt = now
  writeWorkspaceGraph(graph)
  return { ok: true, graph: { nodes: graph.nodes.length, edges: graph.edges.length } }
}

export function recordPullRequestStatus(input: {
  workflowId: string
  issueId?: string
  branchName?: string
  repoSlug?: string
  status: 'planned' | 'opened' | 'merged' | 'closed' | 'failed'
  mode?: 'dry_run' | 'live'
  number?: number | null
  url?: string | null
  error?: string | null
}): { ok: true; prNodeId: string; graph: { nodes: number; edges: number } } {
  const now = new Date().toISOString()
  const graph = readWorkspaceGraph()
  const workflowNodeId = ensureWorkflowNode(graph, input.workflowId, now)
  const prNodeId = `pr_${input.workflowId}`
  putNode(graph, {
    id: prNodeId,
    type: 'pull_request',
    label: input.issueId ? `PR for ${input.issueId}` : `PR ${input.workflowId}`,
    data: {
      workflowId: input.workflowId,
      issueId: input.issueId || null,
      branchName: input.branchName || null,
      repoSlug: input.repoSlug || null,
      status: input.status,
      mode: input.mode || null,
      number: input.number ?? null,
      url: input.url || null,
      error: input.error || null,
      updatedAt: now,
    },
    createdAt: now,
  })
  pushEdge(graph, { from: workflowNodeId, to: prNodeId, type: 'updates' })
  if (input.branchName) {
    const branchNodeId = `branch_${input.branchName}`
    putNode(graph, {
      id: branchNodeId,
      type: 'branch',
      label: input.branchName,
      data: { branchName: input.branchName },
      createdAt: now,
    })
    pushEdge(graph, { from: branchNodeId, to: prNodeId, type: 'generated_by' })
  }
  const nextState: WorkflowState =
    input.status === 'failed'
      ? 'failed'
      : input.status === 'merged'
        ? 'completed'
        : input.status === 'closed'
          ? 'failed'
          : input.status === 'opened'
            ? 'verified'
            : 'active'
  transitionWorkflowState(graph, workflowNodeId, nextState, now, {
    workflowId: input.workflowId,
    prStatus: input.status,
    prUrl: input.url || null,
    prNumber: input.number ?? null,
    prError: input.error || null,
  })
  graph.updatedAt = now
  writeWorkspaceGraph(graph)
  return { ok: true, prNodeId, graph: { nodes: graph.nodes.length, edges: graph.edges.length } }
}

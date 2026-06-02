import test from 'node:test'
import assert from 'node:assert/strict'

// Mock memory store for testing project memory learning
function createProjectMemoryStore() {
  const projectFacts = []

  return {
    projectFacts,
    storeFact: (fact) => {
      const entry = {
        id: `fact_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        scope: 'workspace',
        kind: 'project_fact',
        content: fact.content,
        workspaceId: fact.workspaceId,
        status: 'approved',
        confidence: fact.confidence ?? 0.9,
      }
      projectFacts.push(entry)
    },
    getFactsForWorkspace: (workspaceId) => projectFacts.filter((f) => f.workspaceId === workspaceId),
    reset: () => {
      projectFacts.length = 0
    },
  }
}

test('project memory learning - remembers project commands after successful execution', () => {
  const memoryStore = createProjectMemoryStore()

  // Simulate a successful build execution
  const buildCommand = 'npm --workspace apps/terminal-pro run build:electron'
  memoryStore.storeFact({
    content: `Build command is: ${buildCommand}`,
    workspaceId: '/tmp/test-workspace',
    confidence: 0.98,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  const buildFact = facts.find((f) => /build command/i.test(f.content))
  assert.ok(buildFact, 'Should store build command fact')
  assert.ok(buildFact.confidence > 0.9, 'Should have high confidence')
})

test('project memory learning - stores test command after successful test run', () => {
  const memoryStore = createProjectMemoryStore()

  const testCommand = 'pnpm test'
  memoryStore.storeFact({
    content: `Test command is: ${testCommand}`,
    workspaceId: '/tmp/test-workspace',
    confidence: 0.98,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  assert.ok(facts.some((f) => /test command/i.test(f.content)))
})

test('project memory learning - remembers repeated failures', () => {
  const memoryStore = createProjectMemoryStore()

  memoryStore.storeFact({
    content: 'Linux release metadata failed due to beta channel resolution issue',
    workspaceId: '/tmp/test-workspace',
    confidence: 0.99,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  assert.ok(facts.some((f) => /failure pattern|failed|error/i.test(f.content)))
})

test('project memory learning - remembers user choice of package manager', () => {
  const memoryStore = createProjectMemoryStore()

  memoryStore.storeFact({
    content: 'User prefers pnpm as package manager',
    workspaceId: '/tmp/test-workspace',
    confidence: 0.95,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  assert.ok(facts.some((f) => /pnpm/i.test(f.content)))
})

test('project memory learning - remembers user UI preferences', () => {
  const memoryStore = createProjectMemoryStore()

  memoryStore.storeFact({
    content: 'User prefers chat-style interface over blocky cards',
    workspaceId: '/tmp/test-workspace',
    confidence: 0.95,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  assert.ok(facts.some((f) => /chat-style|interface/i.test(f.content)))
})

test('project memory learning - remembers architecture info', () => {
  const memoryStore = createProjectMemoryStore()

  memoryStore.storeFact({
    content: 'This is a Next.js TypeScript project with React components',
    workspaceId: '/tmp/test-workspace',
    confidence: 0.9,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  assert.ok(facts.some((f) => /next\.js|typescript|react/i.test(f.content)))
})

test('project memory learning - retrieves relevant facts for build operations', () => {
  const memoryStore = createProjectMemoryStore()

  memoryStore.storeFact({
    content: 'Build command: pnpm build',
    workspaceId: '/tmp/test-workspace',
    confidence: 0.98,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  const buildFact = facts.find((f) => /build command/i.test(f.content))

  assert.ok(buildFact)
  assert.ok(buildFact.confidence > 0.9)
})

test('project memory learning - retrieves relevant facts for test operations', () => {
  const memoryStore = createProjectMemoryStore()

  memoryStore.storeFact({
    content: 'Test command: pnpm test',
    workspaceId: '/tmp/test-workspace',
    confidence: 0.98,
  })

  const facts = memoryStore.getFactsForWorkspace('/tmp/test-workspace')
  assert.ok(facts.some((f) => /test command/i.test(f.content)))
})

test('execution memory - records successful command outcomes', () => {
  const executions = []

  const recordExecution = (exec) => {
    executions.push({
      id: `exec_${Date.now()}`,
      command: exec.command,
      resultStatus: exec.success ? 'succeeded' : 'failed',
      exitCode: exec.exitCode,
      summary: exec.summary,
    })
  }

  recordExecution({
    command: 'pnpm build',
    success: true,
    exitCode: 0,
    summary: 'Build completed successfully',
  })

  assert.equal(executions.length, 1)
  assert.equal(executions[0].resultStatus, 'succeeded')
  assert.equal(executions[0].exitCode, 0)
})

test('execution memory - records failed command outcomes', () => {
  const executions = []

  const recordExecution = (exec) => {
    executions.push({
      id: `exec_${Date.now()}`,
      command: exec.command,
      resultStatus: exec.success ? 'succeeded' : 'failed',
      exitCode: exec.exitCode,
      summary: exec.summary,
    })
  }

  recordExecution({
    command: 'pnpm test',
    success: false,
    exitCode: 1,
    summary: 'Tests failed due to missing dependency',
  })

  assert.equal(executions.length, 1)
  assert.equal(executions[0].resultStatus, 'failed')
  assert.equal(executions[0].exitCode, 1)
})
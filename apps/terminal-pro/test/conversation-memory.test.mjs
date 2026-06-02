import test from 'node:test'
import assert from 'node:assert/strict'

const { routeConversationTurn } = await import('../dist-electron/main/orchestration/conversationRouter.js')
const { handleUnifiedConversationTurn } = await import('../dist-electron/main/orchestration/unifiedTurn.js')
const { createRuleBasedMemoryExtractor } = await import('../dist-electron/main/orchestration/memoryExtractor.js')

// Test the memory extractor directly for redaction behavior
const memoryExtractor = createRuleBasedMemoryExtractor()

function createMemoryStoreStub() {
  const profile = { tonePreference: undefined }
  const operationalMemories = []
  const savedMemories = []

  return {
    getState: () => ({
      memory: {
        profile,
        operationalMemories,
        operationalStore: { backend: 'sqlite' },
      },
    }),
    updateProfile: (input) => {
      Object.assign(profile, input)
      return { memory: { profile, operationalMemories } }
    },
    upsertOperationalMemory: (input) => {
      const entry = {
        id: `mem_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        scope: input.scope,
        kind: input.kind,
        content: input.content,
        workspaceId: input.workspaceId,
        status: input.status || 'approved',
        source: input.source || 'user_explicit',
        salience: input.salience || 0.5,
        confidence: input.confidence || 0.9,
        tags: input.tags || [],
        metadata: input.metadata || {},
      }
      operationalMemories.push(entry)
      savedMemories.push(entry)
      return { memory: { profile, operationalMemories } }
    },
    retrieveRelevantMemories: (input) =>
      operationalMemories.filter(
        (entry) =>
          (!input.workspaceId || !entry.workspaceId || entry.workspaceId === input.workspaceId) &&
          (!input.query || entry.content.toLowerCase().includes(input.query.toLowerCase()))
      ),
    recordConversationTurn: () => {
      operationalMemories.push({
        id: `turn_${Date.now()}`,
        scope: 'session',
        kind: 'conversation_fact',
        content: 'conversation recorded',
      })
      return { memory: { profile, operationalMemories } }
    },
  }
}

test('conversation memory - answers "how are you" without forcing execution', async () => {
  const memoryStore = createMemoryStoreStub()

  const result = await handleUnifiedConversationTurn({
    rawText: 'how are you',
    workspaceId: '/tmp/test-workspace',
    latestRun: null,
    buildPlan: async () => ({ id: 'plan_0', reasoning: '', steps: [] }),
    memoryStore,
  })

  // 'how are you' triggers question mode because it starts with a question word
  // but still doesn't require action
  assert.equal(result.turn.requiresAction, false)
  assert.equal(result.turn.allowedNextAction, 'reply_only')
})

test('conversation memory - general knowledge questions are conversational', async () => {
  const result = await routeConversationTurn({
    rawText: 'what knowledge do you have',
    workspaceId: undefined,
    latestRun: null,
  })

  // General knowledge questions are 'help' mode or 'unclear' without workspace
  assert.ok(['help', 'question', 'unclear'].includes(result.turnType))
  assert.equal(result.requiresAction, false)
})

test('conversation memory - handles greetings appropriately', async () => {
  const result = await routeConversationTurn({
    rawText: 'hi',
    workspaceId: '/tmp/test-workspace',
    latestRun: {
      runId: 'run_123',
      sessionId: 'session_123',
    },
  })

  assert.equal(result.turnType, 'greeting')
  assert.equal(result.requiresAction, false)
})

test('conversation memory - stores explicit preferences about verbosity', async () => {
  const memoryStore = createMemoryStoreStub()

  await handleUnifiedConversationTurn({
    rawText: 'please be concise and keep responses short',
    workspaceId: '/tmp/test-workspace',
    latestRun: null,
    buildPlan: async () => ({ id: 'plan_0', reasoning: '', steps: [] }),
    memoryStore,
  })

  const state = memoryStore.getState()
  assert.equal(state.memory.profile.tonePreference, 'concise')
})

test('memory extraction - does not extract memories from sensitive data', async () => {
  // Test that the memory extractor refuses to store sensitive data
  const suggestions = await memoryExtractor.extract({
    userMessage: 'my token is sk_live_abc123',
    assistantMessage: 'Got it',
    workspaceId: '/tmp/test-workspace',
  })

  assert.equal(suggestions.length, 0, 'Should not extract any memories from token-containing messages')
})

test('memory extraction - extracts preferences from safe messages', async () => {
  const suggestions = await memoryExtractor.extract({
    userMessage: 'I prefer to use pnpm',
    assistantMessage: 'Got it',
    workspaceId: '/tmp/test-workspace',
  })

  assert.ok(suggestions.length > 0, 'Should extract preference from safe messages')
})

test('conversation memory - classifies execution intents correctly', () => {
  // "fix the build" triggers execute mode (fix keyword without self-check pattern)
  const fixResult = routeConversationTurn({
    rawText: 'fix the build',
    workspaceId: '/tmp/test-workspace',
    latestRun: null,
  })
  assert.equal(fixResult.mode, 'execute')
  assert.equal(fixResult.requiresAction, true)

  // "diagnose the app" triggers self_check because it matches the self-check trigger pattern
  const diagnoseResult = routeConversationTurn({
    rawText: 'diagnose the app',
    workspaceId: '/tmp/test-workspace',
    latestRun: null,
  })
  assert.equal(diagnoseResult.mode, 'self_check')
  assert.equal(diagnoseResult.requiresAction, true)
})

test('conversation memory - classifies explain intents correctly', () => {
  const explainInputs = ['why is this broken', 'explain the error', 'what happened with the last run']

  for (const input of explainInputs) {
    const result = routeConversationTurn({
      rawText: input,
      workspaceId: '/tmp/test-workspace',
      latestRun: { runId: 'run_123', latestExitCode: 1 },
    })

    assert.ok(['explain', 'question', 'follow_up'].includes(result.turnType))
    assert.equal(result.requiresAction, false)
  }
})
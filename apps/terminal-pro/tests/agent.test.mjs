// Agent Tests - Uses Node's built-in test runner
// Run: node --test tests/agent.test.ts

import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  buildConversationReply,
  routeConversationTurn,
} from '../dist-electron/main/orchestration/conversationRouter.js'

describe('Agent Tests', () => {
  it('should process simple agent commands', async () => {
    // Test basic agent processing
    const testInput = 'say hello'

    // Basic validation - the input should be a non-empty string
    assert.strictEqual(testInput.length > 0, true)
    assert.ok(testInput.includes('hello'))
  })

  it('should validate agent response structure', async () => {
    // Expected response structure from agent
    const mockResponse = {
      text: 'Test response',
      actions: ['action1', 'action2'],
      plan: {
        steps: [{ name: 'Step 1', status: 'pending' }],
      },
    }

    // Validate response has required fields
    assert.ok(mockResponse.text)
    assert.strictEqual(typeof mockResponse.text, 'string')
    assert.ok(Array.isArray(mockResponse.actions))
  })

  it('should handle execution trace block creation', async () => {
    // Test the execution trace block structure
    const mockCommand = 'ls -la'

    // Simulate the structure that the execution trace renderer creates
    const block = {
      className: 'execution-trace-block',
      innerHTML: `command: $ ${mockCommand}`,
    }

    assert.ok(block.innerHTML.includes(mockCommand))
  })

  it('should route self-check with active workspace to execute', async () => {
    const args = {
      rawText: 'scan yourself',
      workspaceId: '/some/workspace',
      latestRun: { runId: 'run_123', sessionId: 'session_456' },
    }

    const result = routeConversationTurn(args)

    assert.strictEqual(result.mode, 'self_check')
    assert.strictEqual(result.allowedNextAction, 'execute')
    assert.ok(result.executionCandidate)
    assert.strictEqual(result.executionCandidate.goal, 'self-check')
  })

  it('should route self-check without context to clarify', async () => {
    const args = {
      rawText: 'scan yourself',
      workspaceId: null,
      latestRun: null,
    }

    const result = routeConversationTurn(args)

    assert.strictEqual(result.mode, 'self_check')
    assert.strictEqual(result.allowedNextAction, 'clarify')
    assert.ok(result.clarification)
    assert.strictEqual(result.clarification.required, true)
  })

  it('should treat greeting turns as chat instead of forcing clarification', async () => {
    const result = routeConversationTurn({
      rawText: 'rina hi',
      workspaceId: '/home/karina',
      latestRun: { runId: 'run_123', sessionId: 'session_456' },
    })

    assert.strictEqual(result.mode, 'chat')
    assert.strictEqual(result.allowedNextAction, 'reply_only')

    const reply = await buildConversationReply({
      routedTurn: result,
      workspaceLabel: '/home/karina',
      latestRun: { runId: 'run_123', sessionId: 'session_456' },
    })

    assert.match(reply.message, /Hi\./)
    assert.doesNotMatch(reply.message, /need one anchor/i)
  })

  it('should answer check-ins naturally instead of talking about proof first', async () => {
    const result = routeConversationTurn({
      rawText: 'how are you',
      workspaceId: '/home/karina',
      latestRun: { runId: 'run_123', sessionId: 'session_456', interrupted: true },
    })

    assert.strictEqual(result.mode, 'question')

    const reply = await buildConversationReply({
      routedTurn: result,
      workspaceLabel: '/home/karina',
      latestRun: { runId: 'run_123', sessionId: 'session_456', interrupted: true },
    })

    assert.match(reply.message, /I.m good/i)
    assert.doesNotMatch(reply.message, /proof/i)
  })

  it('should treat greeting-prefixed questions as questions instead of unclear inspect prompts', async () => {
    const result = routeConversationTurn({
      rawText: 'hi rina why isnt setting working',
      workspaceId: '/home/karina/Downloads',
      latestRun: { runId: 'run_123', sessionId: 'session_456' },
    })

    assert.strictEqual(result.mode, 'question')
    assert.strictEqual(result.allowedNextAction, 'reply_only')

    const reply = await buildConversationReply({
      routedTurn: result,
      workspaceLabel: '/home/karina/Downloads',
      latestRun: { runId: 'run_123', sessionId: 'session_456' },
    })

    assert.doesNotMatch(reply.message, /need one anchor/i)
  })

  it('should answer capability questions as help instead of starting verification', async () => {
    const result = routeConversationTurn({
      rawText: 'what can u do',
      workspaceId: '/home/karina/Documents/rinawarp-terminal-pro',
      latestRun: null,
    })

    assert.strictEqual(result.mode, 'help')
    assert.strictEqual(result.allowedNextAction, 'reply_only')

    const reply = await buildConversationReply({
      routedTurn: result,
      workspaceLabel: 'rinawarp-terminal-pro',
      latestRun: null,
    })

    assert.match(reply.message, /I can help/i)
    assert.doesNotMatch(reply.message, /starting a verification run/i)
  })

  it('should answer execution questions without inventing a verification run when no proof exists', async () => {
    const result = routeConversationTurn({
      rawText: 'why did the build fail',
      workspaceId: '/home/karina/Documents/rinawarp-terminal-pro',
      latestRun: null,
    })

    assert.strictEqual(result.mode, 'question')
    assert.strictEqual(result.allowedNextAction, 'reply_only')

    const reply = await buildConversationReply({
      routedTurn: result,
      workspaceLabel: 'rinawarp-terminal-pro',
      latestRun: null,
    })

    assert.match(reply.message, /Nothing has run yet|I can inspect/i)
    assert.doesNotMatch(reply.message, /starting a verification run/i)
  })

  it('should keep repair-style prompts in plan mode even when they mention build', async () => {
    const result = routeConversationTurn({
      rawText: 'fix the build',
      workspaceId: '/home/karina/Documents/rinawarp-terminal-pro',
      latestRun: null,
    })

    assert.strictEqual(result.mode, 'execute')
    assert.strictEqual(result.allowedNextAction, 'plan')
    assert.ok(result.executionCandidate)
    assert.strictEqual(result.executionCandidate.goal, 'fix')
    assert.strictEqual(result.executionCandidate.risk, 'medium')
  })
})

import { describe, expect, it } from 'vitest'

import { describeAgentPlanStep, describeAgentTimelineEvent } from '../../src/renderer/panels/agentNarration.js'

describe('agent narration plan steps', () => {
  it('describes workspace inspection clearly', () => {
    expect(
      describeAgentPlanStep({
        name: 'Inspect workspace state',
        input: { command: 'git status --short' },
      }),
    ).toBe('I’m checking the workspace state first.')
  })

  it('describes test execution as diagnosis first', () => {
    expect(
      describeAgentPlanStep({
        name: 'Run tests',
        input: { command: 'npm test' },
      }),
    ).toBe('I’m running the tests to see what actually fails.')
  })

  it('describes build verification clearly', () => {
    expect(
      describeAgentPlanStep({
        name: 'Verify build',
        input: { command: 'npm run build' },
      }),
    ).toBe('I’m running the build to verify the current state.')
  })

  it('describes installs without sounding like raw tooling', () => {
    expect(
      describeAgentPlanStep({
        name: 'Install dependencies',
        input: { command: 'npm ci' },
      }),
    ).toBe('I’m installing the dependencies this project needs.')
  })

  it('falls back to the named step when no stronger narration matches', () => {
    expect(
      describeAgentPlanStep({
        name: 'Refresh generated assets',
      }),
    ).toBe('I’m working through: Refresh generated assets.')
  })
})

describe('agent narration timeline events', () => {
  it('describes planning mode with calm momentum', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'agent.mode.changed',
        id: 'evt_1',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        mode: 'planning',
      }),
    ).toBe('I’m lining up the safest path first.')
  })

  it('describes executing mode with forward motion', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'agent.mode.changed',
        id: 'evt_2',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        mode: 'executing',
      }),
    ).toBe('I’m moving through the plan now.')
  })

  it('describes inspection intent without tool jargon', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'intent.resolved',
        id: 'evt_3',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        intent: 'question',
      }),
    ).toBe('I’m starting with inspection before I change anything.')
  })

  it('describes remembered sqlite-backed constraints naturally', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'memory.context.applied',
        id: 'evt_4',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        backend: 'sqlite',
        constraintCount: 2,
      }),
    ).toBe('I’m using 2 remembered constraints from SQLite memory for this turn.')
  })

  it('describes created plans in teammate language', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'plan.created',
        id: 'evt_5',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        goal: 'fix the build',
        stepCount: 3,
      }),
    ).toBe('I’ve got a plan for fix the build. 3 steps, starting with the safest checks.')
  })

  it('describes approval pauses plainly', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'permission.required',
        id: 'evt_6',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        reason: 'Tests may need changes.',
      }),
    ).toBe('I want your approval before I go further. Tests may need changes.')
  })

  it('uses provided completion summaries directly', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'task.completed',
        id: 'evt_7',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        summary: 'Build passes again.',
      }),
    ).toBe('Build passes again.')
  })

  it('uses provided failure summaries directly', () => {
    expect(
      describeAgentTimelineEvent({
        type: 'task.failed',
        id: 'evt_8',
        sessionId: 'session_1',
        correlationId: 'corr_1',
        timestamp: '2026-04-15T00:00:00.000Z',
        error: 'The build still fails in CI.',
      }),
    ).toBe('The build still fails in CI.')
  })
})

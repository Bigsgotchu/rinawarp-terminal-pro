import test from 'node:test'
import assert from 'node:assert/strict'

const { createFixProjectFlow } = await import('../dist-electron/main/assistant/fixProjectFlow.js')

test('returns safe executable repair steps with pending verification checks', async () => {
  const fixProject = createFixProjectFlow({
    agentPlan: async () => ({
      reasoning: 'Install the missing dependency, then rerun the build to verify the workspace.',
      steps: [
        {
          stepId: 'install',
          description: 'Install the missing dependency',
          risk: 'safe-write',
          input: { command: 'npm install lodash' },
        },
        {
          stepId: 'verify-build',
          description: 'Verify the repair by rerunning the build',
          risk: 'inspect',
          input: { command: 'npm run build' },
        },
      ],
    }),
    evaluatePolicy: () => ({ ok: true }),
  })

  const result = await fixProject('/tmp/demo-project')

  assert.equal(result.success, true)
  assert.deepEqual(
    result.executableSteps.map((step) => step.command),
    ['npm install lodash', 'npm run build']
  )
  assert.equal(result.verification.status, 'pending')
  assert.deepEqual(result.verification.checks, ['npm run build'])
  assert.match(result.explanation, /Dependencies appear to be missing or incomplete\./)
})

test('halts when a high-impact repair step is blocked by policy', async () => {
  const fixProject = createFixProjectFlow({
    agentPlan: async () => ({
      reasoning: 'The port needs to be reclaimed before the app can restart.',
      steps: [
        {
          stepId: 'kill-port',
          description: 'Kill the process holding the dev port',
          risk: 'high-impact',
          input: { command: 'kill -9 4242' },
        },
      ],
    }),
    evaluatePolicy: () => ({
      ok: false,
      requiresConfirmation: true,
      message: 'Blocked step: kill -9 4242',
    }),
  })

  const result = await fixProject('/tmp/demo-project')

  assert.equal(result.success, false)
  assert.equal(result.haltReason, 'Blocked step: kill -9 4242')
  assert.equal(result.verification.status, 'failed')
  assert.equal(result.executableSteps.length, 0)
})

test('drops blocked low-risk steps and keeps the rest of the repair plan executable', async () => {
  const fixProject = createFixProjectFlow({
    agentPlan: async () => ({
      reasoning: 'Inspect the tsconfig issue, then rewrite the config to get the build green again.',
      steps: [
        {
          stepId: 'inspect-config',
          description: 'Inspect the current tsconfig before changing it',
          risk: 'inspect',
          input: { command: 'cat tsconfig.json' },
        },
        {
          stepId: 'rewrite-config',
          description: 'Rewrite the tsconfig to restore the build',
          risk: 'safe-write',
          input: { command: 'node scripts/fix-tsconfig.mjs' },
        },
      ],
    }),
    evaluatePolicy: (step) =>
      step.command === 'cat tsconfig.json'
        ? { ok: false, message: 'Read step skipped in favor of the direct repair step.' }
        : { ok: true },
  })

  const result = await fixProject('/tmp/demo-project')

  assert.equal(result.success, true)
  assert.deepEqual(result.executableSteps.map((step) => step.command), ['node scripts/fix-tsconfig.mjs'])
  assert.match(result.explanation, /node scripts\/fix-tsconfig\.mjs/)
})

test('classifies port-conflict repairs and keeps port-clearing steps executable', async () => {
  const fixProject = createFixProjectFlow({
    agentPlan: async () => ({
      reasoning: 'The dev server is failing because the local port is already in use.',
      steps: [
        {
          stepId: 'find-port-owner',
          description: 'Find the process holding the dev port',
          risk: 'inspect',
          input: { command: 'lsof -i :3000' },
        },
        {
          stepId: 'clear-port',
          description: 'Kill the process and retry startup',
          risk: 'safe-write',
          input: { command: 'fuser -k 3000/tcp' },
        },
      ],
    }),
    evaluatePolicy: () => ({ ok: true }),
  })

  const result = await fixProject('/tmp/demo-project')

  assert.equal(result.success, true)
  assert.equal(result.plan.issues[0]?.kind, 'port-conflict')
  assert.match(result.plan.issues[0]?.summary || '', /port conflict/i)
  assert.deepEqual(result.executableSteps.map((step) => step.command), ['lsof -i :3000', 'fuser -k 3000/tcp'])
})

test('dedupes verification checks when build verification appears in both issues and steps', async () => {
  const fixProject = createFixProjectFlow({
    agentPlan: async () => ({
      reasoning: 'Repair the build config and rerun the build to verify the project.',
      steps: [
        {
          stepId: 'rewrite-config',
          description: 'Rewrite the tsconfig to restore the build',
          risk: 'safe-write',
          input: { command: 'node scripts/fix-tsconfig.mjs' },
        },
        {
          stepId: 'verify-build',
          description: 'Verification: rerun the build after the config change',
          risk: 'inspect',
          input: { command: 'npm run build' },
        },
      ],
    }),
    evaluatePolicy: () => ({ ok: true }),
  })

  const result = await fixProject('/tmp/demo-project')

  assert.equal(result.success, true)
  assert.deepEqual(result.verification.checks, ['npm run build'])
  assert.equal(result.plan.verificationSteps.length, 1)
})

test('falls back to a generic build-config issue when reasoning exists but no specific issue was inferred', async () => {
  const fixProject = createFixProjectFlow({
    agentPlan: async () => ({
      reasoning: 'The workspace still needs repair before it can run cleanly.',
      steps: [
        {
          stepId: 'custom-repair',
          description: 'Apply the generated workspace repair script',
          risk: 'safe-write',
          input: { command: 'node scripts/custom-repair.mjs' },
        },
      ],
    }),
    evaluatePolicy: () => ({ ok: true }),
  })

  const result = await fixProject('/tmp/demo-project')

  assert.equal(result.success, true)
  assert.equal(result.plan.issues[0]?.kind, 'build-config')
  assert.match(result.plan.issues[0]?.summary || '', /needs repair/i)
  assert.deepEqual(result.verification.checks, ['npm run build'])
})

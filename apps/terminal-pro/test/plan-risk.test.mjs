import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const { riskFromPlanStep } = await import('../dist-electron/plan-risk.js')
const { createBuildPlanHelpers } = await import('../dist-electron/main/planning/buildPlan.js')

async function createNodeWorkspace() {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rina-plan-risk-'))
  await fs.writeFile(path.join(projectRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n')
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        scripts: {
          build: 'vite build',
          test: 'vitest run',
          lint: 'eslint .',
          typecheck: 'tsc --noEmit',
          deploy: 'wrangler deploy',
        },
      },
      null,
      2
    )
  )
  return projectRoot
}

function makePlanHelpers() {
  return createBuildPlanHelpers({
    playbooks: [],
    topCpuCmdSafeShort: 'ps aux | head',
  })
}

function commands(plan) {
  return plan.steps.map((step) => String(step.input?.command || step.command || '')).join('\n')
}

function assertVerificationPlan(plan, commandPattern) {
  assert.match(commands(plan), commandPattern)
  assert.equal(plan.steps.some((step) => /install|fix|deploy|approval/i.test(`${step.stepId} ${step.input?.command || ''}`)), false)
  for (const step of plan.steps) {
    assert.equal(step.risk, 'inspect')
    assert.equal(step.requires_confirmation, false)
    assert.equal(step.requiresApproval, false)
    assert.equal(step.mutation, false)
  }
}

function highestRisk(plan) {
  if (plan.steps.some((step) => step.risk === 'dangerous')) return 'dangerous'
  if (plan.steps.some((step) => step.risk === 'safe-write')) return 'safe-write'
  if (plan.steps.some((step) => step.risk === 'blocked')) return 'blocked'
  return 'inspect'
}

test('maps inspect/low-risk steps to read', () => {
  assert.equal(riskFromPlanStep({ risk: 'inspect' }), 'read')
  assert.equal(riskFromPlanStep({ risk_level: 'low' }), 'read')
})

test('maps high-impact signals to high-impact', () => {
  assert.equal(riskFromPlanStep({ confirmationScope: 'terminal.write:rm -rf /' }), 'high-impact')
  assert.equal(riskFromPlanStep({ risk: 'high-impact' }), 'high-impact')
  assert.equal(riskFromPlanStep({ risk: 'dangerous' }), 'high-impact')
  assert.equal(riskFromPlanStep({ risk_level: 'high' }), 'high-impact')
})

test('maps medium/safe-write and preserves fallback', () => {
  assert.equal(riskFromPlanStep({ risk: 'safe-write' }), 'safe-write')
  assert.equal(riskFromPlanStep({ risk_level: 'medium' }), 'safe-write')
  assert.equal(riskFromPlanStep({}), 'safe-write')
})

test('planner treats build as inspect verification without install or approval', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Build this project and tell me what fails', projectRoot)

  assertVerificationPlan(plan, /pnpm run build/)
})

test('planner treats tests as inspect verification without approval', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Run tests and explain failures', projectRoot)

  assertVerificationPlan(plan, /pnpm run test/)
})

test('planner treats typecheck as inspect verification without approval', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Typecheck this project', projectRoot)

  assertVerificationPlan(plan, /pnpm run typecheck/)
})

test('planner gates dependency install as safe-write mutation', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Install dependencies', projectRoot)
  const installStep = plan.steps.find((step) => step.stepId === 'install_dependencies')

  assert.equal(highestRisk(plan), 'safe-write')
  assert.ok(installStep)
  assert.equal(installStep.risk, 'safe-write')
  assert.equal(installStep.requires_confirmation, true)
  assert.equal(installStep.requiresApproval, true)
  assert.equal(installStep.mutation, true)
})

test('planner gates fix requests as safe-write mutation', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Fix this project', projectRoot)
  const mutationStep = plan.steps.find((step) => step.risk === 'safe-write')

  assert.equal(highestRisk(plan), 'safe-write')
  assert.ok(mutationStep)
  assert.equal(mutationStep.requires_confirmation, true)
  assert.equal(mutationStep.requiresApproval, true)
  assert.equal(mutationStep.mutation, true)
})

test('planner gates deploy requests as dangerous mutation', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Deploy this project', projectRoot)
  const deployStep = plan.steps.find((step) => step.stepId === 'deploy_project')

  assert.equal(highestRisk(plan), 'dangerous')
  assert.ok(deployStep)
  assert.equal(deployStep.risk, 'dangerous')
  assert.equal(deployStep.requires_confirmation, true)
  assert.equal(deployStep.requiresApproval, true)
  assert.equal(deployStep.mutation, true)
})

test('planner lets deploy win over build in combined work prompts', async () => {
  const projectRoot = await createNodeWorkspace()
  const { makePlan } = makePlanHelpers()

  const plan = await makePlan('Build and deploy this project', projectRoot)

  assert.equal(highestRisk(plan), 'dangerous')
  assert.match(commands(plan), /pnpm run deploy/)
})

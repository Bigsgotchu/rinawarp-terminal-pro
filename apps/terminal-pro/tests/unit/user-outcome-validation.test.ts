import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { inspectProjectWorkspace } from '../../src/main/memory/projectInspector.js'
import { SqliteWorkspaceFactStore } from '../../src/main/memory/SqliteWorkspaceFactStore.js'
import { hydrateWorkspaceKnowledge, type WorkspaceKnowledgeSnapshot } from '../../src/main/memory/workspaceKnowledge.js'
import { acquireWorkspaceFactsFromVerifiedProof } from '../../src/main/memory/workspaceKnowledgeAcquisition.js'
import { buildWorkspaceContext, type WorkspaceContext } from '../../src/main/memory/workspaceContextBuilder.js'
import { buildConversationReply, routeConversationTurn } from '../../src/main/orchestration/conversationRouter.js'
import { createBuildPlanHelpers } from '../../src/main/planning/buildPlan.js'
import { StructuredSessionStore } from '../../src/structured-session.js'
import type { ConversationRunReference } from '../../src/main/orchestration/conversationTypes.js'

function createRealProject(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-user-outcome-project-'))
  fs.mkdirSync(path.join(projectRoot, 'scripts'), { recursive: true })
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'rina-user-outcome-real-repo',
        private: true,
        scripts: {
          build: 'node scripts/safe-change.cjs',
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
      2,
    ),
  )
  fs.writeFileSync(path.join(projectRoot, 'package-lock.json'), '{"lockfileVersion":3}\n')
  fs.writeFileSync(path.join(projectRoot, 'vercel.json'), '{"version":2}\n')
  fs.writeFileSync(
    path.join(projectRoot, 'scripts', 'safe-change.cjs'),
    "console.log('safe change verified through runtime')\n",
  )
  return projectRoot
}

function workspaceKnowledgeFromContext(context: WorkspaceContext): WorkspaceKnowledgeSnapshot {
  return {
    architecture: context.architecture,
    dependencies: context.dependencies,
    conventions: context.conventions,
    preferences: context.preferences,
    recurring_failures: [],
    runtime_facts: [...context.runtimeFacts, ...context.deploymentFacts],
    fact_count:
      context.architecture.length +
      context.dependencies.length +
      context.conventions.length +
      context.preferences.length +
      context.runtimeFacts.length +
      context.deploymentFacts.length,
    last_hydrated_at: new Date().toISOString(),
  }
}

async function askRina(args: {
  prompt: string
  projectRoot: string
  latestRun?: ConversationRunReference | null
  workspaceKnowledge?: WorkspaceKnowledgeSnapshot | null
}): Promise<string> {
  const routedTurn = routeConversationTurn({
    rawText: args.prompt,
    workspaceId: args.projectRoot,
    latestRun: args.latestRun || null,
  })
  const reply = await buildConversationReply({
    routedTurn,
    workspaceLabel: args.projectRoot,
    latestRun: args.latestRun || null,
    workspaceKnowledge: args.workspaceKnowledge || null,
  })
  return reply.message
}

describe('user outcome validation', () => {
  it('validates project understanding, safe planning, approved execution, Proof explanation, and remembered knowledge through real paths', async () => {
    const projectRoot = createRealProject()
    const sessionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-user-outcome-session-'))
    const factDbPath = path.join(os.tmpdir(), `rina-user-outcome-facts-${Date.now()}.sqlite`)

    try {
      const factStore = new SqliteWorkspaceFactStore(factDbPath)
      await factStore.init()

      const inspection = await inspectProjectWorkspace(projectRoot)
      const context = buildWorkspaceContext(await hydrateWorkspaceKnowledge(factStore), inspection)
      const observedKnowledge = workspaceKnowledgeFromContext(context)

      const projectUnderstanding = await askRina({
        prompt: 'What do you know about this project?',
        projectRoot,
        workspaceKnowledge: observedKnowledge,
      })
      expect(projectUnderstanding).toContain('Workspace Knowledge')
      expect(projectUnderstanding).toContain('Node.js')
      expect(projectUnderstanding).toContain('vite')
      expect(projectUnderstanding).toContain('@clerk/clerk-react')
      expect(projectUnderstanding).toContain('better-sqlite3')

      const safeChangeTurn = routeConversationTurn({
        rawText: 'Plan a safe change.',
        workspaceId: projectRoot,
      })
      expect(safeChangeTurn.requiresAction).toBe(true)
      expect(safeChangeTurn.allowedNextAction).toBe('plan')

      const planner = createBuildPlanHelpers({
        fs: {},
        path: {},
        playbooks: [],
        topCpuCmdSafeShort: 'ps aux',
      } as any)
      const plan = await planner.makePlan('Plan a safe change.', projectRoot, context)
      expect(plan.reasoning).toMatch(/Detected node project/i)
      const executableStep = plan.steps.find((step: any) => step.input?.command === 'npm run build')
      expect(executableStep).toBeTruthy()

      const proofId = `proof:${plan.id}:user-outcome`
      const runtimeId = 'runtime:user-outcome'
      const structuredStore = new StructuredSessionStore(sessionRoot, true, {
        onProofVerified: (verification) => {
          void acquireWorkspaceFactsFromVerifiedProof({
            verification,
            store: factStore,
            successfulCommands: 1,
            failedCommands: 0,
          })
        },
      })
      structuredStore.init()
      const sessionId = structuredStore.startSession({ source: 'user_outcome_validation', projectRoot, preferredId: plan.id })
      const streamId = 'stream_user_outcome_safe_change'

      structuredStore.beginCommand({
        sessionId,
        streamId,
        command: executableStep!.input.command,
        cwd: projectRoot,
        risk: executableStep!.risk,
        source: 'planner_approval',
        planId: plan.id,
        approvalTimestamp: '2026-06-10T00:00:00.000Z',
        approvalActor: 'user',
        runtimeId,
        proofId,
      })
      const executed = spawnSync('npm', ['run', 'build'], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      if (executed.stdout) structuredStore.appendChunk(streamId, 'stdout', executed.stdout)
      if (executed.stderr) structuredStore.appendChunk(streamId, 'stderr', executed.stderr)
      expect(executed.status).toBe(0)
      structuredStore.recordEvidence({
        sessionId,
        proofId,
        type: 'command_execution',
        status: 'present',
        payload: executableStep!.input.command,
      })
      structuredStore.recordEvidence({
        sessionId,
        proofId,
        type: 'exit_code',
        status: 'present',
        payload: '0',
      })
      structuredStore.recordEvidence({
        sessionId,
        proofId,
        type: 'runtime_event',
        status: 'present',
        payload: runtimeId,
      })
      structuredStore.endCommand({ streamId, ok: true, code: executed.status, cancelled: false })

      const verification = structuredStore.verifyProof(proofId)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(verification.verification_status).toBe('verified')
      expect(verification.evidence_count).toBe(3)

      const latestRun: ConversationRunReference = {
        runId: runtimeId,
        sessionId,
        latestCommand: executableStep!.input.command,
        latestExitCode: 0,
        latestReceiptId: proofId,
      }
      const whyReply = await askRina({
        prompt: 'Why did this change?',
        projectRoot,
        latestRun,
        workspaceKnowledge: observedKnowledge,
      })
      expect(whyReply).toContain('Last run finished successfully')
      expect(whyReply).toContain('Proof reference exists')
      expect(whyReply).toContain('npm run build')

      const restartedFactStore = new SqliteWorkspaceFactStore(factDbPath)
      await restartedFactStore.init()
      const rememberedKnowledge = await hydrateWorkspaceKnowledge(restartedFactStore)
      expect(rememberedKnowledge.runtime_facts.some((fact) => fact.key === `proof.${proofId}.verification_status`)).toBe(true)
      expect(rememberedKnowledge.runtime_facts.some((fact) => fact.key === `proof.${proofId}.evidence_count`)).toBe(true)
      const rememberedReply = await askRina({
        prompt: 'What do you remember?',
        projectRoot,
        workspaceKnowledge: rememberedKnowledge,
      })
      expect(rememberedReply).toContain('Workspace Knowledge')
      expect(rememberedReply).toContain('verified')
      expect(rememberedReply).toContain('- 3')
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
      fs.rmSync(sessionRoot, { recursive: true, force: true })
      fs.rmSync(factDbPath, { force: true })
      fs.rmSync(`${factDbPath}-wal`, { force: true })
      fs.rmSync(`${factDbPath}-shm`, { force: true })
    }
  })
})

import assert from 'node:assert/strict'
import { SystemDoctorEngine } from '../dist/index.js'

function makeEngine() {
  return new SystemDoctorEngine(
    {
      platform: 'linux',
      allowlist: [/^echo/i],
      maxReadTimeout: 100,
      maxWriteTimeout: 100,
    },
    {
      sessionId: 'trust-loop-test',
      startedAt: new Date(0).toISOString(),
      platform: 'linux',
      userMode: 'pro',
    }
  )
}

async function testNoExecutionBeforeApproval() {
  const engine = makeEngine()
  const executed = []
  engine.executeCommand = async (command) => {
    executed.push(command)
    return { stdout: 'changed', stderr: '', exitCode: 0 }
  }

  await assert.rejects(
    () =>
      engine.executeFix(
        {
          id: 'fix_plan',
          intent: 'disk cleanup',
          stage: 'fix',
          reasoning: 'Clean a safe cache only after approval.',
          steps: [
            {
              id: 'clean_cache',
              tool: 'terminal',
              command: 'echo clean-cache',
              risk: 'safe-write',
              description: 'Clean regenerable cache',
              expectedEffect: 'Recover disk space from cache data.',
              rollbackAwareness: 'regenerable',
            },
          ],
        },
        { confirmed: false }
      ),
    /requires confirmation/
  )

  assert.deepEqual(executed, [])

  const transcript = engine.getTranscript()
  assert.equal(
    transcript.some((event) => event.type === 'exec'),
    false
  )
  assert.equal(
    transcript.some(
      (event) =>
        event.type === 'approval' &&
        event.requested === true &&
        event.approved === false &&
        event.rollbackAwareness === 'regenerable'
    ),
    true
  )
}

async function testVerificationEvidenceDetails() {
  const engine = makeEngine()
  const before = {
    collectedAt: new Date(0).toISOString(),
    raw: {},
    metrics: { diskUsePercent: 92 },
    snapshots: [],
  }
  const after = {
    collectedAt: new Date(1).toISOString(),
    raw: {},
    metrics: { diskUsePercent: 71 },
    snapshots: [],
  }

  const verification = await engine.verify(before, after, [
    {
      label: 'Disk usage improved',
      validate: (b, a) => ({
        ok: Number(a.metrics.diskUsePercent) <= Number(b.metrics.diskUsePercent),
        details: `Disk usage ${b.metrics.diskUsePercent}% -> ${a.metrics.diskUsePercent}%`,
      }),
    },
  ])

  assert.equal(verification.ok, true)
  assert.equal(verification.checks[0].details, 'Disk usage 92% -> 71%')
  assert.equal(verification.before.metrics.diskUsePercent, 92)
  assert.equal(verification.after.metrics.diskUsePercent, 71)
}

await testNoExecutionBeforeApproval()
await testVerificationEvidenceDetails()

console.log('trust-loop checks passed')

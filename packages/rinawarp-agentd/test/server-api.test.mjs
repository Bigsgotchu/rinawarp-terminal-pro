import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createServer as createHttpServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import { createServer } from '../dist/server.js'

let server
let baseUrl
const agentHome = path.join(process.cwd(), '.tmp-agentd-test')

async function waitForReport(planRunId, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    const resp = await fetch(`${baseUrl}/v1/report?planRunId=${encodeURIComponent(planRunId)}`)
    if (resp.status === 200) return resp.json()
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`report not ready for planRunId=${planRunId}`)
}

async function waitForTaskCompletion(taskId, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    const resp = await fetch(`${baseUrl}/v1/daemon/tasks`)
    if (resp.ok) {
      const body = await resp.json()
      const task = Array.isArray(body.tasks) ? body.tasks.find((t) => t.id === taskId) : null
      if (task && ['completed', 'failed', 'canceled'].includes(task.status)) return task
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`task did not complete: ${taskId}`)
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function signLicenseToken(payload, secret) {
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8')
  const sig = createHmac('sha256', secret).update(payloadBytes).digest()
  return `${b64url(payloadBytes)}.${b64url(sig)}`
}

before(async () => {
  delete process.env.RINAWARP_AGENTD_TOKEN
  delete process.env.RINAWARP_AGENTD_AUTH_SECRET
  delete process.env.RINAWARP_AGENTD_ADMIN_PASSWORD
  delete process.env.RINAWARP_AGENTD_LICENSE
  delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER
  process.env.RINAWARP_AGENT_HOME = agentHome
  fs.rmSync(agentHome, { recursive: true, force: true })
  server = createServer({ port: 0 })
  const port = await server.listen()
  baseUrl = `http://127.0.0.1:${port}`
})

after(async () => {
  if (server) {
    await server.close()
  }
  fs.rmSync(agentHome, { recursive: true, force: true })
  delete process.env.RINAWARP_AGENT_HOME
  delete process.env.RINAWARP_AGENTD_AUTH_SECRET
  delete process.env.RINAWARP_AGENTD_ADMIN_PASSWORD
})

test('POST /v1/plan returns steps with required safety metadata', async () => {
  const resp = await fetch(`${baseUrl}/v1/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      intentText: 'build project',
      projectRoot: process.cwd(),
    }),
  })

  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.ok(Array.isArray(body.plan.steps))
  assert.ok(body.plan.steps.length > 0)

  for (const step of body.plan.steps) {
    assert.ok(typeof step.risk_level === 'string')
    assert.ok(typeof step.requires_confirmation === 'boolean')
    assert.ok(step.verification_plan)
    assert.ok(Array.isArray(step.verification_plan.steps))
  }
})

test('POST /v1/execute-plan rejects malformed safety contract', async () => {
  const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectRoot: process.cwd(),
      confirmed: false,
      confirmationText: '',
      plan: [
        {
          stepId: 'legacy',
          tool: 'terminal.write',
          input: { command: 'echo legacy' },
          risk: 'inspect',
        },
      ],
    }),
  })

  assert.equal(resp.status, 400)
  const body = await resp.json()
  assert.equal(body.ok, false)
  assert.match(body.error, /invalid plan safety contract/i)
})

test('POST /v1/execute-plan accepts valid step contract', async () => {
  delete process.env.NODE_ENV
  process.env.RINAWARP_AGENTD_LICENSE = 'pro'
  delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER
  const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectRoot: process.cwd(),
      confirmed: false,
      confirmationText: '',
      plan: [
        {
          stepId: 'ok-1',
          description: 'Echo success',
          tool: 'terminal.write',
          input: { command: 'echo ok' },
          risk: 'inspect',
          risk_level: 'low',
          requires_confirmation: false,
          verification_plan: { steps: [] },
        },
      ],
    }),
  })

  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.ok(typeof body.planRunId === 'string')
  assert.ok(body.planRunId.length > 0)
  const reportPayload = await waitForReport(body.planRunId)
  assert.equal(reportPayload.ok, true)
  assert.equal(reportPayload.report.planRunId, body.planRunId)
  assert.ok(Array.isArray(reportPayload.report.steps))
  const reportFile = path.join(process.cwd(), '.rinawarp', 'reports', `${body.planRunId}.json`)
  assert.equal(fs.existsSync(reportFile), true)
  delete process.env.RINAWARP_AGENTD_LICENSE
})

test('POST /v1/execute-plan rejects invalid x-rinawarp-license', async () => {
  delete process.env.NODE_ENV
  delete process.env.RINAWARP_AGENTD_LICENSE
  process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER = 'true'
  const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-rinawarp-license': 'invalid-tier' },
    body: JSON.stringify({
      projectRoot: process.cwd(),
      confirmed: false,
      confirmationText: '',
      plan: [
        {
          stepId: 'ok-2',
          description: 'Echo success',
          tool: 'terminal.write',
          input: { command: 'echo ok' },
          risk: 'inspect',
          risk_level: 'low',
          requires_confirmation: false,
          verification_plan: { steps: [] },
        },
      ],
    }),
  })

  assert.equal(resp.status, 400)
  const body = await resp.json()
  assert.equal(body.ok, false)
  assert.match(body.error, /invalid x-rinawarp-license/i)
  delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER
})

test('POST /v1/execute-plan requires signed entitlement token in production', async () => {
  delete process.env.RINAWARP_AGENTD_LICENSE
  delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER
  process.env.NODE_ENV = 'production'
  process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = 'test-secret'

  const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectRoot: process.cwd(),
      confirmed: false,
      confirmationText: '',
      plan: [
        {
          stepId: 'prod-missing-token',
          description: 'Echo failure case',
          tool: 'terminal.write',
          input: { command: 'echo nope' },
          risk: 'inspect',
          risk_level: 'low',
          requires_confirmation: false,
          verification_plan: { steps: [] },
        },
      ],
    }),
  })

  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.ok, false)
  assert.match(body.error, /missing x-rinawarp-license-token/i)
  delete process.env.NODE_ENV
  delete process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET
})

test('POST /v1/execute-plan accepts valid signed entitlement token in production', async () => {
  delete process.env.RINAWARP_AGENTD_LICENSE
  delete process.env.RINAWARP_AGENTD_ALLOW_LICENSE_HEADER
  process.env.NODE_ENV = 'production'
  process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET = 'test-secret'

  const token = signLicenseToken(
    { typ: 'license', tier: 'pro', customer_id: 'cus_123', exp: Date.now() + 60_000 },
    'test-secret'
  )

  const resp = await fetch(`${baseUrl}/v1/execute-plan`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rinawarp-license-token': token,
    },
    body: JSON.stringify({
      projectRoot: process.cwd(),
      confirmed: false,
      confirmationText: '',
      plan: [
        {
          stepId: 'prod-token-ok',
          description: 'Echo success',
          tool: 'terminal.write',
          input: { command: 'echo ok' },
          risk: 'inspect',
          risk_level: 'low',
          requires_confirmation: false,
          verification_plan: { steps: [] },
        },
      ],
    }),
  })

  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.ok(typeof body.planRunId === 'string')
  delete process.env.NODE_ENV
  delete process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET
})

test('GET /v1/report returns 404 for unknown planRunId', async () => {
  const resp = await fetch(`${baseUrl}/v1/report?planRunId=unknown-id`)
  assert.equal(resp.status, 404)
  const body = await resp.json()
  assert.equal(body.ok, false)
  assert.match(body.error, /report not found/i)
})

test('GET /v1/metrics returns runtime counters', async () => {
  const resp = await fetch(`${baseUrl}/v1/metrics`)
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.ok(typeof body.metrics.runs_total === 'number')
  assert.ok(typeof body.metrics.completion_rate === 'number')
  assert.ok(typeof body.metrics.mttr_unblock_ms === 'number')
})

test('POST /v1/daemon/tasks registers task and GET /v1/daemon/tasks lists it', async () => {
  const createResp = await fetch(`${baseUrl}/v1/daemon/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'run_command',
      payload: { command: 'echo from-server-api-test' },
      maxAttempts: 2,
    }),
  })
  assert.equal(createResp.status, 200)
  const createBody = await createResp.json()
  assert.equal(createBody.ok, true)
  assert.equal(createBody.task.type, 'run_command')
  assert.equal(createBody.task.maxAttempts, 2)

  const listResp = await fetch(`${baseUrl}/v1/daemon/tasks?status=queued`)
  assert.equal(listResp.status, 200)
  const listBody = await listResp.json()
  assert.equal(listBody.ok, true)
  assert.ok(Array.isArray(listBody.tasks))
  assert.ok(listBody.tasks.some((t) => t.id === createBody.task.id))
})

test('GET /v1/daemon/status returns daemon/task summary', async () => {
  const resp = await fetch(`${baseUrl}/v1/daemon/status`)
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.ok(typeof body.daemon.running === 'boolean')
  assert.ok(typeof body.tasks.total === 'number')
})

test('POST /v1/daemon/start and /v1/daemon/stop control background daemon', async () => {
  const startResp = await fetch(`${baseUrl}/v1/daemon/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(startResp.status, 200)
  const startBody = await startResp.json()
  assert.equal(startBody.ok, true)
  assert.ok(typeof startBody.pid === 'number' || startBody.alreadyRunning === true)

  const statusResp = await fetch(`${baseUrl}/v1/daemon/status`)
  assert.equal(statusResp.status, 200)
  const statusBody = await statusResp.json()
  assert.equal(statusBody.ok, true)
  assert.equal(typeof statusBody.daemon.running, 'boolean')

  const stopResp = await fetch(`${baseUrl}/v1/daemon/stop`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(stopResp.status, 200)
  const stopBody = await stopResp.json()
  assert.equal(stopBody.ok, true)
})

test('POST /v1/orchestrator/issue-to-pr creates workflow and graph is queryable', async () => {
  const createResp = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '143',
      repoPath: process.cwd(),
      command: 'echo orchestrator-smoke',
    }),
  })
  assert.equal(createResp.status, 200)
  const createBody = await createResp.json()
  assert.equal(createBody.ok, true)
  assert.ok(typeof createBody.workflowId === 'string')
  assert.ok(typeof createBody.taskId === 'string')

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  assert.ok(Array.isArray(graphBody.graph.nodes))
  assert.ok(Array.isArray(graphBody.graph.edges))
  assert.ok(graphBody.graph.nodes.length >= 1)
  assert.ok(graphBody.graph.edges.length >= 1)
})

test('POST /v1/orchestrator/git/prepare-branch creates/switches branch in git repo', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-agentd-git-'))
  try {
    execSync('git init', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: 'ignore' })
    fs.writeFileSync(path.join(tmp, 'README.md'), '# test\n', 'utf8')
    execSync('git add README.md', { cwd: tmp, stdio: 'ignore' })
    execSync('git commit -m "init"', { cwd: tmp, stdio: 'ignore' })

    const resp = await fetch(`${baseUrl}/v1/orchestrator/git/prepare-branch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        repoPath: tmp,
        issueId: '144',
      }),
    })
    assert.equal(resp.status, 200)
    const body = await resp.json()
    assert.equal(body.ok, true)
    assert.equal(body.after, 'rina/fix-144')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('POST /v1/orchestrator/github/create-pr returns dry-run payload', async () => {
  const resp = await fetch(`${baseUrl}/v1/orchestrator/github/create-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      repoSlug: 'owner/repo',
      head: 'rina/fix-144',
      base: 'main',
      title: 'Fix issue 144',
      body: 'Automated PR draft.',
      dryRun: true,
    }),
  })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.equal(body.mode, 'dry_run')
  assert.equal(body.payload.title, 'Fix issue 144')
})

test('POST /v1/orchestrator/github/create-pr records PR planned status when workflowId is provided', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '170',
      repoPath: process.cwd(),
      branchName: 'rina/fix-170',
      command: 'echo pr-plan-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const resp = await fetch(`${baseUrl}/v1/orchestrator/github/create-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      repoSlug: 'owner/repo',
      head: 'rina/fix-170',
      base: 'main',
      title: 'Fix issue 170',
      dryRun: true,
      workflowId: startBody.workflowId,
      issueId: '170',
      branchName: 'rina/fix-170',
    }),
  })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.equal(body.mode, 'dry_run')

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  const prNode = graphBody.graph.nodes.find((n) => n.id === `pr_${startBody.workflowId}`)
  assert.ok(prNode)
  assert.equal(prNode.type, 'pull_request')
  assert.equal(prNode.data.status, 'planned')
})

test('daemon run_command issue_to_pr mode creates commit on branch (dry-run PR)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-agentd-flow-'))
  try {
    execSync('git init', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: 'ignore' })
    fs.writeFileSync(path.join(tmp, 'README.md'), '# flow\n', 'utf8')
    execSync('git add README.md', { cwd: tmp, stdio: 'ignore' })
    execSync('git commit -m "init"', { cwd: tmp, stdio: 'ignore' })

    const startResp = await fetch(`${baseUrl}/v1/daemon/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(startResp.status, 200)
    const startBody = await startResp.json()
    assert.equal(startBody.ok, true)

    let statusResp = await fetch(`${baseUrl}/v1/daemon/status`)
    assert.equal(statusResp.status, 200)
    let statusBody = await statusResp.json()
    if (!statusBody?.daemon?.running) {
      const retryStart = await fetch(`${baseUrl}/v1/daemon/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      assert.equal(retryStart.status, 200)
      statusResp = await fetch(`${baseUrl}/v1/daemon/status`)
      assert.equal(statusResp.status, 200)
      statusBody = await statusResp.json()
    }
    assert.equal(Boolean(statusBody?.daemon?.running), true)

    const addResp = await fetch(`${baseUrl}/v1/daemon/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'run_command',
        payload: {
          mode: 'issue_to_pr',
          issueId: '145',
          branchName: 'rina/fix-145',
          command: "printf 'autofix\\n' >> README.md",
          cwd: tmp,
          repoSlug: 'owner/repo',
          prDryRun: true,
          push: false,
        },
      }),
    })
    assert.equal(addResp.status, 200)
    const addBody = await addResp.json()
    assert.equal(addBody.ok, true)
    const taskId = addBody.task.id

    const completed = await waitForTaskCompletion(taskId)
    assert.equal(completed.status, 'completed')
    assert.equal(completed.result.mode, 'issue_to_pr')
    assert.equal(completed.result.branchName, 'rina/fix-145')
    assert.equal(completed.result.prResult.mode, 'dry_run')

    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: tmp }).toString('utf8').trim()
    assert.equal(branch, 'rina/fix-145')
    const log = execSync('git log --oneline -n 1', { cwd: tmp }).toString('utf8')
    assert.match(log, /fix: issue 145/i)
  } finally {
    try {
      await fetch(`${baseUrl}/v1/daemon/stop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    } catch {}
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('POST /v1/orchestrator/ci/status records CI node in workspace graph', async () => {
  const createResp = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '150',
      repoPath: process.cwd(),
      command: 'echo ci-seed',
    }),
  })
  assert.equal(createResp.status, 200)
  const createBody = await createResp.json()
  assert.equal(createBody.ok, true)

  const ciResp = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflowId: createBody.workflowId,
      provider: 'github-actions',
      status: 'failed',
      url: 'https://ci.example/run/1',
    }),
  })
  assert.equal(ciResp.status, 200)
  const ciBody = await ciResp.json()
  assert.equal(ciBody.ok, true)
  assert.ok(typeof ciBody.ciNodeId === 'string')
})

test('POST /v1/orchestrator/review/comment queues revision task', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-agentd-review-'))
  try {
    execSync('git init', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: 'ignore' })
    fs.writeFileSync(path.join(tmp, 'README.md'), '# review\n', 'utf8')
    execSync('git add README.md', { cwd: tmp, stdio: 'ignore' })
    execSync('git commit -m "init"', { cwd: tmp, stdio: 'ignore' })

    const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        issueId: '151',
        repoPath: tmp,
        branchName: 'rina/fix-151',
        command: "printf 'seed\\n' >> README.md",
      }),
    })
    assert.equal(start.status, 200)
    const startBody = await start.json()
    assert.equal(startBody.ok, true)

    const reviewResp = await fetch(`${baseUrl}/v1/orchestrator/review/comment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflowId: startBody.workflowId,
        repoPath: tmp,
        issueId: '151',
        branchName: 'rina/fix-151',
        comment: 'Please update README wording',
        command: "printf 'review update\\n' >> README.md",
        prDryRun: true,
      }),
    })
    assert.equal(reviewResp.status, 200)
    const reviewBody = await reviewResp.json()
    assert.equal(reviewBody.ok, true)
    assert.ok(typeof reviewBody.taskId === 'string')
    assert.ok(typeof reviewBody.reviewNodeId === 'string')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('POST /v1/orchestrator/ci/status with autoRetry queues revision task on failure', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-agentd-ci-auto-'))
  try {
    execSync('git init', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: 'ignore' })
    fs.writeFileSync(path.join(tmp, 'README.md'), '# ci auto\n', 'utf8')
    execSync('git add README.md', { cwd: tmp, stdio: 'ignore' })
    execSync('git commit -m "init"', { cwd: tmp, stdio: 'ignore' })

    const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        issueId: '152',
        repoPath: tmp,
        branchName: 'rina/fix-152',
        command: "printf 'seed\\n' >> README.md",
      }),
    })
    assert.equal(start.status, 200)
    const startBody = await start.json()
    assert.equal(startBody.ok, true)

    const ci = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflowId: startBody.workflowId,
        provider: 'github-actions',
        status: 'failed',
        url: 'https://ci.example/run/152',
        autoRetry: true,
        repoPath: tmp,
        issueId: '152',
        branchName: 'rina/fix-152',
        command: "printf 'ci retry\\n' >> README.md",
        prDryRun: true,
      }),
    })
    assert.equal(ci.status, 200)
    const ciBody = await ci.json()
    assert.equal(ciBody.ok, true)
    assert.ok(ciBody.autoRevision)
    assert.equal(ciBody.autoRevision.ok, true)
    assert.ok(typeof ciBody.autoRevision.taskId === 'string')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('POST /v1/orchestrator/ci/status reconciles missing workflow node', async () => {
  const workflowId = `wf_missing_${Date.now()}`
  const ciResp = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflowId,
      provider: 'github-actions',
      status: 'queued',
    }),
  })
  assert.equal(ciResp.status, 200)
  const ciBody = await ciResp.json()
  assert.equal(ciBody.ok, true)

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  const workflowNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${workflowId}`)
  assert.ok(workflowNode)
  assert.equal(workflowNode.type, 'workflow')
})

test('POST /v1/orchestrator/review/comment reconciles missing workflow state', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-agentd-review-reconcile-'))
  try {
    execSync('git init', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.email "test@example.com"', { cwd: tmp, stdio: 'ignore' })
    execSync('git config user.name "RinaWarp Test"', { cwd: tmp, stdio: 'ignore' })
    fs.writeFileSync(path.join(tmp, 'README.md'), '# reconcile\n', 'utf8')
    execSync('git add README.md', { cwd: tmp, stdio: 'ignore' })
    execSync('git commit -m "init"', { cwd: tmp, stdio: 'ignore' })

    const workflowId = `wf_review_missing_${Date.now()}`
    const reviewResp = await fetch(`${baseUrl}/v1/orchestrator/review/comment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflowId,
        repoPath: tmp,
        issueId: '199',
        branchName: 'rina/fix-199',
        comment: 'adjust wording',
        command: "printf 'reconcile\\n' >> README.md",
        prDryRun: true,
      }),
    })
    assert.equal(reviewResp.status, 200)
    const reviewBody = await reviewResp.json()
    assert.equal(reviewBody.ok, true)

    const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
    assert.equal(graphResp.status, 200)
    const graphBody = await graphResp.json()
    assert.equal(graphBody.ok, true)
    const workflowNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${workflowId}`)
    assert.ok(workflowNode)
    assert.equal(workflowNode.type, 'workflow')
    assert.equal(workflowNode.data.state, 'needs_revision')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('workflow state machine rejects invalid CI transition regression', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '260',
      repoPath: process.cwd(),
      command: 'echo transition-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const passed = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflowId: startBody.workflowId,
      provider: 'github-actions',
      status: 'passed',
    }),
  })
  assert.equal(passed.status, 200)

  const queued = await fetch(`${baseUrl}/v1/orchestrator/ci/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflowId: startBody.workflowId,
      provider: 'github-actions',
      status: 'queued',
    }),
  })
  assert.equal(queued.status, 200)

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`)
  assert.ok(wfNode)
  assert.equal(wfNode.data.state, 'verified')
  assert.ok(wfNode.data.lastTransitionRejected)
  assert.equal(wfNode.data.lastTransitionRejected.from, 'verified')
  assert.equal(wfNode.data.lastTransitionRejected.to, 'active')
})

test('POST /v1/orchestrator/github/pr-status merged marks workflow completed', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '261',
      repoPath: process.cwd(),
      command: 'echo merge-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const opened = await fetch(`${baseUrl}/v1/orchestrator/github/pr-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflowId: startBody.workflowId,
      status: 'opened',
      repoSlug: 'owner/repo',
      branchName: 'rina/fix-261',
      number: 261,
      url: 'https://github.com/owner/repo/pull/261',
      mode: 'live',
    }),
  })
  assert.equal(opened.status, 200)
  const openedBody = await opened.json()
  assert.equal(openedBody.ok, true)

  const merged = await fetch(`${baseUrl}/v1/orchestrator/github/pr-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workflowId: startBody.workflowId,
      status: 'merged',
      repoSlug: 'owner/repo',
      branchName: 'rina/fix-261',
      number: 261,
      url: 'https://github.com/owner/repo/pull/261',
      mode: 'live',
    }),
  })
  assert.equal(merged.status, 200)
  const mergedBody = await merged.json()
  assert.equal(mergedBody.ok, true)

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`)
  assert.ok(wfNode)
  assert.equal(wfNode.data.state, 'completed')
})

test('POST /v1/orchestrator/github/event maps pull_request closed+merged to completed workflow', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '262',
      repoPath: process.cwd(),
      command: 'echo webhook-pr-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const eventResp = await fetch(`${baseUrl}/v1/orchestrator/github/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event: 'pull_request',
      workflowId: startBody.workflowId,
      action: 'closed',
      merged: true,
      repoSlug: 'owner/repo',
      branchName: 'rina/fix-262',
      number: 262,
      url: 'https://github.com/owner/repo/pull/262',
      mode: 'live',
    }),
  })
  assert.equal(eventResp.status, 200)
  const eventBody = await eventResp.json()
  assert.equal(eventBody.ok, true)
  assert.equal(eventBody.mapped, 'pr_status')

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`)
  assert.ok(wfNode)
  assert.equal(wfNode.data.state, 'completed')
})

test('POST /v1/orchestrator/github/event maps ci failure to blocked state', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '263',
      repoPath: process.cwd(),
      command: 'echo webhook-ci-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const eventResp = await fetch(`${baseUrl}/v1/orchestrator/github/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event: 'ci',
      workflowId: startBody.workflowId,
      ciProvider: 'github-actions',
      ciStatus: 'failure',
      url: 'https://ci.example/runs/263',
    }),
  })
  assert.equal(eventResp.status, 200)
  const eventBody = await eventResp.json()
  assert.equal(eventBody.ok, true)
  assert.equal(eventBody.mapped, 'ci_status')

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  assert.equal(graphBody.ok, true)
  const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`)
  assert.ok(wfNode)
  assert.equal(wfNode.data.state, 'blocked')
})

test('POST /v1/orchestrator/github/webhook maps pull_request merged event', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '264',
      repoPath: process.cwd(),
      command: 'echo webhook-raw-pr-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const webhookResp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'pull_request',
      'x-github-delivery': `delivery-pr-${Date.now()}`,
    },
    body: JSON.stringify({
      workflowId: startBody.workflowId,
      repository: { full_name: 'owner/repo' },
      action: 'closed',
      pull_request: {
        number: 264,
        merged: true,
        head: { ref: 'rina/fix-264' },
        html_url: 'https://github.com/owner/repo/pull/264',
      },
    }),
  })
  assert.equal(webhookResp.status, 200)
  const webhookBody = await webhookResp.json()
  assert.equal(webhookBody.ok, true)
  assert.equal(webhookBody.mapped, 'pr_status')

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`)
  assert.ok(wfNode)
  assert.equal(wfNode.data.state, 'completed')
})

test('POST /v1/orchestrator/github/webhook maps workflow_run failure to blocked', async () => {
  const start = await fetch(`${baseUrl}/v1/orchestrator/issue-to-pr`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      issueId: '265',
      repoPath: process.cwd(),
      command: 'echo webhook-raw-ci-seed',
    }),
  })
  assert.equal(start.status, 200)
  const startBody = await start.json()
  assert.equal(startBody.ok, true)

  const webhookResp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'workflow_run',
      'x-github-delivery': `delivery-ci-${Date.now()}`,
    },
    body: JSON.stringify({
      workflowId: startBody.workflowId,
      workflow_run: {
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/owner/repo/actions/runs/265',
      },
    }),
  })
  assert.equal(webhookResp.status, 200)
  const webhookBody = await webhookResp.json()
  assert.equal(webhookBody.ok, true)
  assert.equal(webhookBody.mapped, 'ci_status')

  const graphResp = await fetch(`${baseUrl}/v1/orchestrator/workspace-graph`)
  assert.equal(graphResp.status, 200)
  const graphBody = await graphResp.json()
  const wfNode = graphBody.graph.nodes.find((n) => n.id === `workflow_${startBody.workflowId}`)
  assert.ok(wfNode)
  assert.equal(wfNode.data.state, 'blocked')
})

test('POST /v1/orchestrator/github/webhook rejects invalid signature when secret is configured', async () => {
  process.env.GITHUB_WEBHOOK_SECRET = 'test_webhook_secret'
  try {
    const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-github-delivery': `delivery-sig-bad-${Date.now()}`,
        'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      },
      body: JSON.stringify({
        workflowId: 'wf_sig_invalid',
        workflow_run: { status: 'completed', conclusion: 'success' },
      }),
    })
    assert.equal(resp.status, 401)
    const body = await resp.json()
    assert.equal(body.ok, false)
    assert.match(body.error, /invalid webhook signature/i)
  } finally {
    delete process.env.GITHUB_WEBHOOK_SECRET
  }
})

test('POST /v1/orchestrator/github/webhook accepts valid signature when secret is configured', async () => {
  process.env.GITHUB_WEBHOOK_SECRET = 'test_webhook_secret'
  try {
    const payload = JSON.stringify({
      workflowId: 'wf_sig_valid',
      workflow_run: {
        status: 'completed',
        conclusion: 'failure',
        html_url: 'https://github.com/owner/repo/actions/runs/777',
      },
    })
    const sig = createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(payload).digest('hex')
    const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-github-delivery': `delivery-sig-good-${Date.now()}`,
        'x-hub-signature-256': `sha256=${sig}`,
      },
      body: payload,
    })
    assert.equal(resp.status, 200)
    const body = await resp.json()
    assert.equal(body.ok, true)
    assert.equal(body.mapped, 'ci_status')
  } finally {
    delete process.env.GITHUB_WEBHOOK_SECRET
  }
})

test('POST /v1/orchestrator/github/webhook requires delivery id header', async () => {
  const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'workflow_run',
    },
    body: JSON.stringify({
      workflowId: 'wf_missing_delivery',
      workflow_run: { status: 'completed', conclusion: 'success' },
    }),
  })
  assert.equal(resp.status, 400)
  const body = await resp.json()
  assert.equal(body.ok, false)
  assert.match(body.error, /x-github-delivery/i)
})

test('POST /v1/orchestrator/github/webhook rejects duplicate delivery id', async () => {
  const delivery = `delivery-dup-${Date.now()}`
  const headers = {
    'content-type': 'application/json',
    'x-github-event': 'workflow_run',
    'x-github-delivery': delivery,
  }
  const payload = JSON.stringify({
    workflowId: 'wf_dup_delivery',
    workflow_run: { status: 'completed', conclusion: 'success' },
  })
  const first = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers,
    body: payload,
  })
  assert.equal(first.status, 200)
  const second = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers,
    body: payload,
  })
  assert.equal(second.status, 409)
  const secondBody = await second.json()
  assert.equal(secondBody.ok, false)
  assert.match(secondBody.error, /duplicate delivery id/i)
})

test('POST /v1/orchestrator/github/webhook requires secret in production', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  delete process.env.GITHUB_WEBHOOK_SECRET
  process.env.NODE_ENV = 'production'
  try {
    const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-github-delivery': `delivery-prod-secret-${Date.now()}`,
      },
      body: JSON.stringify({
        workflowId: 'wf_prod_missing_secret',
        workflow_run: { status: 'completed', conclusion: 'success' },
      }),
    })
    assert.equal(resp.status, 503)
    const body = await resp.json()
    assert.equal(body.ok, false)
    assert.match(body.error, /GITHUB_WEBHOOK_SECRET/i)
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  }
})

test('POST /v1/orchestrator/github/webhook rejects delivery id persisted on disk', async () => {
  const delivery = `delivery-persisted-${Date.now()}`
  const registryPath = path.join(agentHome, 'webhook-deliveries.json')
  fs.writeFileSync(
    registryPath,
    `${JSON.stringify(
      {
        version: 1,
        deliveries: { [delivery]: Date.now() },
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'workflow_run',
      'x-github-delivery': delivery,
    },
    body: JSON.stringify({
      workflowId: 'wf_persisted_delivery',
      workflow_run: { status: 'completed', conclusion: 'success' },
    }),
  })
  assert.equal(resp.status, 409)
  const body = await resp.json()
  assert.equal(body.ok, false)
  assert.match(body.error, /duplicate delivery id/i)
})

test('POST /v1/orchestrator/github/webhook enforces payload size cap', async () => {
  process.env.RINAWARP_WEBHOOK_MAX_BYTES = '2048'
  try {
    const largeComment = 'x'.repeat(5000)
    const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-github-delivery': `delivery-large-${Date.now()}`,
      },
      body: JSON.stringify({
        workflowId: 'wf_large_payload',
        workflow_run: { status: 'completed', conclusion: 'success' },
        blob: largeComment,
      }),
    })
    assert.equal(resp.status, 413)
    const body = await resp.json()
    assert.equal(body.ok, false)
    assert.match(body.error, /payload too large/i)
  } finally {
    delete process.env.RINAWARP_WEBHOOK_MAX_BYTES
  }
})

test('POST /v1/orchestrator/github/webhook enforces rate limit per client', async () => {
  process.env.RINAWARP_WEBHOOK_RATE_LIMIT_PER_WINDOW = '1'
  process.env.RINAWARP_WEBHOOK_RATE_WINDOW_MS = '60000'
  try {
    const ip = '203.0.113.10'
    const first = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        'x-github-event': 'workflow_run',
        'x-github-delivery': `delivery-rate-1-${Date.now()}`,
      },
      body: JSON.stringify({
        workflowId: 'wf_rate_limit',
        workflow_run: { status: 'completed', conclusion: 'success' },
      }),
    })
    assert.equal(first.status, 200)

    const second = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        'x-github-event': 'workflow_run',
        'x-github-delivery': `delivery-rate-2-${Date.now()}`,
      },
      body: JSON.stringify({
        workflowId: 'wf_rate_limit',
        workflow_run: { status: 'completed', conclusion: 'success' },
      }),
    })
    assert.equal(second.status, 429)
    const body = await second.json()
    assert.equal(body.ok, false)
    assert.match(body.error, /rate limit/i)
    assert.ok(second.headers.get('retry-after'))
  } finally {
    delete process.env.RINAWARP_WEBHOOK_RATE_LIMIT_PER_WINDOW
    delete process.env.RINAWARP_WEBHOOK_RATE_WINDOW_MS
  }
})

test('POST /v1/orchestrator/github/webhook writes audit trail entries', async () => {
  const auditPath = path.join(agentHome, 'webhook-audit.ndjson')
  const before = fs.existsSync(auditPath)
    ? fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean).length
    : 0

  const accepted = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'workflow_run',
      'x-github-delivery': `delivery-audit-ok-${Date.now()}`,
    },
    body: JSON.stringify({
      workflowId: 'wf_audit_ok',
      workflow_run: { status: 'completed', conclusion: 'success' },
    }),
  })
  assert.equal(accepted.status, 200)

  const rejected = await fetch(`${baseUrl}/v1/orchestrator/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'workflow_run',
      'x-github-delivery': `delivery-audit-bad-${Date.now()}`,
    },
    body: JSON.stringify({
      workflow_run: { status: 'completed', conclusion: 'success' },
    }),
  })
  assert.equal(rejected.status, 400)

  const afterLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').filter(Boolean)
  assert.ok(afterLines.length >= before + 2)
  const tail = afterLines.slice(-4).map((l) => JSON.parse(l))
  assert.ok(tail.some((e) => e.outcome === 'accepted' && e.mapped === 'ci_status'))
  assert.ok(tail.some((e) => e.outcome === 'rejected' && e.reason === 'missing_workflow_id'))
})

test('GET /v1/orchestrator/github/webhook-audit returns recent entries', async () => {
  const resp = await fetch(`${baseUrl}/v1/orchestrator/github/webhook-audit?limit=5`)
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.ok, true)
  assert.ok(Array.isArray(body.entries))
  assert.ok(typeof body.count === 'number')
  assert.ok(body.entries.length <= 5)
})

test('workspace API creates workspace and returns summary', async () => {
  const createdResp = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner',
      'x-rina-actor-email': 'owner@example.com',
      'idempotency-key': `idem-ws-1-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'backend-core', region: 'us-east-1' }),
  })
  assert.equal(createdResp.status, 200)
  const created = await createdResp.json()
  assert.ok(created.workspace_id)

  const getResp = await fetch(`${baseUrl}/v1/workspaces/${encodeURIComponent(created.workspace_id)}`, {
    headers: {
      'x-rina-actor-id': 'usr_owner',
      'x-rina-actor-email': 'owner@example.com',
    },
  })
  assert.equal(getResp.status, 200)
  const ws = await getResp.json()
  assert.equal(ws.id, created.workspace_id)
  assert.equal(ws.name, 'backend-core')
  assert.equal(ws.members, 1)
})

test('workspace invite create + accept adds member', async () => {
  const createdResp = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner2',
      'x-rina-actor-email': 'owner2@example.com',
      'idempotency-key': `idem-ws-2-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'invite-flow', region: 'us-east-1' }),
  })
  const created = await createdResp.json()
  const workspaceId = created.workspace_id
  assert.ok(workspaceId)

  const inviteResp = await fetch(`${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/invites`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner2',
      'x-rina-actor-email': 'owner2@example.com',
      'idempotency-key': `idem-invite-${Date.now()}`,
    },
    body: JSON.stringify({
      email: 'dev@example.com',
      role: 'member',
      expires_in_hours: 72,
      send_email: false,
    }),
  })
  assert.equal(inviteResp.status, 200)
  const invite = await inviteResp.json()
  assert.ok(invite.invite_token)

  const acceptResp = await fetch(`${baseUrl}/v1/invites/accept`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_dev',
      'x-rina-actor-email': 'dev@example.com',
    },
    body: JSON.stringify({ token: invite.invite_token }),
  })
  assert.equal(acceptResp.status, 200)
  const accepted = await acceptResp.json()
  assert.equal(accepted.workspace_id, workspaceId)
  assert.equal(accepted.role, 'member')

  const wsResp = await fetch(`${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}`, {
    headers: {
      'x-rina-actor-id': 'usr_dev',
      'x-rina-actor-email': 'dev@example.com',
    },
  })
  const ws = await wsResp.json()
  assert.equal(ws.members, 2)
})

test('sync push detects version conflict', async () => {
  const createdResp = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner3',
      'x-rina-actor-email': 'owner3@example.com',
      'idempotency-key': `idem-ws-3-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'sync-flow', region: 'us-east-1' }),
  })
  const created = await createdResp.json()
  const workspaceId = created.workspace_id
  assert.ok(workspaceId)

  const okPush = await fetch(`${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/sync/push`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner3',
      'x-rina-actor-email': 'owner3@example.com',
    },
    body: JSON.stringify({
      base_version: 0,
      events: [{ type: 'local_setting_changed', payload: { key: 'theme', value: 'nova' } }],
    }),
  })
  assert.equal(okPush.status, 409)

  const stateResp = await fetch(`${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/sync/state`, {
    headers: {
      'x-rina-actor-id': 'usr_owner3',
      'x-rina-actor-email': 'owner3@example.com',
    },
  })
  assert.equal(stateResp.status, 200)
  const state = await stateResp.json()

  const validPush = await fetch(`${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/sync/push`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner3',
      'x-rina-actor-email': 'owner3@example.com',
    },
    body: JSON.stringify({
      base_version: state.version,
      events: [{ type: 'local_setting_changed', payload: { key: 'font', value: 'mono' } }],
    }),
  })
  assert.equal(validPush.status, 200)
  const pushed = await validPush.json()
  assert.equal(pushed.ok, true)
  assert.ok(typeof pushed.new_version === 'number')
})

test('workspace objects API supports create/list/get/update', async () => {
  const createWs = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_obj',
      'x-rina-actor-email': 'owner-obj@example.com',
      'idempotency-key': `idem-objects-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'workspace-objects', region: 'us-east-1' }),
  })
  assert.equal(createWs.status, 200)
  const wsBody = await createWs.json()
  assert.ok(wsBody.workspace_id)
  const workspaceId = wsBody.workspace_id

  const createObj = await fetch(`${baseUrl}/v1/workspace/objects`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_obj',
      'x-rina-actor-email': 'owner-obj@example.com',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      type: 'prompt',
      name: 'Fix Bug Prompt',
      content: { system: 'You are precise', prompt: 'Fix issue 123' },
    }),
  })
  assert.equal(createObj.status, 200)
  const createObjBody = await createObj.json()
  assert.equal(createObjBody.ok, true)
  assert.ok(createObjBody.object.id)
  assert.equal(createObjBody.object.type, 'prompt')

  const objectId = createObjBody.object.id

  const listObj = await fetch(`${baseUrl}/v1/workspace/objects?workspace_id=${encodeURIComponent(workspaceId)}`, {
    headers: {
      'x-rina-actor-id': 'usr_owner_obj',
      'x-rina-actor-email': 'owner-obj@example.com',
    },
  })
  assert.equal(listObj.status, 200)
  const listObjBody = await listObj.json()
  assert.equal(listObjBody.ok, true)
  assert.ok(Array.isArray(listObjBody.objects))
  assert.ok(listObjBody.objects.some((o) => o.id === objectId))

  const getObj = await fetch(`${baseUrl}/v1/workspace/objects/${encodeURIComponent(objectId)}`, {
    headers: {
      'x-rina-actor-id': 'usr_owner_obj',
      'x-rina-actor-email': 'owner-obj@example.com',
    },
  })
  assert.equal(getObj.status, 200)
  const getObjBody = await getObj.json()
  assert.equal(getObjBody.ok, true)
  assert.equal(getObjBody.object.id, objectId)

  const updateObj = await fetch(`${baseUrl}/v1/workspace/objects/${encodeURIComponent(objectId)}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_obj',
      'x-rina-actor-email': 'owner-obj@example.com',
    },
    body: JSON.stringify({
      name: 'Fix Bug Prompt v2',
      content: { system: 'You are very precise', prompt: 'Fix issue 123 quickly' },
    }),
  })
  assert.equal(updateObj.status, 200)
  const updateObjBody = await updateObj.json()
  assert.equal(updateObjBody.ok, true)
  assert.equal(updateObjBody.object.name, 'Fix Bug Prompt v2')
  assert.ok(Number(updateObjBody.object.version) >= 2)
})

test('workflow templates API supports create/list/get/update/run', async () => {
  const createWs = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
      'idempotency-key': `idem-templates-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'workflow-templates', region: 'us-east-1' }),
  })
  assert.equal(createWs.status, 200)
  const wsBody = await createWs.json()
  const workspaceId = wsBody.workspace_id
  assert.ok(workspaceId)

  const createTpl = await fetch(`${baseUrl}/v1/workflows/templates`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      name: 'Fix Issue Template',
      description: 'Reusable issue fix flow',
      parameters: [
        { name: 'issue_id', required: true },
        { name: 'repo_path', required: true },
      ],
      steps: [
        { id: 's1', command: 'cd {{repo_path}} && git checkout -b rina/fix-{{issue_id}}' },
        { id: 's2', command: 'echo fixing {{issue_id}}' },
      ],
    }),
  })
  assert.equal(createTpl.status, 200)
  const createTplBody = await createTpl.json()
  assert.equal(createTplBody.ok, true)
  assert.ok(createTplBody.template.id)

  const templateId = createTplBody.template.id

  const listTpl = await fetch(`${baseUrl}/v1/workflows/templates?workspace_id=${encodeURIComponent(workspaceId)}`, {
    headers: {
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
    },
  })
  assert.equal(listTpl.status, 200)
  const listTplBody = await listTpl.json()
  assert.equal(listTplBody.ok, true)
  assert.ok(Array.isArray(listTplBody.templates))
  assert.ok(listTplBody.templates.some((t) => t.id === templateId))

  const getTpl = await fetch(`${baseUrl}/v1/workflows/templates/${encodeURIComponent(templateId)}`, {
    headers: {
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
    },
  })
  assert.equal(getTpl.status, 200)
  const getTplBody = await getTpl.json()
  assert.equal(getTplBody.ok, true)
  assert.equal(getTplBody.template.id, templateId)

  const updateTpl = await fetch(`${baseUrl}/v1/workflows/templates/${encodeURIComponent(templateId)}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
    },
    body: JSON.stringify({
      name: 'Fix Issue Template v2',
      description: 'Reusable issue fix flow updated',
    }),
  })
  assert.equal(updateTpl.status, 200)
  const updateTplBody = await updateTpl.json()
  assert.equal(updateTplBody.ok, true)
  assert.equal(updateTplBody.template.name, 'Fix Issue Template v2')
  assert.ok(Number(updateTplBody.template.version) >= 2)

  const runMissing = await fetch(`${baseUrl}/v1/workflows/templates/${encodeURIComponent(templateId)}/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
    },
    body: JSON.stringify({ parameters: { issue_id: '170' } }),
  })
  assert.equal(runMissing.status, 400)
  const runMissingBody = await runMissing.json()
  assert.equal(runMissingBody.ok, false)
  assert.equal(runMissingBody.error, 'missing_required_parameters')

  const runOk = await fetch(`${baseUrl}/v1/workflows/templates/${encodeURIComponent(templateId)}/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner_tpl',
      'x-rina-actor-email': 'owner-tpl@example.com',
    },
    body: JSON.stringify({
      parameters: {
        issue_id: '170',
        repo_path: '/tmp/repo-170',
      },
    }),
  })
  assert.equal(runOk.status, 200)
  const runOkBody = await runOk.json()
  assert.equal(runOkBody.ok, true)
  assert.ok(Array.isArray(runOkBody.resolved_steps))
  assert.ok(runOkBody.resolved_steps[0].command.includes('rina/fix-170'))
  assert.ok(typeof runOkBody.remote_run.id === 'string')
  assert.equal(runOkBody.remote_run.type, 'workflow_template_run')
})

test('auth login + refresh returns signed tokens when auth secret is configured', async () => {
  process.env.RINAWARP_AGENTD_AUTH_SECRET = 'auth-secret-test'
  process.env.RINAWARP_AGENTD_ADMIN_PASSWORD = 'pw123'
  try {
    const loginResp = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'pw123' }),
    })
    assert.equal(loginResp.status, 200)
    const login = await loginResp.json()
    assert.ok(login.access_token)
    assert.ok(login.refresh_token)
    assert.equal(login.expires_in, 3600)

    const refreshResp = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: login.refresh_token }),
    })
    assert.equal(refreshResp.status, 200)
    const refreshed = await refreshResp.json()
    assert.ok(refreshed.access_token)
    assert.ok(refreshed.refresh_token)
    assert.equal(refreshed.expires_in, 3600)

    const reuseResp = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: login.refresh_token }),
    })
    assert.equal(reuseResp.status, 401)
  } finally {
    delete process.env.RINAWARP_AGENTD_AUTH_SECRET
    delete process.env.RINAWARP_AGENTD_ADMIN_PASSWORD
  }
})

test('admin email config + test endpoint works in log provider mode', async () => {
  const cfgResp = await fetch(`${baseUrl}/v1/admin/email/config`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'log',
      from: 'RinaWarp <noreply@rinawarptech.com>',
    }),
  })
  assert.equal(cfgResp.status, 200)

  const testResp = await fetch(`${baseUrl}/v1/admin/email/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to: 'dev@example.com' }),
  })
  assert.equal(testResp.status, 200)
  const body = await testResp.json()
  assert.equal(body.ok, true)
  assert.equal(body.queued, true)
  assert.ok(body.job_id)
})

test('workspace creation honors idempotency-key replay', async () => {
  const key = `idem-replay-${Date.now()}`
  const headers = {
    'content-type': 'application/json',
    'x-rina-actor-id': 'usr_owner4',
    'x-rina-actor-email': 'owner4@example.com',
    'idempotency-key': key,
  }
  const first = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'idem-workspace', region: 'us-east-1' }),
  })
  assert.equal(first.status, 200)
  const firstBody = await first.json()
  assert.ok(firstBody.workspace_id)

  const second = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'idem-workspace', region: 'us-east-1' }),
  })
  assert.equal(second.status, 200)
  const secondBody = await second.json()
  assert.equal(secondBody.workspace_id, firstBody.workspace_id)
})

test('vault store/retrieve/rotate flow works', async () => {
  const create = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner5',
      'x-rina-actor-email': 'owner5@example.com',
      'idempotency-key': `idem-ws-5-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'vault-flow', region: 'us-east-1' }),
  })
  const created = await create.json()
  const workspaceId = created.workspace_id
  assert.ok(workspaceId)

  const store = await fetch(`${baseUrl}/v1/vault/store`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner5',
      'x-rina-actor-email': 'owner5@example.com',
    },
    body: JSON.stringify({ workspace_id: workspaceId, token: 'ghp_test_token' }),
  })
  assert.equal(store.status, 200)
  const stored = await store.json()
  assert.equal(stored.ok, true)
  assert.ok(stored.id)

  const retrieve = await fetch(
    `${baseUrl}/v1/vault/retrieve?id=${encodeURIComponent(stored.id)}&workspace_id=${encodeURIComponent(workspaceId)}`,
    {
      headers: {
        'x-rina-actor-id': 'usr_owner5',
        'x-rina-actor-email': 'owner5@example.com',
      },
    }
  )
  assert.equal(retrieve.status, 200)
  const recovered = await retrieve.json()
  assert.equal(recovered.ok, true)
  assert.equal(recovered.token, 'ghp_test_token')

  const rotate = await fetch(`${baseUrl}/v1/vault/rotate`, {
    method: 'POST',
    headers: {
      'x-rina-actor-id': 'usr_owner5',
      'x-rina-actor-email': 'owner5@example.com',
    },
  })
  assert.equal(rotate.status, 200)
  const rot = await rotate.json()
  assert.equal(rot.ok, true)
  assert.ok(rot.key_version >= 2)
})

test('remote-runs API supports create/list/get/log/cancel/resume', async () => {
  const createResp = await fetch(`${baseUrl}/v1/remote-runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      workspace_id: 'ws_remote_test',
      type: 'repo_watch',
      payload: { repo: process.cwd() },
    }),
  })
  assert.equal(createResp.status, 200)
  const createBody = await createResp.json()
  assert.equal(createBody.ok, true)
  assert.ok(typeof createBody.run.id === 'string')
  assert.equal(createBody.run.status, 'queued')

  const runId = createBody.run.id

  const listResp = await fetch(`${baseUrl}/v1/remote-runs?workspace_id=ws_remote_test`)
  assert.equal(listResp.status, 200)
  const listBody = await listResp.json()
  assert.equal(listBody.ok, true)
  assert.ok(Array.isArray(listBody.runs))
  assert.ok(listBody.runs.some((r) => r.id === runId))

  const getResp = await fetch(`${baseUrl}/v1/remote-runs/${encodeURIComponent(runId)}`)
  assert.equal(getResp.status, 200)
  const getBody = await getResp.json()
  assert.equal(getBody.ok, true)
  assert.equal(getBody.run.id, runId)

  const logResp = await fetch(`${baseUrl}/v1/remote-runs/${encodeURIComponent(runId)}/logs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ line: 'attached log line' }),
  })
  assert.equal(logResp.status, 200)
  const logBody = await logResp.json()
  assert.equal(logBody.ok, true)
  assert.ok(Array.isArray(logBody.run.logs))
  assert.ok(logBody.run.logs.includes('attached log line'))

  const cancelResp = await fetch(`${baseUrl}/v1/remote-runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(cancelResp.status, 200)
  const cancelBody = await cancelResp.json()
  assert.equal(cancelBody.ok, true)
  assert.equal(cancelBody.run.status, 'canceled')

  const resumeResp = await fetch(`${baseUrl}/v1/remote-runs/${encodeURIComponent(runId)}/resume`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(resumeResp.status, 200)
  const resumeBody = await resumeResp.json()
  assert.equal(resumeBody.ok, true)
  assert.equal(resumeBody.run.status, 'queued')
  assert.ok(Number(resumeBody.run.attempts) >= 1)
})

test('runtime task enforces cross-region policy', async () => {
  const create = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner6',
      'x-rina-actor-email': 'owner6@example.com',
      'idempotency-key': `idem-ws-6-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'runtime-region-flow', region: 'us-east-1' }),
  })
  const created = await create.json()
  const workspaceId = created.workspace_id
  assert.ok(workspaceId)

  const blocked = await fetch(`${baseUrl}/v1/runtime/tasks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner6',
      'x-rina-actor-email': 'owner6@example.com',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      command: 'echo hi',
      requested_region: 'eu-west-1',
      allow_cross_region: false,
    }),
  })
  assert.equal(blocked.status, 403)

  const allowed = await fetch(`${baseUrl}/v1/runtime/tasks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner6',
      'x-rina-actor-email': 'owner6@example.com',
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      command: 'echo hi',
      requested_region: 'eu-west-1',
      allow_cross_region: true,
    }),
  })
  assert.equal(allowed.status, 200)
  const scheduled = await allowed.json()
  assert.equal(scheduled.ok, true)
  assert.ok(scheduled.task?.id)
  assert.equal(scheduled.task?.max_attempts, 3)
  assert.equal(scheduled.task?.initial_delay_sec, 10)
  assert.equal(scheduled.task?.timeout_sec, 1200)
  assert.ok(Array.isArray(scheduled.task?.transitions))
  assert.equal(scheduled.task?.transitions?.[0]?.status, 'queued')
})

test('archive config/status/run endpoints work', async () => {
  const cfg = await fetch(`${baseUrl}/v1/platform/archive/config`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner7',
      'x-rina-actor-email': 'owner7@example.com',
    },
    body: JSON.stringify({ enabled: true }),
  })
  assert.equal(cfg.status, 200)

  const status = await fetch(`${baseUrl}/v1/platform/archive/status`, {
    headers: {
      'x-rina-actor-id': 'usr_owner7',
      'x-rina-actor-email': 'owner7@example.com',
    },
  })
  assert.equal(status.status, 200)
  const state = await status.json()
  assert.equal(state.ok, true)
  assert.equal(state.config.enabled, true)

  const run = await fetch(`${baseUrl}/v1/platform/archive/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner7',
      'x-rina-actor-email': 'owner7@example.com',
    },
    body: JSON.stringify({ force: true }),
  })
  const out = await run.json()
  assert.equal(out.ok, true)
  assert.ok(out.archived_file || out.error)
})

test('region health + failover endpoints work', async () => {
  const setDegraded = await fetch(`${baseUrl}/v1/platform/regions/health`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner8',
      'x-rina-actor-email': 'owner8@example.com',
    },
    body: JSON.stringify({ region: 'us-east-1', status: 'degraded' }),
  })
  assert.equal(setDegraded.status, 200)
  const out = await setDegraded.json()
  assert.equal(out.ok, true)
  assert.equal(out.region, 'us-east-1')
  assert.equal(out.status, 'degraded')

  const failover = await fetch(`${baseUrl}/v1/platform/regions/failover`, {
    method: 'POST',
    headers: {
      'x-rina-actor-id': 'usr_owner8',
      'x-rina-actor-email': 'owner8@example.com',
    },
  })
  assert.equal(failover.status, 200)
  const moved = await failover.json()
  assert.equal(moved.ok, true)
  assert.equal(typeof moved.changed, 'boolean')

  const health = await fetch(`${baseUrl}/v1/platform/regions/health`, {
    headers: {
      'x-rina-actor-id': 'usr_owner8',
      'x-rina-actor-email': 'owner8@example.com',
    },
  })
  assert.equal(health.status, 200)
  const healthBody = await health.json()
  assert.equal(healthBody.ok, true)
  assert.ok(healthBody.health?.['us-east-1'])
  assert.ok(healthBody.health?.['eu-west-1'])
})

test('attestation config/status/run endpoints work', async () => {
  const cfg = await fetch(`${baseUrl}/v1/platform/attestation/config`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner9',
      'x-rina-actor-email': 'owner9@example.com',
    },
    body: JSON.stringify({ enabled: true }),
  })
  assert.equal(cfg.status, 200)

  const status = await fetch(`${baseUrl}/v1/platform/attestation/status`, {
    headers: {
      'x-rina-actor-id': 'usr_owner9',
      'x-rina-actor-email': 'owner9@example.com',
    },
  })
  assert.equal(status.status, 200)
  const state = await status.json()
  assert.equal(state.ok, true)
  assert.equal(state.config.enabled, true)

  const run = await fetch(`${baseUrl}/v1/platform/attestation/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner9',
      'x-rina-actor-email': 'owner9@example.com',
    },
    body: JSON.stringify({ force: true }),
  })
  assert.equal(run.status, 200)
  const out = await run.json()
  assert.equal(out.ok, true)
  assert.ok(out.record_hash)

  const verify = await fetch(`${baseUrl}/v1/platform/attestation/verify`, {
    method: 'POST',
    headers: {
      'x-rina-actor-id': 'usr_owner9',
      'x-rina-actor-email': 'owner9@example.com',
    },
  })
  assert.equal(verify.status, 200)
  const checked = await verify.json()
  assert.equal(checked.ok, true)
})

test('traffic manager config/status/reconcile endpoints work', async () => {
  const cfg = await fetch(`${baseUrl}/v1/platform/traffic/config`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner10',
      'x-rina-actor-email': 'owner10@example.com',
    },
    body: JSON.stringify({
      enabled: false,
      hosted_zone_id: 'Z123',
      record_name: 'app.example.com',
      primary_dns: 'app-use1.example.com',
      secondary_dns: 'app-euw1.example.com',
      ttl: 30,
    }),
  })
  assert.equal(cfg.status, 200)

  const status = await fetch(`${baseUrl}/v1/platform/traffic/status`, {
    headers: {
      'x-rina-actor-id': 'usr_owner10',
      'x-rina-actor-email': 'owner10@example.com',
    },
  })
  assert.equal(status.status, 200)
  const st = await status.json()
  assert.equal(st.ok, true)
  assert.equal(st.config.record_name, 'app.example.com')

  const reconcile = await fetch(`${baseUrl}/v1/platform/traffic/reconcile`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner10',
      'x-rina-actor-email': 'owner10@example.com',
    },
    body: JSON.stringify({ force: false }),
  })
  assert.equal(reconcile.status, 400)
  const out = await reconcile.json()
  assert.equal(out.ok, false)
})

test('health probes config/status/run endpoints work', async () => {
  const cfg = await fetch(`${baseUrl}/v1/platform/health-probes/config`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner11',
      'x-rina-actor-email': 'owner11@example.com',
    },
    body: JSON.stringify({
      enabled: true,
      auto_failover: true,
      timeout_ms: 250,
      probes: {
        'us-east-1': [{ url: 'http://127.0.0.1:9/health', class: 'app', weight: 1 }],
        'eu-west-1': [],
      },
      policy: {
        consecutive_failures_for_degraded: 1,
        consecutive_failures_for_down: 1,
        consecutive_successes_for_healthy: 1,
        failover_cooldown_sec: 0,
        per_class_min_ratio: { app: 1, db: 1, queue: 0.5, 'control-plane': 1 },
      },
      discovery: {
        enabled: true,
        source: 'k8s-services',
        regions: {
          'us-east-1': [
            { namespace: 'default', label_selector: 'app=rinawarp', path: '/health', class: 'app', weight: 1 },
          ],
          'eu-west-1': [],
        },
      },
    }),
  })
  assert.equal(cfg.status, 200)

  const status = await fetch(`${baseUrl}/v1/platform/health-probes/status`, {
    headers: {
      'x-rina-actor-id': 'usr_owner11',
      'x-rina-actor-email': 'owner11@example.com',
    },
  })
  assert.equal(status.status, 200)
  const st = await status.json()
  assert.equal(st.ok, true)
  assert.equal(st.config.enabled, true)
  assert.equal(st.config.discovery.enabled, true)

  const run = await fetch(`${baseUrl}/v1/platform/health-probes/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner11',
      'x-rina-actor-email': 'owner11@example.com',
    },
    body: JSON.stringify({ force: false }),
  })
  assert.equal(run.status, 200)
  const out = await run.json()
  assert.equal(out.ok, true)
  assert.ok(out.regions?.['us-east-1'])
  assert.ok(out.regions?.['eu-west-1'])
  assert.ok(['healthy', 'degraded', 'down'].includes(out.regions?.['us-east-1']?.status))
  if (out.traffic_reconcile) {
    assert.equal(typeof out.traffic_reconcile.ok, 'boolean')
  }
})

test('retrieval config/status/benchmark endpoints work', async () => {
  const cfg = await fetch(`${baseUrl}/v1/platform/retrieval/config`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner12',
      'x-rina-actor-email': 'owner12@example.com',
    },
    body: JSON.stringify({ mode: 'index' }),
  })
  assert.equal(cfg.status, 200)

  const status = await fetch(`${baseUrl}/v1/platform/retrieval/status`, {
    headers: {
      'x-rina-actor-id': 'usr_owner12',
      'x-rina-actor-email': 'owner12@example.com',
    },
  })
  assert.equal(status.status, 200)
  const st = await status.json()
  assert.equal(st.ok, true)
  assert.equal(st.config.mode, 'index')

  const benchmark = await fetch(`${baseUrl}/v1/platform/retrieval/benchmark`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rina-actor-id': 'usr_owner12',
      'x-rina-actor-email': 'owner12@example.com',
    },
    body: JSON.stringify({
      query: 'createServer',
      repo_path: process.cwd(),
      limit: 3,
    }),
  })
  assert.equal(benchmark.status, 200)
  const out = await benchmark.json()
  assert.equal(out.ok, true)
  assert.equal(out.mode, 'index')
  assert.ok(Number.isFinite(out.latency_ms))
  assert.ok(Array.isArray(out.sample))
})

test('research config/status/fetch endpoints enforce allowlist and return citation bundle', async () => {
  const docsServer = createHttpServer((req, res) => {
    if (req.url === '/docs') {
      res.statusCode = 200
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(
        '<html><head><title>RinaWarp Docs</title></head><body><h1>Setup</h1><p>Install and run tests.</p></body></html>'
      )
      return
    }
    res.statusCode = 404
    res.end('not found')
  })
  await new Promise((resolve) => docsServer.listen(0, '127.0.0.1', resolve))
  const addr = docsServer.address()
  const docsUrl = `http://127.0.0.1:${addr.port}/docs`

  try {
    const cfg = await fetch(`${baseUrl}/v1/platform/research/config`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-rina-actor-id': 'usr_owner13',
        'x-rina-actor-email': 'owner13@example.com',
      },
      body: JSON.stringify({
        enabled: true,
        allowed_domains: ['127.0.0.1'],
        timeout_ms: 2000,
        max_bytes: 2048,
        max_excerpt_chars: 120,
      }),
    })
    assert.equal(cfg.status, 200)

    const status = await fetch(`${baseUrl}/v1/platform/research/status`, {
      headers: {
        'x-rina-actor-id': 'usr_owner13',
        'x-rina-actor-email': 'owner13@example.com',
      },
    })
    assert.equal(status.status, 200)
    const st = await status.json()
    assert.equal(st.ok, true)
    assert.equal(st.config.enabled, true)
    assert.deepEqual(st.config.allowed_domains, ['127.0.0.1'])

    const blocked = await fetch(`${baseUrl}/v1/platform/research/fetch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rina-actor-id': 'usr_owner13',
        'x-rina-actor-email': 'owner13@example.com',
      },
      body: JSON.stringify({ url: 'https://example.com/docs' }),
    })
    assert.equal(blocked.status, 400)

    const ok = await fetch(`${baseUrl}/v1/platform/research/fetch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rina-actor-id': 'usr_owner13',
        'x-rina-actor-email': 'owner13@example.com',
      },
      body: JSON.stringify({ url: docsUrl }),
    })
    assert.equal(ok.status, 200)
    const out = await ok.json()
    assert.equal(out.ok, true)
    assert.equal(out.status_code, 200)
    assert.equal(typeof out.url, 'string')
    assert.equal(Array.isArray(out.citations), true)
    assert.equal(out.citations.length, 1)
    assert.equal(out.citations[0].title, 'RinaWarp Docs')
    assert.ok(out.citations[0].excerpt.includes('Install and run tests'))
  } finally {
    await new Promise((resolve) => docsServer.close(resolve))
  }
})

test('active-active write enforces vector conflict and replay drill surfaces drift status', async () => {
  const h = {
    'content-type': 'application/json',
    'x-rina-actor-id': 'usr_owner12',
    'x-rina-actor-email': 'owner12@example.com',
  }
  const wsResp = await fetch(`${baseUrl}/v1/workspaces`, {
    method: 'POST',
    headers: {
      ...h,
      'idempotency-key': `aa-${Date.now()}`,
    },
    body: JSON.stringify({ name: 'aa-ws', region: 'us-east-1' }),
  })
  assert.equal(wsResp.status, 200)
  const ws = await wsResp.json()
  const workspaceId = ws.workspace_id

  const first = await fetch(`${baseUrl}/v1/platform/active-active/write`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      workspace_id: workspaceId,
      region: 'us-east-1',
      base_vector: { 'us-east-1': 0, 'eu-west-1': 0 },
      mutations: [{ type: 'task_created', entity: 'task:1' }],
    }),
  })
  assert.equal(first.status, 200)
  const firstBody = await first.json()
  assert.equal(firstBody.ok, true)

  const second = await fetch(`${baseUrl}/v1/platform/active-active/write`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      workspace_id: workspaceId,
      region: 'eu-west-1',
      base_vector: { 'us-east-1': 0, 'eu-west-1': 0 },
      mutations: [{ type: 'task_created', entity: 'task:2' }],
    }),
  })
  assert.equal(second.status, 409)
  const secondBody = await second.json()
  assert.equal(secondBody.ok, false)
  assert.equal(secondBody.error, 'conflict')

  const drill = await fetch(`${baseUrl}/v1/platform/active-active/replication/drill`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ workspace_id: workspaceId }),
  })
  assert.equal(drill.status, 200)
  const drillBody = await drill.json()
  assert.equal(drillBody.ok, true)
  assert.equal(drillBody.checked, 1)
})

test('reconciler/security control endpoints run and return evidence summary', async () => {
  const h = {
    'content-type': 'application/json',
    'x-rina-actor-id': 'usr_owner13',
    'x-rina-actor-email': 'owner13@example.com',
  }
  const cfg = await fetch(`${baseUrl}/v1/platform/reconciler/config`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({
      enabled: true,
      runtime_queue_stuck_after_sec: 60,
      runtime_running_stuck_grace_sec: 30,
      runtime_auto_remediate: true,
      max_runtime_remediations: 5,
      archive_interval_sec: 60,
    }),
  })
  assert.equal(cfg.status, 200)
  const run = await fetch(`${baseUrl}/v1/platform/reconciler/run`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ force: false }),
  })
  assert.ok([200, 409].includes(run.status))
  const runBody = await run.json()
  assert.equal(typeof runBody.runtime?.scanned, 'number')
  assert.equal(typeof runBody.traffic?.ok, 'boolean')

  const secCfg = await fetch(`${baseUrl}/v1/platform/security/controls/config`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({ mtls_mode: 'strict', mesh_provider: 'istio', evidence_interval_sec: 60 }),
  })
  assert.equal(secCfg.status, 200)
  const drill = await fetch(`${baseUrl}/v1/platform/security/controls/drill`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ force: true }),
  })
  assert.ok([200, 409].includes(drill.status))
  const drillBody = await drill.json()
  assert.equal(typeof drillBody.mtls?.ok, 'boolean')
  assert.equal(typeof drillBody.replication?.ok, 'boolean')
  assert.equal(typeof drillBody.token_lifecycle?.ok, 'boolean')
})

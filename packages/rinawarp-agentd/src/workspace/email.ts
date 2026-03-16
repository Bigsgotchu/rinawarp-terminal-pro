import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { paths } from '../daemon/state.js'

type EmailProvider = 'smtp' | 'sendmail' | 'log'

type EmailConfig = {
  provider: EmailProvider
  host?: string
  port?: number
  username?: string
  password?: string
  from?: string
  updatedAt: string
}

type EmailQueueJob = {
  id: string
  to: string
  subject: string
  text: string
  attempts: number
  nextAttemptAt: number
  createdAt: string
}

function emailConfigFile(): string {
  return path.join(paths().baseDir, 'email-config.json')
}

function emailOutboxFile(): string {
  return path.join(paths().baseDir, 'email-outbox.ndjson')
}

function emailQueueFile(): string {
  return path.join(paths().baseDir, 'email-queue.json')
}

function emailDlqFile(): string {
  return path.join(paths().baseDir, 'email-dlq.ndjson')
}

export function getEmailConfig(): EmailConfig | null {
  const fp = emailConfigFile()
  if (!fs.existsSync(fp)) return null
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8')) as EmailConfig
  } catch {
    return null
  }
}

export function setEmailConfig(config: {
  provider?: EmailProvider
  host?: string
  port?: number
  username?: string
  password?: string
  from?: string
}): EmailConfig {
  const merged: EmailConfig = {
    provider: config.provider || 'log',
    host: config.host?.trim() || undefined,
    port: Number.isFinite(config.port) ? Number(config.port) : undefined,
    username: config.username?.trim() || undefined,
    password: config.password ? String(config.password) : undefined,
    from: config.from?.trim() || 'RinaWarp <noreply@rinawarptech.com>',
    updatedAt: new Date().toISOString(),
  }
  const fp = emailConfigFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  return merged
}

function maskConfig(config: EmailConfig) {
  return {
    provider: config.provider,
    host: config.host || null,
    port: config.port || null,
    username: config.username || null,
    password: config.password ? '***' : null,
    from: config.from || null,
    updatedAt: config.updatedAt,
  }
}

export function getMaskedEmailConfig() {
  const cfg = getEmailConfig()
  return cfg ? maskConfig(cfg) : null
}

function appendOutbox(entry: Record<string, unknown>): void {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`
  const fp = emailOutboxFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.appendFileSync(fp, line, 'utf8')
}

function appendDlq(entry: Record<string, unknown>): void {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`
  const fp = emailDlqFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.appendFileSync(fp, line, 'utf8')
}

function readQueue(): EmailQueueJob[] {
  const fp = emailQueueFile()
  if (!fs.existsSync(fp)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as { jobs?: EmailQueueJob[] }
    return Array.isArray(parsed.jobs) ? parsed.jobs : []
  } catch {
    return []
  }
}

function writeQueue(jobs: EmailQueueJob[]) {
  const fp = emailQueueFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify({ jobs }, null, 2)}\n`, 'utf8')
}

function sendViaSendmail(message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('sendmail', ['-t', '-i'], { stdio: ['pipe', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '')
    })
    child.on('error', (err) => reject(err))
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `sendmail exit code ${code}`))
    })
    child.stdin.write(message)
    child.stdin.end()
  })
}

export async function sendEmail(args: {
  to: string
  subject: string
  text: string
}): Promise<{ ok: boolean; provider: string; error?: string }> {
  const cfg = getEmailConfig() || setEmailConfig({ provider: 'log' })
  const from = cfg.from || 'RinaWarp <noreply@rinawarptech.com>'
  const message = [
    `From: ${from}`,
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    args.text,
    '',
  ].join('\n')

  if (cfg.provider === 'sendmail' || cfg.provider === 'smtp') {
    try {
      await sendViaSendmail(message)
      appendOutbox({
        outcome: 'sent',
        provider: cfg.provider,
        to: args.to,
        subject: args.subject,
      })
      return { ok: true, provider: cfg.provider }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      appendOutbox({
        outcome: 'failed',
        provider: cfg.provider,
        to: args.to,
        subject: args.subject,
        error: messageText,
      })
      return { ok: false, provider: cfg.provider, error: messageText }
    }
  }

  appendOutbox({
    outcome: 'logged',
    provider: 'log',
    to: args.to,
    subject: args.subject,
    body_preview: args.text.slice(0, 180),
  })
  return { ok: true, provider: 'log' }
}

export function enqueueEmail(args: { to: string; subject: string; text: string }): { ok: true; job_id: string } {
  const jobs = readQueue()
  const job: EmailQueueJob = {
    id: `emj_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: new Date().toISOString(),
  }
  jobs.push(job)
  writeQueue(jobs)
  return { ok: true, job_id: job.id }
}

let workerStarted = false
let workerTimer: NodeJS.Timeout | null = null

async function processQueueOnce(): Promise<void> {
  const jobs = readQueue()
  if (!jobs.length) return
  const now = Date.now()
  const kept: EmailQueueJob[] = []
  for (const job of jobs) {
    if (job.nextAttemptAt > now) {
      kept.push(job)
      continue
    }
    const res = await sendEmail({
      to: job.to,
      subject: job.subject,
      text: job.text,
    })
    if (res.ok) continue
    const attempts = job.attempts + 1
    if (attempts >= 5) {
      appendDlq({
        job_id: job.id,
        to: job.to,
        subject: job.subject,
        error: res.error || 'send_failed',
        attempts,
      })
      continue
    }
    const backoffSec = Math.min(600, Math.pow(2, attempts) * 5)
    kept.push({
      ...job,
      attempts,
      nextAttemptAt: Date.now() + backoffSec * 1000,
    })
  }
  writeQueue(kept)
}

export function startEmailWorker(): void {
  if (workerStarted) return
  workerStarted = true
  workerTimer = setInterval(() => {
    processQueueOnce().catch(() => {
      // swallow worker loop errors
    })
  }, 2000)
  if (workerTimer.unref) workerTimer.unref()
}

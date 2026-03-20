import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { redactText } from '@rinawarp/safety/redaction'

export type AgentProfile = {
  id: string
  name: string
  fs: {
    allowedReadRoots: string[]
    allowedWriteRoots: string[]
    denyWriteGlobs: string[]
    requireApprovalFor: {
      write: boolean
      sensitiveWrites: boolean
    }
  }
  cmd: {
    allowInteractive: boolean
    requireApprovalForWriteRisk: boolean
  }
  net: {
    allow: boolean
    allowDomains: string[]
  }
}

export type CommandRisk = 'read' | 'safe-write' | 'high-impact'

export type GateResult =
  | { ok: true }
  | {
      ok: false
      reason: string
      message: string
      requires?: 'click' | 'typed_yes' | { typed_phrase: string }
    }

export function canonicalize(p: string): string {
  const resolved = path.resolve(p)
  try {
    return fs.realpathSync.native(resolved)
  } catch {
    return resolved
  }
}

export function withinRoot(p: string, root: string): boolean {
  const rr = canonicalize(root)
  const pp = canonicalize(p)
  if (pp === rr) return true
  const rel = path.relative(rr, pp)
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

function looksSensitivePath(filePath: string): boolean {
  const p = filePath.toLowerCase()
  return (
    p.endsWith('.env') ||
    p.includes('.ssh') ||
    p.includes('id_rsa') ||
    p.includes('id_ed25519') ||
    p.includes('known_hosts') ||
    p.includes('credentials') ||
    p.includes('secret') ||
    p.endsWith('.pem') ||
    p.endsWith('.p12') ||
    p.endsWith('.key')
  )
}

function matchesDenyGlob(p: string, deny: string[]): boolean {
  const s = p.toLowerCase()
  return deny.some((g) => {
    const gg = g.toLowerCase().trim()
    if (!gg) return false
    if (gg.startsWith('*.')) return s.endsWith(gg.slice(1))
    if (gg.startsWith('*')) return s.includes(gg.slice(1))
    return s.endsWith(gg) || s.includes(gg)
  })
}

export function defaultProfileForProject(projectRoot: string): AgentProfile {
  const root = canonicalize(projectRoot)
  return {
    id: 'default-safe',
    name: 'Default (Safe)',
    fs: {
      allowedReadRoots: [root],
      allowedWriteRoots: [root],
      denyWriteGlobs: ['*.env', '*.pem', '*.key', '*.p12', '*id_rsa*', '*id_ed25519*', '*credentials*'],
      requireApprovalFor: { write: true, sensitiveWrites: true },
    },
    cmd: {
      allowInteractive: false,
      requireApprovalForWriteRisk: true,
    },
    net: {
      allow: false,
      allowDomains: [],
    },
  }
}

export function gateCommandRun(args: {
  profile: AgentProfile
  command: string
  risk: CommandRisk
  confirmed: boolean
  confirmationText: string
}): GateResult {
  const { profile, command, risk, confirmed } = args
  const normalizedCommand = command.trim()
  const interactiveLikely =
    /\b(top|htop|vim|nvim|nano|less|more|ssh|sftp|ftp|irb|rails\s+c|mysql|psql)\b/i.test(normalizedCommand) ||
    /^(python|python3|node)\s*$/i.test(normalizedCommand)
  if (interactiveLikely && !profile.cmd.allowInteractive) {
    return { ok: false, reason: 'interactive_disabled', message: 'Agent profile blocks interactive commands.' }
  }
  if (risk === 'high-impact' && profile.cmd.requireApprovalForWriteRisk && !confirmed) {
    return {
      ok: false,
      reason: 'approval_required',
      message: 'Approval required for high-impact command.',
      requires: 'click',
    }
  }
  return { ok: true }
}

export function gateFileRead(profile: AgentProfile, filePath: string): GateResult {
  const p = canonicalize(filePath)
  const ok = profile.fs.allowedReadRoots.some((r) => withinRoot(p, r))
  if (!ok) return { ok: false, reason: 'read_outside_root', message: 'Read blocked: outside allowed roots.' }
  return { ok: true }
}

export function gateFileWrite(args: {
  profile: AgentProfile
  filePath: string
  confirmed: boolean
  confirmationText: string
}): GateResult {
  const { profile, filePath, confirmed, confirmationText } = args
  const p = canonicalize(filePath)

  const inRoot = profile.fs.allowedWriteRoots.some((r) => withinRoot(p, r))
  if (!inRoot) {
    return { ok: false, reason: 'write_outside_root', message: 'Write blocked: outside allowed roots.' }
  }
  if (matchesDenyGlob(p, profile.fs.denyWriteGlobs)) {
    return {
      ok: false,
      reason: 'write_denied_pattern',
      message: 'Write blocked: sensitive file pattern.',
      requires: { typed_phrase: 'I UNDERSTAND SENSITIVE WRITE' },
    }
  }
  if (
    looksSensitivePath(p) &&
    profile.fs.requireApprovalFor.sensitiveWrites &&
    confirmationText !== 'I UNDERSTAND SENSITIVE WRITE'
  ) {
    return {
      ok: false,
      reason: 'sensitive_write_phrase',
      message: 'Typed phrase required: "I UNDERSTAND SENSITIVE WRITE"',
      requires: { typed_phrase: 'I UNDERSTAND SENSITIVE WRITE' },
    }
  }
  if (profile.fs.requireApprovalFor.write && !confirmed) {
    return { ok: false, reason: 'write_requires_approval', message: 'Write requires approval.', requires: 'click' }
  }
  return { ok: true }
}

export function sanitizeRulesText(raw: string): string {
  return redactText(String(raw ?? '')).redactedText
}

export function approvalScopeForCommand(command: string): string {
  return `cmd:${crypto.createHash('sha256').update(command).digest('hex').slice(0, 12)}`
}

export function summarizeProfile(profile: AgentProfile): string {
  const writeMode = profile.fs.requireApprovalFor.write ? 'approval-required' : 'allowed'
  const interactive = profile.cmd.allowInteractive ? 'enabled' : 'disabled'
  const network = profile.net.allow ? 'enabled' : 'disabled'
  return `Profile=${profile.name}; interactive=${interactive}; write=${writeMode}; network=${network}.`
}

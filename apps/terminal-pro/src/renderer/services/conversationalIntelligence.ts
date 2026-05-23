import { planRinaTask } from '../../rina-agent/agentPlanner'
import type { RinaTaskRequest } from '../../rina-agent/types'

type WorkspaceFileApi = {
  getStatus?: () => Promise<unknown>
  workspaceDefault?: () => Promise<{ ok: boolean; path?: string }>
  codeListFiles?: (args?: { projectRoot?: string; limit?: number; query?: string }) => Promise<{ ok: boolean; files?: string[]; error?: string }>
  codeReadFile?: (args: { projectRoot?: string; relativePath: string; maxBytes?: number }) => Promise<{ ok: boolean; content?: string; truncated?: boolean; error?: string }>
}

type PackageInfo = {
  name?: string
  description?: string
  scripts: Record<string, string>
  dependencies: string[]
  devDependencies: string[]
}

type RepoSnapshot = {
  workspaceRoot: string | null
  files: string[]
  packageInfo: PackageInfo | null
  readmeSummary: string | null
}

const DANGEROUS_ACTION_PATTERNS = [
  /\bdelete\b.*\b(?:home directory|home folder|entire home|~\/?|\/home)\b/i,
  /\bremove\b.*\b(?:home directory|home folder|entire home|~\/?|\/home)\b/i,
  /\brm\s+-rf\s+(?:\/|~|~\/|\$HOME|\/home\b)/i,
  /\bsudo\s+rm\s+-rf\b/i,
  /\b(?:wipe|format|erase)\b.*\b(?:disk|drive|filesystem|computer|machine)\b/i,
  /\bmkfs(?:\.[a-z0-9]+)?\b/i,
  /\bdd\s+if=.*\bof=\/dev\//i,
  /\bdocker\s+(?:volume|system)\s+prune\b.*\b(?:--force|-f)\b/i,
  /\bdestroy\b.*\b(?:docker volumes|database|production|all data)\b/i,
  /\b(?:steal|exfiltrate|dump|print)\b.*\b(?:credentials|passwords|tokens|secrets|ssh keys|api keys)\b/i,
]

export function isDangerousActionPrompt(prompt: string): boolean {
  return DANGEROUS_ACTION_PATTERNS.some((pattern) => pattern.test(prompt))
}

export function dangerousActionRefusal(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (/\bhome\b|~|\$HOME|\/home/.test(lower)) {
    return "I can't help delete your home directory because that would be destructive and unsafe.\n\nRina only performs approved actions intended to recover or improve your development environment safely."
  }
  if (/\bcredentials|passwords|tokens|secrets|ssh keys|api keys\b/.test(lower)) {
    return "I can't help extract credentials, tokens, passwords, or secrets. That would put your accounts and systems at risk.\n\nI can help inspect configuration safely, redact sensitive values, or explain how to rotate exposed credentials."
  }
  return "I can't help with that destructive action because it could permanently damage your system or data.\n\nRina only performs approved actions intended to recover or improve your development environment safely."
}

export function isRepoUnderstandingPrompt(prompt: string): boolean {
  return [
    /\bwhat does (?:this|the) project do\b/i,
    /\bexplain (?:this|the)?\s*architecture\b/i,
    /\bhow (?:do i|to) (?:run|start) (?:this|the)?\s*(?:app|project)?\b/i,
    /\bwhat are (?:the )?main packages\b/i,
    /\bwhere is (?:authentication|auth) handled\b/i,
  ].some((pattern) => pattern.test(prompt))
}

export function unsupportedCapabilityResponse(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (/\bbuild\b|\bnpm run\b|\bpnpm build\b|\btest failed\b/.test(lower)) {
    return "I don't yet support full build recovery in this chat workflow, but I can still help safely.\n\nNext I can inspect the workspace, read `package.json`, identify the build command, and look at the exact build log before proposing any fix. I won't install packages, edit files, or mutate the repo without approval."
  }
  if (/\bdeploy|release|publish|rollback\b/.test(lower)) {
    return "I don't yet support full deployment recovery from this chat workflow.\n\nI can still inspect the workspace for deploy scripts and configuration, then explain what looks ready and what needs a safer release path."
  }
  return "I don't have a complete workflow for that yet, but I can still stay useful.\n\nI can inspect disk usage, check a port, summarize this repo, explain how to run it, or look at build logs before suggesting any safe next step."
}

export function buildFailedBuildPreview(request: RinaTaskRequest, packageManager: 'pnpm' | 'npm' = 'pnpm'): string {
  const plan = planRinaTask(request, 'failed_build', { packageManager })
  const readSteps = plan.readOnlyCommands.map((step) => `- \`${step.command}\`: ${step.reason}`).join('\n')
  const approvalSteps = plan.proposedActions.map((step) => `- \`${step.command}\`: ${step.reason}`).join('\n')
  return [
    "I can help with the failing build, but I need evidence before proposing a fix.",
    '',
    "Safe inspection I can do first:",
    readSteps,
    '',
    "If the evidence points to missing dependencies, the first approval-gated fix would be:",
    approvalSteps || '- No write action yet.',
    '',
    "I won't install packages, edit files, or change the repo without approval.",
  ].join('\n')
}

async function resolveWorkspaceRoot(api: WorkspaceFileApi): Promise<string | null> {
  try {
    const status = await api.getStatus?.()
    const root = typeof (status as { workspaceRoot?: unknown } | null)?.workspaceRoot === 'string'
      ? String((status as { workspaceRoot: string }).workspaceRoot).trim()
      : ''
    if (root) return root
  } catch {}

  try {
    const workspace = await api.workspaceDefault?.()
    return workspace?.ok && workspace.path ? workspace.path : null
  } catch {
    return null
  }
}

async function readText(api: WorkspaceFileApi, workspaceRoot: string | null, relativePath: string, maxBytes = 12_000): Promise<string | null> {
  try {
    const result = await api.codeReadFile?.({ projectRoot: workspaceRoot || undefined, relativePath, maxBytes })
    return result?.ok && typeof result.content === 'string' ? result.content : null
  } catch {
    return null
  }
}

function parsePackageJson(contents: string | null): PackageInfo | null {
  if (!contents) return null
  try {
    const parsed = JSON.parse(contents) as Record<string, any>
    return {
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      scripts: parsed.scripts && typeof parsed.scripts === 'object' ? parsed.scripts : {},
      dependencies: Object.keys(parsed.dependencies || {}),
      devDependencies: Object.keys(parsed.devDependencies || {}),
    }
  } catch {
    return null
  }
}

function summarizeReadme(contents: string | null): string | null {
  if (!contents) return null
  const lines = contents
    .split(/\r?\n/g)
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter((line) => line && !/^[-=*`<>{}[\]]+$/.test(line))
  return lines.slice(0, 3).join(' ')
}

async function buildSnapshot(api: WorkspaceFileApi): Promise<RepoSnapshot> {
  const workspaceRoot = await resolveWorkspaceRoot(api)
  const listed = await api.codeListFiles?.({ projectRoot: workspaceRoot || undefined, limit: 80 }).catch(() => null)
  const files = listed?.ok && Array.isArray(listed.files) ? listed.files : []
  const packageInfo = parsePackageJson(await readText(api, workspaceRoot, 'package.json'))
  const readmePath = files.find((file) => /^readme(?:\.[a-z0-9_-]+)?$/i.test(file)) || 'README.md'
  const readmeSummary = summarizeReadme(await readText(api, workspaceRoot, readmePath))
  return { workspaceRoot, files, packageInfo, readmeSummary }
}

function packageManagerFromFiles(files: string[]): 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown' {
  if (files.includes('pnpm-lock.yaml')) return 'pnpm'
  if (files.includes('package-lock.json')) return 'npm'
  if (files.includes('yarn.lock')) return 'yarn'
  if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun'
  return 'unknown'
}

function runCommand(manager: ReturnType<typeof packageManagerFromFiles>, script: string): string {
  if (manager === 'pnpm') return `pnpm ${script}`
  if (manager === 'yarn') return `yarn ${script}`
  if (manager === 'bun') return `bun run ${script}`
  return script === 'start' ? 'npm start' : `npm run ${script}`
}

export async function repoUnderstandingResponse(prompt: string, api: WorkspaceFileApi): Promise<string> {
  const snapshot = await buildSnapshot(api)
  const pkg = snapshot.packageInfo
  const scripts = pkg?.scripts || {}
  const scriptNames = Object.keys(scripts)
  const manager = packageManagerFromFiles(snapshot.files)
  const lower = prompt.toLowerCase()
  const topDirs = Array.from(new Set(snapshot.files.filter((file) => file.includes('/')).map((file) => file.split('/')[0]))).slice(0, 8)
  const notableFiles = snapshot.files.slice(0, 12).map((file) => `\`${file}\``).join(', ')

  if (/\bhow (?:do i|to) (?:run|start)\b/.test(lower)) {
    const script = ['dev', 'start', 'serve', 'preview'].find((name) => scripts[name]) || null
    return script
      ? `This project can likely run through \`${script}\`: \`${scripts[script]}\`.\n\nUse \`${runCommand(manager, script)}\`. I found this by reading \`package.json\`; I did not run or change anything.`
      : `I inspected \`package.json\`, but I don't see a clear \`dev\`, \`start\`, \`serve\`, or \`preview\` script. Visible scripts: ${scriptNames.length ? scriptNames.map((name) => `\`${name}\``).join(', ') : 'none'}.`
  }

  if (/\bmain packages|packages\b/.test(lower)) {
    const deps = pkg?.dependencies.slice(0, 12) || []
    const devDeps = pkg?.devDependencies.slice(0, 12) || []
    return [
      pkg?.name ? `For \`${pkg.name}\`, I inspected \`package.json\`.` : 'I inspected `package.json`.',
      deps.length ? `Runtime packages: ${deps.map((name) => `\`${name}\``).join(', ')}.` : "I don't see runtime dependencies.",
      devDeps.length ? `Development packages: ${devDeps.map((name) => `\`${name}\``).join(', ')}.` : "I don't see development dependencies.",
    ].join(' ')
  }

  if (/\bauth(?:entication)?\b/.test(lower)) {
    const authFiles = snapshot.files.filter((file) => /\bauth\b|login|session|token|license/i.test(file)).slice(0, 12)
    const authDeps = [...(pkg?.dependencies || []), ...(pkg?.devDependencies || [])].filter((name) => /auth|oauth|passport|clerk|next-auth|supabase|firebase|stripe|jwt/i.test(name))
    return [
      'I inspected the visible file tree and package metadata for authentication signals.',
      authFiles.length ? `Likely auth-related files: ${authFiles.map((file) => `\`${file}\``).join(', ')}.` : "I don't see obvious auth-named files in the shallow file list.",
      authDeps.length ? `Auth-adjacent packages: ${authDeps.map((name) => `\`${name}\``).join(', ')}.` : "I don't see obvious auth packages in `package.json`.",
      'I did not open secrets or execute anything.',
    ].join(' ')
  }

  if (/\barchitecture|structured\b/.test(lower)) {
    return [
      pkg?.name ? `Architecture overview for \`${pkg.name}\`.` : 'Architecture overview from the visible workspace files.',
      topDirs.length ? `Main top-level areas: ${topDirs.map((dir) => `\`${dir}/\``).join(', ')}.` : null,
      scriptNames.length ? `Scripts include ${scriptNames.slice(0, 8).map((name) => `\`${name}\``).join(', ')}.` : "I didn't find package scripts.",
      notableFiles ? `Representative files: ${notableFiles}.` : null,
      'This is read-only repo understanding; no files were changed.',
    ].filter(Boolean).join(' ')
  }

  return [
    pkg?.name ? `This project appears to be \`${pkg.name}\`.` : 'I inspected this workspace to understand what it is.',
    pkg?.description || snapshot.readmeSummary || 'I could not find a README summary or package description.',
    scriptNames.length ? `Scripts include ${scriptNames.slice(0, 8).map((name) => `\`${name}\``).join(', ')}.` : "I didn't find package scripts.",
    notableFiles ? `Notable files near the top: ${notableFiles}.` : null,
    'I only read workspace metadata and the shallow file list.',
  ].filter(Boolean).join(' ')
}

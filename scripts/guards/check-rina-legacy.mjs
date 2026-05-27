import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

const legacyRinaDir = path.join(repoRoot, 'apps', 'terminal-pro', 'src', 'rina')

const llmForbiddenPatterns = [
  { label: 'direct LLM call', regex: /fetch\s*\(\s*['"`][^'"`]*\/chat\/completions['"`]/ },
  { label: 'openai chat completions URL', regex: /api\.openai\.com\/v1\/chat\/completions/ },
  { label: 'private LLM helper', regex: /\bcallLLM\s*\(/ },
]

const executionForbiddenPatterns = [
  { label: 'legacy shell execution import', regex: /from\s+['"].*execution\/legacyShell/ },
  { label: 'legacy execCommand call', regex: /\bexecCommand(?:Sync)?\s*\(/ },
]

const executionAllowlist = new Set([
  'apps/terminal-pro/src/rina/execution/legacyShell.ts',
  // Dynamic import + exec only when RINAWARP_TOOL_SMOKE=1
  'apps/terminal-pro/src/rina/tools/terminal.ts',
])

const controllerHardFailPrefix = 'apps/terminal-pro/src/rina/controller/'

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }
    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
  return out
}

function toRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function scanPatterns(rel, lines, patterns) {
  const hits = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    for (const pattern of patterns) {
      if (!pattern.regex.test(line)) continue
      hits.push(`${rel}:${i + 1} [${pattern.label}] ${line.trim().slice(0, 100)}`)
    }
  }
  return hits
}

function main() {
  if (!fs.existsSync(legacyRinaDir)) {
    console.log('[check-rina-legacy] No legacy rina directory found - OK')
    return
  }

  const files = walk(legacyRinaDir)
  const hardFailures = []

  for (const filePath of files) {
    const rel = toRelative(filePath)
    const lines = fs.readFileSync(filePath, 'utf8').split('\n')

    hardFailures.push(...scanPatterns(rel, lines, llmForbiddenPatterns))

    const executionHits = scanPatterns(rel, lines, executionForbiddenPatterns)
    for (const hit of executionHits) {
      if (executionAllowlist.has(rel)) continue
      if (rel.startsWith(controllerHardFailPrefix)) {
        hardFailures.push(hit)
        continue
      }
      hardFailures.push(hit)
    }
  }

  if (hardFailures.length > 0) {
    console.error('[check-rina-legacy] Legacy rina violations:')
    for (const finding of hardFailures) {
      console.error(`- ${finding}`)
    }
    console.error('\nPhase 3: src/rina/ must not execute outside runtime. Only legacyShell.ts may define shell helpers (smoke tests).')
    process.exit(1)
  }

  console.log('[check-rina-legacy] PASS: legacy layer is adapter-only (no LLM/shell bypass).')
}

main()

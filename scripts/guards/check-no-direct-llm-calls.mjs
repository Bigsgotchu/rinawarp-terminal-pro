import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

const forbiddenDirectLlmPatterns = [
  {
    label: 'direct openai chat/completions call',
    regex: /fetch\s*\(\s*(['"`])([^'"`]*)\/chat\/completions\1/,
  },
  {
    label: 'direct openai api call',
    regex: /api\.openai\.com\/v1\/chat\/completions/,
  },
]

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])

// Files that are allowed to have LLM calls directly
const llmAllowlist = new Set([
  'services/rina-cloud-api/src/index.ts',
  'services/rina-cloud-api/src/openaiProvider.ts',
])

function walkFiles(rootPath, out = []) {
  if (!fs.existsSync(rootPath)) return out
  const stat = fs.statSync(rootPath)
  if (stat.isFile()) {
    if (allowedExtensions.has(path.extname(rootPath))) out.push(rootPath)
    return out
  }
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === '.git') continue
    const fullPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, out)
      continue
    }
    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      out.push(fullPath)
    }
  }
  return out
}

function toRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/')
}

function main() {
  const findings = []
  const mainRoot = path.join(root, 'apps', 'terminal-pro', 'src', 'main')
  const rinaSrc = path.join(root, 'apps', 'terminal-pro', 'src', 'rina')
  
  for (const rootPath of [mainRoot, rinaSrc]) {
    const files = walkFiles(rootPath)
    for (const filePath of files) {
      const rel = toRelative(filePath)
      if (llmAllowlist.has(rel)) continue
      
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        for (const pattern of forbiddenDirectLlmPatterns) {
          if (!pattern.regex.test(line)) continue
          findings.push(`${rel}:${i + 1} [${pattern.label}] ${line.trim().slice(0, 120)}`)
        }
      }
    }
  }

  if (findings.length > 0) {
    console.error('[check-no-direct-llm-calls] Direct LLM calls detected outside allowed services:')
    for (const finding of findings) {
      console.error(`- ${finding}`)
    }
    console.error('\nLLM calls MUST go through handleIngress → RinaRuntime')
    process.exit(1)
  }

  console.log('[check-no-direct-llm-calls] PASS: No direct LLM calls detected.')
}

main()
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src/renderer')
const agentShellPath = path.join(root, 'modern', 'workbenchShellFrameModel.ts')

const blocked = [
  'Receipt Viewer',
  'Runs Inspector',
  'Execution Trace',
  'Brain Inspector',
  'Diagnostics Inspector',
  'Recovered your last session',
  'Resume fix',
  'Resume Fix',
  'Fix project',
  'Deploy this',
]

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.(ts|tsx|js|jsx|css)$/.test(entry.name)) continue
    const text = fs.readFileSync(full, 'utf8')
    for (const phrase of blocked) {
      if (text.includes(phrase)) {
        throw new Error(`Blocked UI residue "${phrase}" found in ${full}`)
      }
    }
  }
}

walk(root)

const agentShell = fs.readFileSync(agentShellPath, 'utf8')
const firstRunExecutionButtons = [
  'data-agent-prompt="Run tests"',
  'data-agent-prompt="Build project"',
  'data-agent-prompt="Inspect this workspace',
  'data-agent-prompt="Diagnose the project',
]
for (const marker of firstRunExecutionButtons) {
  if (agentShell.includes(marker)) {
    throw new Error(
      `RinaWarp Terminal Pro is natural-language first: first-run Agent Thread examples must fill the composer, not execute via ${marker}`
    )
  }
}

console.log('[guard-ui-residue] clean')

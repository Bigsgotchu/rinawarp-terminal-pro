import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src/renderer')

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
console.log('[guard-ui-residue] clean')

#!/usr/bin/env node

/**
 * Report: Large Source Files
 * 
 * Reports source files over 1,000 lines.
 * Ignores build artifacts and node_modules.
 * Does NOT fail - just warns.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-electron',
  'dist-renderer',
  'release-artifacts',
  '.git',
  '.kilo',
])

const IGNORE_EXTENSIONS = new Set(['.json', '.css', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'])

const THRESHOLD = 1000

function isIgnored(p) {
  const parts = p.split(path.sep)
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return true
  }
  const ext = path.extname(p)
  if (IGNORE_EXTENSIONS.has(ext)) return true
  return false
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return content.split('\n').length
}

function walkDir(dir, results = []) {
  let files
  try {
    files = fs.readdirSync(dir)
  } catch {
    return results
  }
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    let stat
    try {
      stat = fs.statSync(filePath)
    } catch {
      continue
    }
    
    if (stat.isDirectory()) {
      walkDir(filePath, results)
    } else if (stat.isFile()) {
      const relative = path.relative(repoRoot, filePath)
      if (!isIgnored(relative) && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs'))) {
        const lines = countLines(filePath)
        if (lines > THRESHOLD) {
          results.push({ file: relative, lines })
        }
      }
    }
  }
  
  return results
}

const largeFiles = walkDir(repoRoot).sort((a, b) => b.lines - a.lines)

console.log('[report:large-files] Large source files (>1000 lines):')
console.log('')
for (const { file, lines } of largeFiles) {
  console.log(`  ${lines.toString().padStart(5)} lines  ${file}`)
}

if (largeFiles.length === 0) {
  console.log('  (none)')
}

console.log('')
console.log(`Total: ${largeFiles.length} files over ${THRESHOLD} lines`)
process.exit(0)

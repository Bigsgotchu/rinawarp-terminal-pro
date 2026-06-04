#!/usr/bin/env node

/**
 * Guard: check-doc-source-of-truth
 * 
 * Fails if non-archived docs contain banned current-guidance phrases.
 * These phrases indicate stale/conflicting product language that should
 * only exist in archived historical documents.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const docsDir = path.join(repoRoot, 'docs')
const archiveDir = path.join(docsDir, 'archive')

const BANNED_PHRASES = [
  'Rina workbench',
  'AI workbench',
  'Receipt Viewer',
  'Execution Trace',
  'private development version',
  'not for public release',
  'ready for full public production',
]

function isArchived(filePath) {
  const relative = path.relative(archiveDir, filePath)
  return relative && !relative.startsWith('..')
}

function checkFile(filePath) {
  if (isArchived(filePath)) return []
  
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []
  
  for (const phrase of BANNED_PHRASES) {
    if (content.includes(phrase)) {
      issues.push({ file: filePath, phrase })
    }
  }
  
  return issues
}

function walkDir(dir) {
  const results = []
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath))
    } else if (file.endsWith('.md')) {
      results.push(...checkFile(filePath))
    }
  }
  
  return results
}

const issues = walkDir(docsDir)

if (issues.length > 0) {
  console.error('[guard:doc-source-of-truth] FAIL: Found banned phrases in non-archived docs:')
  for (const issue of issues) {
    const relative = path.relative(repoRoot, issue.file)
    console.error(`  - "${issue.phrase}" in ${relative}`)
  }
  console.error('')
  console.error('Move these files to docs/archive/ or update the language.')
  process.exit(1)
}

console.log('[guard:doc-source-of-truth] PASS: No stale guidance phrases found in active docs')
process.exit(0)

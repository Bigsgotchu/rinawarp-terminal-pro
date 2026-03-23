#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

const productionTargets = [
  'apps/terminal-pro/src/main',
  'apps/terminal-pro/src/preload.ts',
  'apps/terminal-pro/src/renderer/actions',
  'apps/terminal-pro/src/renderer/services',
  'apps/terminal-pro/src/renderer/settings',
  'apps/terminal-pro/src/renderer/fixes',
]

const fileExtensions = new Set(['.ts', '.js', '.mjs', '.cjs'])

const isolatedSegments = [
  'test',
  'tests',
  '__tests__',
  '__mocks__',
  '__fixtures__',
  'fixtures',
  'mocks',
  'mock',
  'examples',
  'example',
  'demo',
  'demos',
  'stories',
  'storybook',
]

function walk(targetPath) {
  const absolutePath = path.resolve(repoRoot, targetPath)
  const stat = fs.statSync(absolutePath)
  if (stat.isFile()) return [absolutePath]
  const out = []
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const fullPath = path.join(absolutePath, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(path.relative(repoRoot, fullPath)))
      continue
    }
    if (entry.isFile() && fileExtensions.has(path.extname(entry.name))) {
      out.push(fullPath)
    }
  }
  return out
}

function toRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function isIsolatedPath(relativePath) {
  return relativePath.split('/').some((segment) => isolatedSegments.includes(segment))
}

const findings = []

for (const target of productionTargets) {
  const targetPath = path.resolve(repoRoot, target)
  if (!fs.existsSync(targetPath)) continue

  for (const filePath of walk(target)) {
    const relativePath = toRelative(filePath)
    if (isIsolatedPath(relativePath)) continue

    const lines = fs.readFileSync(filePath, 'utf8').split('\n')

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const trimmed = line.trim()

      if (/\bsuccess:\s*true\b/.test(trimmed)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          label: 'legacy success:true contract',
          text: trimmed,
        })
      }

      if (/\bfallback:\s*true\b/.test(trimmed)) {
        const windowText = lines.slice(index, Math.min(lines.length, index + 6)).join('\n')
        if (!/\bdegraded:\s*true\b/.test(windowText)) {
          findings.push({
            file: relativePath,
            line: index + 1,
            label: 'fallback without degraded marker',
            text: trimmed,
          })
        }
      }

      if (/return\s+\{\s*ok:\s*true\b/.test(trimmed)) {
        const context = lines.slice(Math.max(0, index - 3), index + 1).join('\n')
        if (/\bcatch\b/.test(context)) {
          findings.push({
            file: relativePath,
            line: index + 1,
            label: 'ok:true returned from catch path',
            text: trimmed,
          })
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.error('[check-no-fake-success] Production fake-success patterns found:')
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.label}] ${finding.text}`)
  }
  process.exit(1)
}

console.log('[check-no-fake-success] No production fake-success patterns found.')

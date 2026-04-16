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
  'apps/terminal-pro/src/types/window-rina.d.ts',
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

const forbiddenMarkers = [
  { label: 'stub', regex: /\bstubs?\b/i },
  { label: 'mock', regex: /\bmocks?\b/i },
  { label: 'dummy', regex: /\bdummy\b/i },
  { label: 'todo', regex: /\bTODO\b/ },
  { label: 'not implemented', regex: /not implemented/i },
  { label: 'coming soon', regex: /coming soon/i },
  { label: 'sample data', regex: /sample data/i },
  { label: 'hardcoded', regex: /\bhardcoded\b/i },
]

const importLeakPattern =
  /\b(?:from|require\()\s*['"][^'"]*(?:test|tests|__tests__|fixtures|__fixtures__|mocks|__mocks__|examples|example|demo|demos|stories|storybook)[^'"]*['"]/

const lineAllowlist = [
  {
    fileSuffix: 'apps/terminal-pro/src/main/workspace/codeHelpers.ts',
    regex: /fixtures\|mocks/,
  },
  {
    fileSuffix: 'apps/terminal-pro/src/main/search/unifiedSearch.ts',
    regex: /failed|success/,
  },
  {
    fileSuffix: 'apps/terminal-pro/src/renderer/settings/panels/memory.ts',
    regex: /fake progress language/,
  },
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
  const segments = relativePath.split('/')
  return segments.some((segment) => isolatedSegments.includes(segment))
}

function isAllowlisted(relativePath, line) {
  return lineAllowlist.some((rule) => relativePath.endsWith(rule.fileSuffix) && rule.regex.test(line))
}

const findings = []

for (const target of productionTargets) {
  const targetPath = path.resolve(repoRoot, target)
  if (!fs.existsSync(targetPath)) continue
  for (const filePath of walk(target)) {
    const relativePath = toRelative(filePath)
    if (isIsolatedPath(relativePath)) continue

    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      if (isAllowlisted(relativePath, line)) return
      for (const pattern of forbiddenMarkers) {
        if (!pattern.regex.test(line)) continue
        findings.push({
          kind: 'marker',
          file: relativePath,
          line: index + 1,
          label: pattern.label,
          text: line.trim(),
        })
      }
      if (importLeakPattern.test(line)) {
        findings.push({
          kind: 'import-leak',
          file: relativePath,
          line: index + 1,
          label: 'production import reaches isolated path',
          text: line.trim(),
        })
      }
    })
  }
}

if (findings.length > 0) {
  console.error('[check-no-stubs] Production runtime integrity violations found:')
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.label}] ${finding.text}`)
  }
  process.exit(1)
}

console.log('[check-no-stubs] Production runtime paths are free of stub markers and isolated-path leaks.')

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

const contractPath = path.join(repoRoot, 'PRODUCT_CONSTRAINT_CONTRACT.md')
const ingressPath = path.join(
  repoRoot,
  'apps',
  'terminal-pro',
  'src',
  'main',
  'assistant',
  'rinaIntentLoop.ts',
)

const requiredContractMarkers = [
  'There is only ONE valid loop in the entire system:',
  'handleIngress (ONLY entry point)',
  'Every execution MUST generate a Run Block:',
  'NO CLAIM WITHOUT PROOF.',
  'workspaceRoot = mainProcessProvidedValue',
  'All execution must emit structured events:',
  'Playwright MUST validate:',
]

const requiredIngressMarkers = [
  'handleIngress',
  'RinaMemoryStore',
  'RinaEventStream',
  'transaction.created',
]
const inlineRinaPath = path.join(repoRoot, 'apps', 'terminal-pro', 'src', 'main', 'inline-rina.ts')
const mainRoot = path.join(repoRoot, 'apps', 'terminal-pro', 'src', 'main')

const requiredEventLiterals = [
  'intent.received',
  'plan.generated',
  'transaction.created',
  'execution.running',
  'execution.complete',
  'rollback.triggered',
]
const runRinaAgentAllowlist = new Set([
  'apps/terminal-pro/src/main/rina-agent.ts',
  'apps/terminal-pro/src/main/assistant/rinaIntentLoop.ts',
])

const rendererRoots = [
  path.join(repoRoot, 'apps', 'terminal-pro', 'src', 'renderer'),
  path.join(repoRoot, 'apps', 'terminal-pro', 'src', 'preload.ts'),
]

const rendererForbiddenPatterns = [
  {
    label: 'renderer direct process execution',
    regex:
      /\b(?:from\s+['"]node:child_process['"]|from\s+['"]child_process['"]|require\(\s*['"]node:child_process['"]\s*\)|require\(\s*['"]child_process['"]\s*\))/,
  },
  {
    label: 'renderer shell command execution',
    regex: /\b(?:exec|execSync|spawn|spawnSync|fork)\s*\(/,
  },
]

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])

function walkFiles(rootPath, out = []) {
  if (!fs.existsSync(rootPath)) return out
  const stat = fs.statSync(rootPath)
  if (stat.isFile()) {
    if (allowedExtensions.has(path.extname(rootPath))) out.push(rootPath)
    return out
  }
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue
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
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function fail(message, details = []) {
  console.error(`[check-product-constraint-contract] ${message}`)
  for (const detail of details) console.error(`- ${detail}`)
  process.exit(1)
}

if (!fs.existsSync(contractPath)) {
  fail(`Missing required contract file: ${toRelative(contractPath)}`)
}

const contractContent = fs.readFileSync(contractPath, 'utf8')

const missingContractMarkers = requiredContractMarkers.filter((marker) => !contractContent.includes(marker))
if (missingContractMarkers.length > 0) {
  fail('Contract is missing required sections.', missingContractMarkers)
}

if (!fs.existsSync(ingressPath)) {
  fail(`Missing ingress implementation file: ${toRelative(ingressPath)}`)
}

const ingressContent = fs.readFileSync(ingressPath, 'utf8')
const missingIngressMarkers = requiredIngressMarkers.filter((marker) => !ingressContent.includes(marker))
if (missingIngressMarkers.length > 0) {
  fail(
    'Ingress path is missing required runtime markers in Terminal Pro.',
    missingIngressMarkers.map((marker) => `${toRelative(ingressPath)} missing "${marker}"`),
  )
}

const missingEventLiterals = requiredEventLiterals.filter((eventName) => !contractContent.includes(eventName))
if (missingEventLiterals.length > 0) {
  fail('Contract must list all required runtime event names.', missingEventLiterals)
}

if (!fs.existsSync(inlineRinaPath)) {
  fail(`Missing inline Rina file: ${toRelative(inlineRinaPath)}`)
}

const inlineRinaContent = fs.readFileSync(inlineRinaPath, 'utf8')
if (!inlineRinaContent.includes('allowEnvMock') || !inlineRinaContent.includes('RINAWARP_E2E')) {
  fail(
    'Inline Rina test-mock path is not explicitly restricted to test/e2e contexts.',
    [`Expected allowEnvMock + RINAWARP_E2E gate in ${toRelative(inlineRinaPath)}`],
  )
}

const directAgentFindings = []
for (const filePath of walkFiles(mainRoot)) {
  const rel = toRelative(filePath)
  if (!rel.endsWith('.ts') && !rel.endsWith('.js') && !rel.endsWith('.mjs') && !rel.endsWith('.cjs')) continue
  if (runRinaAgentAllowlist.has(rel)) continue
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    if (!/\brunRinaAgent\s*\(/.test(lines[index])) continue
    directAgentFindings.push(`${rel}:${index + 1} direct runRinaAgent call bypasses ingress`)
  }
}

if (directAgentFindings.length > 0) {
  fail('Direct agent execution paths detected outside allowed ingress modules.', directAgentFindings)
}

const legacyAdapterPatterns = [
  { label: 'createLegacyPanelIntent', regex: /\bcreateLegacyPanelIntent\b/ },
  { label: 'toLegacyAgentResponse', regex: /\btoLegacyAgentResponse\b/ },
  { label: 'toLegacyPatchResponse', regex: /\btoLegacyPatchResponse\b/ },
]

const legacyFindings = []
for (const filePath of walkFiles(path.join(repoRoot, 'apps', 'terminal-pro', 'src'))) {
  const rel = toRelative(filePath)
  if (rel.includes('/test/') || rel.includes('/tests/') || rel.includes('/e2e/')) continue
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of legacyAdapterPatterns) {
      if (!pattern.regex.test(lines[index])) continue
      legacyFindings.push(`${rel}:${index + 1} [${pattern.label}]`)
    }
    if (/\bruntimeIngress\b/.test(lines[index]) && !rel.endsWith('.d.ts')) {
      legacyFindings.push(`${rel}:${index + 1} [runtimeIngress parallel truth]`)
    }
  }
}

if (legacyFindings.length > 0) {
  fail('Legacy response adapters or parallel runtimeIngress truth detected.', legacyFindings)
}

if (!ingressContent.includes('buildExecutionRecord') || !ingressContent.includes('RinaExecutionRecord')) {
  fail('Ingress module must return canonical RinaExecutionRecord via buildExecutionRecord.', [
    `${toRelative(ingressPath)} must export submitRinaIntent(): Promise<RinaExecutionRecord>`,
  ])
}

const workbenchIngressPath = path.join(repoRoot, 'apps', 'terminal-pro', 'src', 'renderer', 'services', 'agentExecutionFlow.ts')
if (fs.existsSync(workbenchIngressPath)) {
  const workbenchFlow = fs.readFileSync(workbenchIngressPath, 'utf8')
  if (!workbenchFlow.includes('submitAnalyzeIntent') || !workbenchFlow.includes('applyExecutionRecordToWorkbench')) {
    fail('Workbench agent thread must route execution prompts through ingress + execution record bridge.', [
      `${toRelative(workbenchIngressPath)} missing submitAnalyzeIntent/applyExecutionRecordToWorkbench`,
    ])
  }
}

const rendererFindings = []
for (const root of rendererRoots) {
  const files = walkFiles(root)
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      for (const pattern of rendererForbiddenPatterns) {
        if (!pattern.regex.test(line)) continue
        rendererFindings.push(`${toRelative(filePath)}:${index + 1} [${pattern.label}] ${line.trim()}`)
      }
    }
  }
}

if (rendererFindings.length > 0) {
  fail('Forbidden renderer-side execution patterns detected.', rendererFindings)
}

console.log('[check-product-constraint-contract] PASS: Terminal Pro contract and single-path enforcement checks are valid.')

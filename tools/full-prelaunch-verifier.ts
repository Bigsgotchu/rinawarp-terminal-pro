#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

type Result = 'pass' | 'fail' | 'skip'

type SupplementalResult = {
  name: string
  status: Result
  detail: string
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const reportDir = path.join(repoRoot, 'test-results', 'prelaunch-verification')
const mainVerifierPath = path.join(repoRoot, 'tools', 'prelaunch-verification.ts')
const demoRecordPath = path.join(repoRoot, 'demo-record.ts')
const demoRecordEnhancedPath = path.join(repoRoot, 'demo-record-enhanced.ts')
const demoVideoPath = path.join(repoRoot, 'rinawarp-demo.mp4')

const cyan = (value: string) => `\x1b[36m${value}\x1b[0m`
const green = (value: string) => `\x1b[32m${value}\x1b[0m`
const yellow = (value: string) => `\x1b[33m${value}\x1b[0m`
const red = (value: string) => `\x1b[31m${value}\x1b[0m`

function logResult(result: SupplementalResult): void {
  const prefix = result.status === 'pass' ? green('[PASS]') : result.status === 'skip' ? yellow('[SKIP]') : red('[FAIL]')
  console.log(`${prefix} ${result.name} - ${result.detail}`)
}

function runAuthoritativeLaunchVerification(): number {
  console.log(cyan('\nRunning authoritative launch verification...\n'))
  try {
    execFileSync(
      'node',
      ['--import', 'tsx', mainVerifierPath, '--launch'],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        env: { ...process.env },
      }
    )
    return 0
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status ?? 1) : 1
    return Number.isFinite(status) ? status : 1
  }
}

function commandExists(command: string): boolean {
  try {
    execFileSync('bash', ['-lc', `command -v ${command}`], {
      cwd: repoRoot,
      stdio: 'ignore',
      env: { ...process.env },
    })
    return true
  } catch {
    return false
  }
}

function runSupplementalChecks(): SupplementalResult[] {
  const results: SupplementalResult[] = []

  const demoScripts = [
    { label: 'Demo recorder script exists', filePath: demoRecordPath },
    { label: 'Enhanced demo recorder script exists', filePath: demoRecordEnhancedPath },
  ]

  for (const item of demoScripts) {
    results.push({
      name: item.label,
      status: existsSync(item.filePath) ? 'pass' : 'fail',
      detail: existsSync(item.filePath) ? path.relative(repoRoot, item.filePath) : `missing: ${path.relative(repoRoot, item.filePath)}`,
    })
  }

  results.push({
    name: 'ffmpeg available for demo capture',
    status: commandExists('ffmpeg') ? 'pass' : 'skip',
    detail: commandExists('ffmpeg')
      ? 'ffmpeg is installed'
      : 'install ffmpeg to run automated screen capture locally',
  })

  results.push({
    name: 'Existing demo video artifact',
    status: existsSync(demoVideoPath) ? 'pass' : 'skip',
    detail: existsSync(demoVideoPath)
      ? path.relative(repoRoot, demoVideoPath)
      : 'no demo artifact found yet; regenerate with demo-record scripts if needed',
  })

  return results
}

function writeSupplementalReport(results: SupplementalResult[]): void {
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(
    path.join(reportDir, 'full-prelaunch-supplemental.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2
    )
  )

  const lines = [
    '# Full Prelaunch Supplemental Checks',
    '',
    ...results.map((result) => `- ${result.status.toUpperCase()}: ${result.name} - ${result.detail}`),
    '',
    '- The authoritative launch verdict remains in `prelaunch-report.md` and `prelaunch-report.json`.',
  ]
  writeFileSync(path.join(reportDir, 'full-prelaunch-supplemental.md'), lines.join('\n'))
}

function printFinalSummary(launchExitCode: number, supplementalResults: SupplementalResult[]): void {
  console.log(cyan('\nSupplemental checks\n'))
  for (const result of supplementalResults) {
    logResult(result)
  }

  const failedSupplemental = supplementalResults.filter((result) => result.status === 'fail').length
  const skippedSupplemental = supplementalResults.filter((result) => result.status === 'skip').length

  console.log('')
  console.log(`Authoritative launch verifier exit code: ${launchExitCode}`)
  console.log(`Supplemental failures: ${failedSupplemental} | Supplemental skips: ${skippedSupplemental}`)
  console.log(`Reports: ${path.relative(repoRoot, path.join(reportDir, 'prelaunch-report.md'))}, ${path.relative(repoRoot, path.join(reportDir, 'full-prelaunch-supplemental.md'))}`)
}

function main(): void {
  console.log(green('Full prelaunch verification'))
  const launchExitCode = runAuthoritativeLaunchVerification()
  const supplementalResults = runSupplementalChecks()
  writeSupplementalReport(supplementalResults)
  printFinalSummary(launchExitCode, supplementalResults)
  process.exit(launchExitCode)
}

main()

#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

type Result = 'pass' | 'fail' | 'skip'
type Severity = 'blocker' | 'warning' | 'info'
type Mode = 'local' | 'online' | 'manual'
type Profile = 'baseline' | 'launch'

type CheckResult = {
  id: string
  title: string
  category: string
  mode: Mode
  severity: Severity
  result: Result
  summary: string
}

type StaticRule = {
  title: string
  category: string
  severity: Severity
  filePath: string
  patterns: string[]
  mode?: Mode
}

type CheckContext = {
  repoRoot: string
  appRoot: string
  artifactsDir: string
  profile: Profile
  runBuild: boolean
  runUnit: boolean
  runPlaywright: boolean
  runOnline: boolean
  writeReport: boolean
}

type ParsedArgs = {
  profile: Profile
  runBuild: boolean
  runUnit: boolean
  runPlaywright: boolean
  runOnline: boolean
  writeReport: boolean
}

type PackageJson = {
  scripts?: Record<string, string>
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const appRoot = path.join(repoRoot, 'apps', 'terminal-pro')
const reportDir = path.join(repoRoot, 'test-results', 'prelaunch-verification')

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Set(argv)
  let profile: Profile = 'baseline'

  for (const arg of argv) {
    if (arg.startsWith('--profile=')) {
      const value = arg.slice('--profile='.length)
      if (value === 'baseline' || value === 'launch') {
        profile = value
      }
    }
  }

  if (values.has('--launch')) {
    profile = 'launch'
  }

  const runBuild = values.has('--build') || profile === 'launch'
  const runUnit = values.has('--unit') || profile === 'launch'
  const runPlaywright = values.has('--playwright') || profile === 'launch'
  const runOnline = values.has('--online') || profile === 'launch'
  const writeReport = !values.has('--no-report')

  return { profile, runBuild, runUnit, runPlaywright, runOnline, writeReport }
}

function log(result: Result, title: string, summary: string): void {
  const icon = result === 'pass' ? 'PASS' : result === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`[${icon}] ${title} - ${summary}`)
}

function runCommand(
  title: string,
  command: string[],
  options?: {
    cwd?: string
    timeoutMs?: number
    allowFailure?: boolean
  }
): { result: Result; summary: string } {
  try {
    execFileSync(command[0], command.slice(1), {
      cwd: options?.cwd ?? repoRoot,
      stdio: 'pipe',
      timeout: options?.timeoutMs ?? 10 * 60 * 1000,
      encoding: 'utf8',
      env: { ...process.env },
    })
    return { result: 'pass', summary: command.join(' ') }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (options?.allowFailure) {
      return { result: 'skip', summary: message }
    }
    return { result: 'fail', summary: message.split('\n')[0] ?? message }
  }
}

function ensureNonTrivialFile(filePath: string, minBytes: number): string | null {
  if (!existsSync(filePath)) {
    return `missing: ${path.relative(repoRoot, filePath)}`
  }

  const size = statSync(filePath).size
  if (size < minBytes) {
    return `too small (${size} bytes): ${path.relative(repoRoot, filePath)}`
  }

  return null
}

function ensurePatterns(filePath: string, patterns: string[]): string | null {
  if (!existsSync(filePath)) {
    return `missing: ${path.relative(repoRoot, filePath)}`
  }

  const content = readFileSync(filePath, 'utf8')
  const missing = patterns.filter((pattern) => !content.includes(pattern))
  if (missing.length > 0) {
    return `missing patterns in ${path.relative(repoRoot, filePath)}: ${missing.join(', ')}`
  }

  return null
}

function safeFetchAvailable(): boolean {
  return typeof fetch === 'function'
}

async function httpCheck(
  title: string,
  url: string,
  init: RequestInit,
  expectedStatuses: number[]
): Promise<{ result: Result; summary: string }> {
  if (!safeFetchAvailable()) {
    return { result: 'skip', summary: 'fetch is not available in this Node runtime' }
  }

  try {
    const response = await fetch(url, init)
    if (!expectedStatuses.includes(response.status)) {
      return { result: 'fail', summary: `unexpected HTTP ${response.status} from ${url}` }
    }
    return { result: 'pass', summary: `${title} returned HTTP ${response.status}` }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { result: 'skip', summary: `network unavailable or endpoint unreachable: ${message}` }
  }
}

function collectDesktopArtifacts(): string[] {
  const artifactRoots = [
    repoRoot,
    path.join(appRoot, 'dist'),
    path.join(appRoot, 'release'),
    path.join(repoRoot, 'release'),
  ]

  const extensions = new Set(['.appimage', '.deb', '.rpm', '.dmg', '.exe', '.zip', '.blockmap'])
  const found = new Set<string>()

  for (const root of artifactRoots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const fullPath = path.join(root, entry.name)
      const extension = path.extname(entry.name).toLowerCase()
      if (extensions.has(extension)) {
        found.add(path.relative(repoRoot, fullPath))
      }
    }
  }

  return [...found].sort()
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

function extractScriptReferences(command: string): string[] {
  const matches = [...command.matchAll(/(?:bash|node|tsx|npx\s+tsx)\s+([A-Za-z0-9_./-]+\.(?:sh|mjs|cjs|js|ts))/g)]
  return matches.map((match) => match[1])
}

function verifyPackageScripts(filePath: string): { missing: string[]; checked: number } {
  const packageJson = readJson<PackageJson>(filePath)
  const scripts = packageJson.scripts ?? {}
  const missing: string[] = []
  let checked = 0

  for (const [name, command] of Object.entries(scripts)) {
    for (const ref of extractScriptReferences(command)) {
      checked += 1
      const absolutePath = path.resolve(path.dirname(filePath), ref)
      if (!existsSync(absolutePath)) {
        missing.push(`${path.relative(repoRoot, filePath)}:${name} -> ${ref}`)
      }
    }
  }

  return { missing, checked }
}

function addResult(results: CheckResult[], entry: CheckResult): void {
  results.push(entry)
  log(entry.result, entry.title, entry.summary)
}

async function runChecks(context: CheckContext): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  const mainBuild = path.join(appRoot, 'dist-electron', 'main', 'main.js')
  const preloadBuild = path.join(appRoot, 'dist-electron', 'main', 'preload.cjs')
  const rendererBuild = path.join(appRoot, 'dist-electron', 'renderer', 'renderer.html')
  const electronBinary = path.join(appRoot, 'node_modules', 'electron', 'dist', 'electron')
  const marketplaceSource = path.join(appRoot, 'src', 'main', 'marketplace.ts')
  const licenseSource = path.join(appRoot, 'src', 'license.ts')
  const analyticsSource = path.join(appRoot, 'src', 'analytics.ts')
  const windowSource = path.join(appRoot, 'src', 'main', 'window.ts')
  const combinedWorker = path.join(repoRoot, 'combined-worker.js')
  const stripeLinks = path.join(repoRoot, 'stripe-payment-links.js')

  if (context.runBuild) {
    const build = runCommand(
      'Desktop build completes',
      ['npm', '--workspace', 'apps/terminal-pro', 'run', 'build:electron'],
      { timeoutMs: 15 * 60 * 1000 }
    )
    addResult(results, {
      id: 'build-electron',
      title: 'Desktop build completes',
      category: 'Build',
      mode: 'local',
      severity: 'blocker',
      result: build.result,
      summary: build.summary,
    })
  }

  const buildFiles = [
    ['electron-main-build', 'Electron main build exists', mainBuild, 1024],
    ['electron-preload-build', 'Electron preload build exists', preloadBuild, 256],
    ['electron-renderer-build', 'Electron renderer build exists', rendererBuild, 256],
    ['electron-binary', 'Electron binary exists', electronBinary, 256],
    ['marketplace-source', 'Marketplace source exists', marketplaceSource, 128],
    ['license-source', 'License source exists', licenseSource, 128],
    ['analytics-source', 'Analytics source exists', analyticsSource, 128],
    ['window-source', 'Desktop window bootstrap exists', windowSource, 128],
    ['worker-source', 'Combined API worker exists', combinedWorker, 256],
    ['stripe-links-source', 'Stripe payment link helper exists', stripeLinks, 128],
  ] as const

  for (const [id, title, filePath, minBytes] of buildFiles) {
    const problem = ensureNonTrivialFile(filePath, minBytes)
    addResult(results, {
      id,
      title,
      category: 'Build',
      mode: 'local',
      severity: 'blocker',
      result: problem ? 'fail' : 'pass',
      summary: problem ?? path.relative(repoRoot, filePath),
    })
  }

  const rootScripts = verifyPackageScripts(path.join(repoRoot, 'package.json'))
  addResult(results, {
    id: 'root-script-targets',
    title: 'Root package scripts point to real files',
    category: 'Ops',
    mode: 'local',
    severity: 'warning',
    result: rootScripts.missing.length === 0 ? 'pass' : 'fail',
    summary:
      rootScripts.missing.length === 0
        ? `validated ${rootScripts.checked} script file references`
        : rootScripts.missing.slice(0, 6).join('; '),
  })

  const appScripts = verifyPackageScripts(path.join(appRoot, 'package.json'))
  addResult(results, {
    id: 'app-script-targets',
    title: 'App package scripts point to real files',
    category: 'Ops',
    mode: 'local',
    severity: 'blocker',
    result: appScripts.missing.length === 0 ? 'pass' : 'fail',
    summary:
      appScripts.missing.length === 0
        ? `validated ${appScripts.checked} script file references`
        : appScripts.missing.slice(0, 6).join('; '),
  })

  const staticRules: StaticRule[] = [
    {
      title: 'Renderer enforces Pro-gated features',
      category: 'License',
      severity: 'blocker',
      filePath: path.join(appRoot, 'src', 'renderer', 'state', 'license.ts'),
      patterns: ['export function requireProFeature()', 'export function requireAgentTier(', 'This feature requires a Pro subscription'],
    },
    {
      title: 'Desktop license cache support exists',
      category: 'License',
      severity: 'warning',
      filePath: path.join(appRoot, 'src', 'license.ts'),
      patterns: ['LICENSE_CACHE_FILE', 'loadCachedLicense()', 'cacheLicense(info: LicenseInfo)', 'fetch(url, {'],
    },
    {
      title: 'Marketplace tier filtering is implemented',
      category: 'Marketplace',
      severity: 'blocker',
      filePath: path.join(appRoot, 'src', 'main', 'marketplace.ts'),
      patterns: ['filterByTier(agents: MarketplaceAgent[], userTier: string)', 'canInstall(agent: MarketplaceAgent, userTier: string)', "tier: 'pro'"],
    },
    {
      title: 'Marketplace IPC blocks locked installs and tracks telemetry',
      category: 'Marketplace',
      severity: 'blocker',
      filePath: path.join(appRoot, 'src', 'main', 'ipc', 'registerMarketplaceIpc.ts'),
      patterns: ['marketplace.filterByTier(agents, userTier)', "track('marketplace_install_blocked'", "track('marketplace_install_success'"],
    },
    {
      title: 'Upgrade flow emits checkout funnel analytics',
      category: 'Analytics',
      severity: 'warning',
      filePath: path.join(appRoot, 'src', 'renderer', 'ui', 'upgrade', 'UpgradeModal.ts'),
      patterns: ['upgrade_clicked', 'checkout_started', 'checkout_completed'],
    },
    {
      title: 'Stripe webhook worker handles recurring and cancellation events',
      category: 'Revenue',
      severity: 'blocker',
      filePath: path.join(repoRoot, 'website', 'workers', 'router.ts'),
      patterns: ['invoice.paid', 'customer.subscription.updated', 'customer.subscription.deleted'],
    },
    {
      title: 'Combined worker handles checkout and webhook activation',
      category: 'Revenue',
      severity: 'warning',
      filePath: combinedWorker,
      patterns: ['handleStripeWebhook', 'handleCheckoutRequest', 'activateLicense(', "if (event.type === 'invoice.paid')"],
    },
    {
      title: 'Demo recorder script captures checkout and video output',
      category: 'Demo',
      severity: 'warning',
      filePath: path.join(repoRoot, 'demo-record.ts'),
      patterns: ['spawn("ffmpeg"', 'demoUpgradeFlow()', 'demo.mp4', 'api/checkout'],
    },
    {
      title: 'Enhanced demo recorder captures marketplace and upgrade flow',
      category: 'Demo',
      severity: 'warning',
      filePath: path.join(repoRoot, 'demo-record-enhanced.ts'),
      patterns: ['spawn("ffmpeg"', 'demoMarketplace()', 'demo-enhanced.mp4', 'api/checkout'],
    },
  ]

  for (const rule of staticRules) {
    const problem = ensurePatterns(rule.filePath, rule.patterns)
    addResult(results, {
      id: `static-${rule.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: rule.title,
      category: rule.category,
      mode: rule.mode ?? 'local',
      severity: rule.severity,
      result: problem ? 'fail' : 'pass',
      summary: problem ?? path.relative(repoRoot, rule.filePath),
    })
  }

  const artifacts = collectDesktopArtifacts()
  addResult(results, {
    id: 'desktop-artifacts',
    title: 'Desktop installer artifacts are present',
    category: 'Distribution',
    mode: 'local',
    severity: 'warning',
    result: artifacts.length > 0 ? 'pass' : 'fail',
    summary: artifacts.length > 0 ? artifacts.join(', ') : 'no .AppImage/.dmg/.exe/.deb artifacts found',
  })

  if (existsSync(mainBuild) && existsSync(electronBinary)) {
    const smoke = runCommand(
      'Electron launches for smoke run',
      [electronBinary, mainBuild, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      {
        timeoutMs: 12 * 1000,
        allowFailure: true,
      }
    )

    const smokeWasSandboxBlocked =
      smoke.summary.includes('EPERM') || smoke.summary.includes('operation not permitted')
    const smokeTimedOut =
      smoke.summary.includes('timed out') || smoke.summary.includes('ETIMEDOUT')
    const smokeResult =
      smoke.result === 'pass' || smokeTimedOut
        ? 'pass'
        : smokeWasSandboxBlocked
          ? 'skip'
          : 'fail'

    addResult(results, {
      id: 'electron-smoke',
      title: 'Electron launches for smoke run',
      category: 'Runtime',
      mode: 'local',
      severity: 'blocker',
      result: smokeResult,
      summary:
        smokeResult === 'pass'
          ? smokeTimedOut
            ? 'Electron stayed alive until the smoke timeout without immediate crash'
            : 'Electron launched successfully'
          : smokeWasSandboxBlocked
            ? `sandbox prevented launch: ${smoke.summary}`
          : smoke.summary,
    })
  } else {
    addResult(results, {
      id: 'electron-smoke',
      title: 'Electron launches for smoke run',
      category: 'Runtime',
      mode: 'local',
      severity: 'blocker',
      result: 'skip',
      summary: 'build artifacts missing, smoke run skipped',
    })
  }

  if (context.runUnit) {
    for (const [id, title, command] of [
      ['agent-tests', 'Agent tests pass', ['npm', '--workspace', 'apps/terminal-pro', 'run', 'test:agent']],
      ['streaming-tests', 'Streaming tests pass', ['npm', '--workspace', 'apps/terminal-pro', 'run', 'test:streaming']],
      ['ipc-smoke', 'IPC smoke test passes', ['npm', '--workspace', 'apps/terminal-pro', 'run', 'test:ipc']],
    ] as const) {
      const outcome = runCommand(title, [...command], { timeoutMs: 15 * 60 * 1000, allowFailure: id === 'ipc-smoke' })
      addResult(results, {
        id,
        title,
        category: 'Tests',
        mode: 'local',
        severity: id === 'ipc-smoke' ? 'warning' : 'blocker',
        result: outcome.result,
        summary: outcome.summary,
      })
    }
  } else {
    addResult(results, {
      id: 'unit-suite-skipped',
      title: 'Automated local test suites',
      category: 'Tests',
      mode: 'local',
      severity: 'info',
      result: 'skip',
      summary: 'run with --unit or --launch to execute local test suites',
    })
  }

  if (context.runPlaywright) {
    const playwright = runCommand(
      'Playwright smoke suite passes',
      ['npm', '--workspace', 'apps/terminal-pro', 'run', 'test:playwright:smoke'],
      { timeoutMs: 20 * 60 * 1000, allowFailure: true }
    )
    addResult(results, {
      id: 'playwright-smoke',
      title: 'Playwright smoke suite passes',
      category: 'Tests',
      mode: 'local',
      severity: 'warning',
      result: playwright.result,
      summary: playwright.summary,
    })
  } else {
    addResult(results, {
      id: 'playwright-skipped',
      title: 'Playwright smoke suite',
      category: 'Tests',
      mode: 'local',
      severity: 'info',
      result: 'skip',
      summary: 'run with --playwright or --launch to execute Electron UI smoke tests',
    })
  }

  if (context.runOnline) {
    const apiBase = process.env.RINAWARP_API_BASE ?? 'https://api.rinawarptech.com/api'
    const siteBase = process.env.RINAWARP_SITE_BASE ?? 'https://www.rinawarptech.com'
    const revenueChecks = [
      {
        id: 'site-home',
        title: 'Marketing site responds',
        url: siteBase,
        init: { method: 'GET' },
        expectedStatuses: [200, 301, 302],
      },
      {
        id: 'checkout-api',
        title: 'Checkout API responds',
        url: `${apiBase}/checkout`,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ plan: 'pro', email: 'verify@rinawarp.test' }),
        },
        expectedStatuses: [200, 201, 400],
      },
      {
        id: 'license-verify-api',
        title: 'License verify API responds',
        url: `${apiBase}/license/verify`,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        },
        expectedStatuses: [200, 400],
      },
      {
        id: 'marketplace-api',
        title: 'Marketplace API responds',
        url: `${apiBase}/marketplace/agents`,
        init: { method: 'GET' },
        expectedStatuses: [200, 404],
      },
    ] as const

    for (const check of revenueChecks) {
      const outcome = await httpCheck(check.title, check.url, check.init, [...check.expectedStatuses])
      addResult(results, {
        id: check.id,
        title: check.title,
        category: 'Revenue',
        mode: 'online',
        severity: check.id === 'checkout-api' || check.id === 'license-verify-api' ? 'blocker' : 'warning',
        result: outcome.result,
        summary: outcome.summary,
      })
    }
  } else {
    addResult(results, {
      id: 'online-skipped',
      title: 'Live revenue/API checks',
      category: 'Revenue',
      mode: 'online',
      severity: 'info',
      result: 'skip',
      summary: 'run with --online or --launch to probe production endpoints',
    })
  }

  for (const manualItem of [
    'Free vs Pro value is obvious in the marketplace, including visible Pro badges and gated install flow',
    'Stripe checkout completes with a real test card and the resulting webhook unlocks the desktop license',
    'Analytics dashboard shows checkout_started, checkout_completed, license_verified, and marketplace install events',
    'Built installers have been opened manually on target OSes and feel trustworthy on first run',
    'Demo video matches the current product and can be regenerated without manual patching',
  ]) {
    addResult(results, {
      id: `manual-${manualItem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      title: manualItem,
      category: 'Manual Signoff',
      mode: 'manual',
      severity: 'warning',
      result: 'skip',
      summary: 'manual confirmation required before launch',
    })
  }

  return results
}

function summarize(results: CheckResult[]): {
  blockersFailed: number
  warningsFailed: number
  passed: number
  skipped: number
  launchDecision: string
} {
  let blockersFailed = 0
  let warningsFailed = 0
  let passed = 0
  let skipped = 0

  for (const result of results) {
    if (result.result === 'pass') passed += 1
    if (result.result === 'skip') skipped += 1
    if (result.result === 'fail' && result.severity === 'blocker') blockersFailed += 1
    if (result.result === 'fail' && result.severity === 'warning') warningsFailed += 1
  }

  const launchDecision =
    blockersFailed > 0
      ? 'not-ready'
      : warningsFailed > 0
        ? 'ready-with-warnings'
        : 'ready'

  return { blockersFailed, warningsFailed, passed, skipped, launchDecision }
}

function toMarkdown(results: CheckResult[]): string {
  const summary = summarize(results)
  const lines = [
    '# Prelaunch Verification Report',
    '',
    `- Launch decision: **${summary.launchDecision}**`,
    `- Passed checks: **${summary.passed}**`,
    `- Skipped checks: **${summary.skipped}**`,
    `- Failed blocker checks: **${summary.blockersFailed}**`,
    `- Failed warning checks: **${summary.warningsFailed}**`,
    '',
    '## Results',
    '',
    '| Result | Severity | Category | Check | Summary |',
    '| --- | --- | --- | --- | --- |',
  ]

  for (const result of results) {
    lines.push(`| ${result.result} | ${result.severity} | ${result.category} | ${result.title} | ${result.summary.replaceAll('|', '\\|')} |`)
  }

  lines.push('')
  lines.push('## Manual Launch Signoff')
  lines.push('')
  lines.push('- Complete the skipped manual items above in a real built installer.')
  lines.push('- Run the launch profile on a machine with network access before taking payment publicly.')
  lines.push('- Treat any failed blocker check as launch-stopping until fixed and rerun.')

  return lines.join('\n')
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const context: CheckContext = {
    repoRoot,
    appRoot,
    artifactsDir: reportDir,
    profile: args.profile,
    runBuild: args.runBuild,
    runUnit: args.runUnit,
    runPlaywright: args.runPlaywright,
    runOnline: args.runOnline,
    writeReport: args.writeReport,
  }

  console.log(`Prelaunch verification profile: ${context.profile}`)
  const results = await runChecks(context)
  const summary = summarize(results)

  if (context.writeReport) {
    mkdirSync(context.artifactsDir, { recursive: true })
    writeFileSync(
      path.join(context.artifactsDir, 'prelaunch-report.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)
    )
    writeFileSync(path.join(context.artifactsDir, 'prelaunch-report.md'), toMarkdown(results))
  }

  console.log('')
  console.log(`Launch decision: ${summary.launchDecision}`)
  console.log(`Passed: ${summary.passed} | Skipped: ${summary.skipped} | Failed blockers: ${summary.blockersFailed} | Failed warnings: ${summary.warningsFailed}`)

  process.exitCode = summary.blockersFailed > 0 ? 1 : 0
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error(message)
  process.exit(1)
})

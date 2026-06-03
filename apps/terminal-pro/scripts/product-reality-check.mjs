import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const appRoot = path.resolve(import.meta.dirname, '..')
const isDryRun = process.argv.includes('--dry-run')

const steps = [
  {
    name: 'Build Electron shell and static guards',
    command: 'npm',
    args: ['run', 'build:electron'],
  },
  {
    name: 'Guard product realness',
    command: 'npm',
    args: ['run', 'guard:product-realness'],
  },
  {
    name: 'Guard UI residue',
    command: 'npm',
    args: ['run', 'guard:ui-residue'],
  },
  {
    name: 'Plan risk regression',
    command: 'node',
    args: ['test/plan-risk.test.mjs'],
  },
  {
    name: 'Safe patch regression',
    command: 'node',
    args: ['test/rina-agent-safe-patch.test.mjs'],
  },
  {
    name: 'Linux dist and updater metadata',
    command: 'npm',
    args: ['run', 'dist'],
  },
  {
    name: 'Packaged core loop proof persistence',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/packaged-first-run.spec.ts', '--reporter=list'],
    env: {
      RINAWARP_E2E: '1',
      ELECTRON_DISABLE_SANDBOX: '1',
    },
  },
  {
    name: 'Safe mutation approval and rollback',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/safe-mutation.spec.ts', '--reporter=list'],
    env: {
      RINAWARP_E2E: '1',
      ELECTRON_DISABLE_SANDBOX: '1',
    },
  },
  {
    name: 'Production environment audit',
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/production-env-audit.spec.ts', '--reporter=list'],
    env: {
      ELECTRON_DISABLE_SANDBOX: '1',
    },
  },
  {
    name: 'Release metadata',
    command: 'npm',
    args: ['run', 'release:metadata'],
  },
  {
    name: 'Verify update artifacts',
    command: 'npm',
    args: ['run', 'verify:update-artifacts'],
  },
  {
    name: 'Conversation memory reality',
    command: 'node',
    args: ['test/conversation-memory.test.mjs'],
  },
  {
    name: 'Memory redaction reality',
    command: 'node',
    args: ['test/memory-redaction.test.mjs'],
  },
  {
    name: 'Project memory learning reality',
    command: 'node',
    args: ['test/project-memory-learning.test.mjs'],
  },
]

function commandLine(step) {
  return [step.command, ...step.args].join(' ')
}

console.log('[product-reality-check] RinaWarp Terminal Pro final product gate')
console.log(`[product-reality-check] cwd: ${appRoot}`)

for (const [index, step] of steps.entries()) {
  console.log(`\n[product-reality-check] ${index + 1}/${steps.length}: ${step.name}`)
  console.log(`[product-reality-check] $ ${commandLine(step)}`)

  if (isDryRun) continue

  const result = spawnSync(step.command, step.args, {
    cwd: appRoot,
    env: {
      ...process.env,
      FORCE_COLOR: undefined,
      NO_COLOR: undefined,
      ELECTRON_RUN_AS_NODE: undefined,
      ...step.env,
    },
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    const code = result.status ?? 1
    console.error(`\n[product-reality-check] FAILED: ${step.name} (${commandLine(step)})`)
    process.exit(code)
  }
}

if (isDryRun) {
  console.log('\n[product-reality-check] dry run complete')
} else {
  console.log('\n[product-reality-check] PASS: product core is real for the Linux packaged gate')
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

const localArtifacts = [
  'scripts/build/*.code-workspace',
  '.playwright-mcp/',
  'test-results/',
  'release-artifacts/',
  'apps/terminal-pro/test-results/',
  'apps/terminal-pro/e2e/videos/',
  'apps/terminal-pro/.playwright/',
]

const commands = [
  // Remove Playwright MCP artifacts
  'rm -rf .playwright-mcp',
  // Remove test results
  'rm -rf apps/terminal-pro/test-results',
  'rm -rf test-results',
  // Remove Playwright videos/screenshots (keep source specs)
  'rm -rf apps/terminal-pro/e2e/videos',
  'rm -rf apps/terminal-pro/.playwright',
  // Remove release artifacts
  'rm -rf release-artifacts',
  // Remove package manager temp
  'rm -rf apps/terminal-pro/.vite',
  'rm -rf apps/terminal-pro/out',
  'rm -rf website/.pages-dist',
]

console.log('[founder:clean-local] Removing local-only artifacts...')

let failed = false
for (const cmd of commands) {
  try {
    execSync(cmd, { cwd: repoRoot, stdio: 'pipe' })
  } catch {
    // Ignore errors for missing directories
  }
}

// Check for workspace files in scripts/build
const buildDir = path.join(repoRoot, 'scripts/build')
if (fs.existsSync(buildDir)) {
  const workspacePattern = /\.code-workspace$/
  for (const entry of fs.readdirSync(buildDir)) {
    if (workspacePattern.test(entry)) {
      const filePath = path.join(buildDir, entry)
      try {
        fs.unlinkSync(filePath)
        console.log(`[founder:clean-local] Removed: ${entry}`)
      } catch (e) {
        console.error(`[founder:clean-local] Failed to remove ${entry}: ${e}`)
        failed = true
      }
    }
  }
}

console.log('[founder:clean-local] Done.')
if (failed) process.exit(1)
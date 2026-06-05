#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

async function main() {
  const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const installerRoot = path.join(appRoot, 'dist-electron', 'installer')
  const linuxUnpackedBinary = path.join(installerRoot, 'linux-unpacked', 'rinawarp-terminal-pro')
  const appImage = path.join(installerRoot, 'RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage')
  const appPath = process.env.RINAWARP_PACKAGED_APP_PATH
    ? path.resolve(process.env.RINAWARP_PACKAGED_APP_PATH)
    : fs.existsSync(linuxUnpackedBinary)
      ? linuxUnpackedBinary
      : appImage

  const forbiddenPatterns = [
    /SQLite unavailable/i,
    /falling back to JSON-backed operational memory/i,
    /NODE_MODULE_VERSION/i,
  ]

  if (!fs.existsSync(appPath)) {
    console.error(`[verify-packaged-sqlite] Packaged app not found: ${appPath}`)
    process.exit(1)
  }

  try {
    fs.chmodSync(appPath, 0o755)
  } catch {
    // ignore chmod errors - may already be executable
  }

  const timeoutMs = Number(process.env.RINAWARP_PACKAGED_SMOKE_TIMEOUT_MS || 12_000)
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-packaged-sqlite-'))
  const logPath = path.join(tempHome, 'packaged.log')
  const logStream = fs.createWriteStream(logPath, { flags: 'a' })
  const hasXvfb = process.platform === 'linux' && spawnSync('bash', ['-lc', 'command -v xvfb-run >/dev/null 2>&1']).status === 0

  const command = hasXvfb ? 'xvfb-run' : appPath
  const args = hasXvfb ? ['-a', appPath] : []
  const child = spawn(command, args, {
    env: {
      ...process.env,
      CI: '1',
      ELECTRON_DISABLE_SANDBOX: '1',
      HOME: tempHome,
      XDG_CONFIG_HOME: path.join(tempHome, '.config'),
      RINAWARP_E2E: '1',
      E2E_TEST: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let exited = false
  let exitCode = null

  child.on('exit', (code) => {
    exited = true
    exitCode = code
  })

  child.stdout.pipe(logStream)
  child.stderr.pipe(logStream)

  await new Promise((resolve) => setTimeout(resolve, timeoutMs))

  // Kill child if still running
  if (!exited) {
    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }
  }

  logStream.end()
  await new Promise((resolve) => logStream.on('finish', resolve))

  const logs = fs.readFileSync(logPath, 'utf8')
  const matched = forbiddenPatterns.find((pattern) => pattern.test(logs))

  if (matched) {
    console.error('[verify-packaged-sqlite] Packaged app used an invalid memory backend.')
    console.error(`[verify-packaged-sqlite] Matched: ${matched}`)
    console.error(`[verify-packaged-sqlite] Log: ${logPath}`)
    process.exit(1)
  }

  console.log(`[verify-packaged-sqlite] PASS: no packaged SQLite fallback or ABI mismatch found in ${appPath}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[verify-packaged-sqlite] Unexpected error:', err)
  process.exit(1)
})
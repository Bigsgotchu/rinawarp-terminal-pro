#!/usr/bin/env node
/**
 * Pre-flight checks for installed-user upgrade: FROM_VERSION -> TO_VERSION (AppImage + GitHub feed).
 * Does not replace manual detect/download/restart/Agent Thread proof on a desktop session.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps', 'terminal-pro', 'package.json'), 'utf8'))

const FROM_VERSION = process.env.FROM_VERSION || '1.7.2-beta'
const TO_VERSION = process.env.TO_VERSION || String(pkg.version)
const REPO = process.env.GITHUB_REPOSITORY || 'Bigsgotchu/rinawarp-terminal-pro'
const RELEASES_BASE = `https://github.com/${REPO}/releases`
const LATEST_FEED = `${RELEASES_BASE}/latest/download`

function fail(message) {
  console.error(`[verify:updater-upgrade] ${message}`)
  process.exitCode = 1
}

function ok(message) {
  console.log(`[verify:updater-upgrade] ${message}`)
}

function compareVersions(left, right) {
  const leftParts = left.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part))
  const rightParts = right.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part))
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index]
    const b = rightParts[index]
    if (a === undefined && b === undefined) return 0
    if (a === undefined) return -1
    if (b === undefined) return 1
    if (a === b) continue
    if (typeof a === 'number' && typeof b === 'number') return a > b ? 1 : -1
    return String(a).localeCompare(String(b))
  }
  return 0
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: '*/*' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

async function headOk(url) {
  const response = await fetch(url, { method: 'HEAD' })
  return response.ok
}

async function main() {
  ok(`Checking upgrade path ${FROM_VERSION} -> ${TO_VERSION}`)

  const fromTag = `v${FROM_VERSION}`
  const fromAppImage = `${RELEASES_BASE}/download/${fromTag}/RinaWarp-Terminal-Pro-${FROM_VERSION}.AppImage`
  if (!(await headOk(fromAppImage))) fail(`Missing baseline AppImage: ${fromAppImage}`)
  else ok(`Baseline AppImage reachable: ${fromAppImage}`)

  const linuxYml = await fetchText(`${LATEST_FEED}/latest-linux.yml`)
  const feedVersion = linuxYml.match(/^version:\s*(.+)$/m)?.[1]?.trim()
  if (!feedVersion) fail('latest-linux.yml missing version')
  if (feedVersion !== TO_VERSION) {
    fail(`GitHub latest feed is ${feedVersion}, expected ${TO_VERSION}`)
  }
  ok(`GitHub latest/download serves ${feedVersion}`)

  if (compareVersions(TO_VERSION, FROM_VERSION) <= 0) {
    fail(`${TO_VERSION} is not newer than ${FROM_VERSION} by compareVersions`)
  }
  ok(`${TO_VERSION} is newer than ${FROM_VERSION}`)

  const channels = await fetchText('https://rinawarptech.com/releases.json').then(JSON.parse)
  const beta = channels?.beta
  if (!beta?.version || beta.version !== TO_VERSION) {
    fail(`releases.json beta channel is not ${TO_VERSION} (got ${beta?.version ?? 'null'})`)
  }
  ok(`releases.json beta advertises ${beta.version} with GitHub URLs`)

  const releasesJson = await fetchText(`${LATEST_FEED}/latest.json`).then(JSON.parse)
  if (String(releasesJson.version) !== TO_VERSION) {
    fail(`latest.json version ${releasesJson.version} != ${TO_VERSION}`)
  }
  ok('latest.json matches target version')

  console.log('')
  console.log('Manual proof (required for operational sign-off):')
  console.log(`  1. chmod +x RinaWarp-Terminal-Pro-${FROM_VERSION}.AppImage && run it (AppImage, not .deb)`)
  console.log('  2. Settings -> Updates -> channel Beta -> Check for updates')
  console.log(`  3. Confirm update offered: ${TO_VERSION}`)
  console.log('  4. Download, restart, confirm About shows new version')
  console.log('  5. Agent Thread: open repo, send one message, confirm reply')
  console.log('')
  console.log('Note: Stable channel uses electron-updater with allowPrerelease=false; beta builds require Beta channel.')
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})

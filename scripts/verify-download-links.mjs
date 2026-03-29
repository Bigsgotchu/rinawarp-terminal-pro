import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const appPackageJsonPath = path.join(repoRoot, 'apps', 'terminal-pro', 'package.json')
const installerDir = path.join(repoRoot, 'apps', 'terminal-pro', 'dist-electron', 'installer')

function fail(message) {
  throw new Error(`[verify:downloads] ${message}`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function sha256Hex(filePath) {
  const hash = createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`Missing ${label}: ${filePath}`)
  return filePath
}

function parseChecksums(checksumsPath) {
  const raw = fs.readFileSync(checksumsPath, 'utf8')
  const entries = new Map()
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^([a-f0-9]{64})\s+\*?(.+)$/i)
    if (!match) fail(`Malformed checksum line in ${checksumsPath}: ${trimmed}`)
    entries.set(match[2], match[1].toLowerCase())
  }
  return entries
}

function main() {
  const pkg = readJson(appPackageJsonPath)
  const version = String(pkg.version)

  const appImageName = `RinaWarp-Terminal-Pro-${version}.AppImage`
  const debName = `RinaWarp-Terminal-Pro-${version}.deb`
  const exeName = `RinaWarp-Terminal-Pro-${version}.exe`

  const appImagePath = requireFile(path.join(installerDir, appImageName), 'AppImage artifact')
  const debPath = requireFile(path.join(installerDir, debName), '.deb artifact')
  const exePath = requireFile(path.join(installerDir, exeName), '.exe artifact')
  const checksumsPath = requireFile(path.join(installerDir, 'SHASUMS256.txt'), 'checksum manifest')
  const latestJsonPath = requireFile(path.join(installerDir, 'latest.json'), 'latest.json metadata')
  const latestYmlPath = requireFile(path.join(installerDir, 'latest.yml'), 'latest.yml metadata')
  const latestLinuxYmlPath = requireFile(path.join(installerDir, 'latest-linux.yml'), 'latest-linux.yml metadata')

  const checksums = parseChecksums(checksumsPath)
  const expectedArtifacts = [
    [appImageName, appImagePath],
    [debName, debPath],
    [exeName, exePath],
  ]

  for (const [artifactName, artifactPath] of expectedArtifacts) {
    const expectedHash = checksums.get(artifactName)
    if (!expectedHash) fail(`Checksum manifest does not contain ${artifactName}`)
    const actualHash = sha256Hex(artifactPath)
    if (actualHash !== expectedHash) {
      fail(`Checksum mismatch for ${artifactName}: expected ${expectedHash}, got ${actualHash}`)
    }
  }

  const latestJson = readJson(latestJsonPath)
  if (String(latestJson.version) !== version) {
    fail(`latest.json version ${String(latestJson.version)} does not match package version ${version}`)
  }
  if (String(latestJson.files?.linux?.name || '') !== appImageName) {
    fail(`latest.json linux artifact does not match ${appImageName}`)
  }
  if (String(latestJson.files?.deb?.name || '') !== debName) {
    fail(`latest.json deb artifact does not match ${debName}`)
  }
  if (String(latestJson.files?.windows?.name || '') !== exeName) {
    fail(`latest.json windows artifact does not match ${exeName}`)
  }

  const latestYml = fs.readFileSync(latestYmlPath, 'utf8')
  if (!latestYml.includes(`version: ${version}`) || !latestYml.includes(`path: ${exeName}`)) {
    fail(`latest.yml does not match version ${version} and artifact ${exeName}`)
  }

  const latestLinuxYml = fs.readFileSync(latestLinuxYmlPath, 'utf8')
  if (!latestLinuxYml.includes(`version: ${version}`) || !latestLinuxYml.includes(`path: ${appImageName}`)) {
    fail(`latest-linux.yml does not match version ${version} and artifact ${appImageName}`)
  }

  console.log(`[verify:downloads] Release artifacts for v${version} are coherent`)
}

main()

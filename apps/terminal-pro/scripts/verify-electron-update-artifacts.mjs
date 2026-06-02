import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = path.resolve(import.meta.dirname, '..')
const installerDir = path.join(appRoot, 'dist-electron', 'installer')
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
const version = String(packageJson.version)

function fail(message) {
  console.error(`[verify:update-artifacts] ${message}`)
  process.exit(1)
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`Missing ${label}: ${filePath}`)
  return filePath
}

function parseScalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : ''
}

function parseReferencedArtifactNames(text) {
  const names = new Set()
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:-\s*)?(?:url|path):\s*(.+?)\s*$/)
    if (!match) continue
    const value = match[1].trim().replace(/^['"]|['"]$/g, '')
    const fileName = path.basename(value.replace(/[?#].*$/, ''))
    if (fileName) names.add(fileName)
  }
  return [...names]
}

function sha512Base64(filePath) {
  return createHash('sha512').update(fs.readFileSync(filePath)).digest('base64')
}

const escapedVersion = String(version).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const appImageCandidates = fs
  .readdirSync(installerDir)
  .filter((name) => new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}(?:-linux-x86_64|-linux-amd64)?\\.AppImage$`, 'i').test(name))
if (appImageCandidates.length === 0) {
  fail(`Missing AppImage for v${version} in ${installerDir}`)
}
const appImageName = appImageCandidates[0]
const appImagePath = requireFile(path.join(installerDir, appImageName), 'AppImage artifact')
const debCandidates = fs
  .readdirSync(installerDir)
  .filter((name) => new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}(?:-linux-(?:x86_64|amd64))?\\.deb$`, 'i').test(name))
const debName = debCandidates[0]
if (!debName) {
  fail(`Missing .deb artifact for v${version} in ${installerDir}`)
}
requireFile(path.join(installerDir, debName), '.deb artifact')

const latestLinuxPath = requireFile(path.join(installerDir, 'latest-linux.yml'), 'latest-linux.yml')
const latestLinux = fs.readFileSync(latestLinuxPath, 'utf8')
const metadataVersion = parseScalar(latestLinux, 'version')
if (metadataVersion !== version) {
  fail(`latest-linux.yml version ${metadataVersion || '(missing)'} does not match package version ${version}`)
}

const referencedNames = parseReferencedArtifactNames(latestLinux)
if (!referencedNames.includes(appImageName)) {
  fail(`latest-linux.yml does not reference ${appImageName}`)
}

for (const fileName of referencedNames) {
  requireFile(path.join(installerDir, fileName), `referenced artifact ${fileName}`)
}

const metadataSha512 = parseScalar(latestLinux, 'sha512')
if (!metadataSha512) fail('latest-linux.yml is missing sha512')

const actualSha512 = sha512Base64(appImagePath)
if (metadataSha512 !== actualSha512) {
  fail(`latest-linux.yml sha512 does not match ${appImageName}`)
}

console.log(`[verify:update-artifacts] Updater metadata is fresh for v${version}`)

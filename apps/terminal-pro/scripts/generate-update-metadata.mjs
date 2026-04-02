import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = path.resolve(import.meta.dirname, '..')
const installerDir = path.join(appRoot, 'dist-electron', 'installer')
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
const version = String(packageJson.version)

function findArtifact(patterns) {
  for (const pattern of patterns) {
    const found = fs.readdirSync(installerDir).find((entry) => pattern.test(entry))
    if (found) return found
  }
  return null
}

async function hashArtifact(filePath, algorithm, encoding) {
  const hash = createHash(algorithm)
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  return hash.digest(encoding)
}

function getArtifactPatterns(version) {
  const escapedVersion = version.replaceAll('.', '\\.')
  return {
    linux: [new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}\\.AppImage$`, 'i')],
    deb: [new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}\\.deb$`, 'i')],
    windows: [new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}\\.exe$`, 'i')],
  }
}

function toYaml({ version, pubDate, fileName, size, sha512 }) {
  return [
    `version: ${version}`,
    `files:`,
    `  - url: ${fileName}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${fileName}`,
    `sha512: ${sha512}`,
    `releaseDate: '${pubDate}'`,
    '',
  ].join('\n')
}

function resolveArtifacts(version) {
  const patterns = getArtifactPatterns(version)
  const linuxName = findArtifact(patterns.linux) || ''
  const debName = findArtifact(patterns.deb) || ''
  const windowsName = findArtifact(patterns.windows) || ''
  if (!linuxName || !windowsName) {
    throw new Error(`Missing required artifacts for ${version}. Expected AppImage and .exe in ${installerDir}`)
  }
  return {
    linux: {
      name: linuxName,
      path: path.join(installerDir, linuxName),
    },
    deb: debName
      ? {
          name: debName,
          path: path.join(installerDir, debName),
        }
      : null,
    windows: {
      name: windowsName,
      path: path.join(installerDir, windowsName),
    },
  }
}

async function enrichArtifact(artifact) {
  if (!artifact) return null
  const stats = fs.statSync(artifact.path)
  return {
    ...artifact,
    bytes: stats.size,
    sha512: await hashArtifact(artifact.path, 'sha512', 'base64'),
    sha256: await hashArtifact(artifact.path, 'sha256', 'hex'),
  }
}

async function collectArtifactMetadata(version) {
  const artifacts = resolveArtifacts(version)
  return {
    linux: await enrichArtifact(artifacts.linux),
    deb: await enrichArtifact(artifacts.deb),
    windows: await enrichArtifact(artifacts.windows),
  }
}

function ensureOutputDirs() {
  fs.mkdirSync(installerDir, { recursive: true })
  fs.mkdirSync(path.join(installerDir, 'stable'), { recursive: true })
}

function buildLatestJson(version, pubDate, artifacts) {
  return {
    schemaVersion: 1,
    product: 'terminal-pro',
    version,
    notes: `RinaWarp Terminal Pro v${version}`,
    pub_date: pubDate,
    files: {
      checksums: {
        name: 'SHASUMS256.txt',
        path: `releases/${version}/SHASUMS256.txt`,
      },
      linux: {
        name: artifacts.linux.name,
        path: `releases/${version}/${artifacts.linux.name}`,
        sha256: artifacts.linux.sha256,
        bytes: artifacts.linux.bytes,
      },
      ...(artifacts.deb
        ? {
            deb: {
              name: artifacts.deb.name,
              path: `releases/${version}/${artifacts.deb.name}`,
              sha256: artifacts.deb.sha256,
              bytes: artifacts.deb.bytes,
            },
          }
        : {}),
      windows: {
        name: artifacts.windows.name,
        path: `releases/${version}/${artifacts.windows.name}`,
        sha256: artifacts.windows.sha256,
        bytes: artifacts.windows.bytes,
      },
    },
    platforms: {
      'linux-x86_64': {
        signature: '',
        url: `releases/${version}/${artifacts.linux.name}`,
      },
    },
  }
}

function buildChecksums(artifacts) {
  return [
    `${artifacts.linux.sha256}  ${artifacts.linux.name}`,
    ...(artifacts.deb ? [`${artifacts.deb.sha256}  ${artifacts.deb.name}`] : []),
    `${artifacts.windows.sha256}  ${artifacts.windows.name}`,
  ].join('\n') + '\n'
}

function writeUpdaterMetadata({ latestYml, latestLinuxYml, latestJson, checksums }) {
  const stableDir = path.join(installerDir, 'stable')
  fs.writeFileSync(path.join(installerDir, 'latest.yml'), latestYml, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'latest-linux.yml'), latestLinuxYml, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'latest.json'), JSON.stringify(latestJson, null, 2), 'utf8')
  fs.writeFileSync(path.join(installerDir, 'SHASUMS256.txt'), checksums, 'utf8')
  fs.writeFileSync(path.join(stableDir, 'latest.yml'), latestYml, 'utf8')
  fs.writeFileSync(path.join(stableDir, 'latest-linux.yml'), latestLinuxYml, 'utf8')
  fs.writeFileSync(path.join(stableDir, 'latest.json'), JSON.stringify(latestJson, null, 2), 'utf8')
}

async function main() {
  const pubDate = new Date().toISOString()
  const artifacts = await collectArtifactMetadata(version)

  ensureOutputDirs()

  const latestYml = toYaml({
    version,
    pubDate,
    fileName: artifacts.windows.name,
    size: artifacts.windows.bytes,
    sha512: artifacts.windows.sha512,
  })

  const latestLinuxYml = toYaml({
    version,
    pubDate,
    fileName: artifacts.linux.name,
    size: artifacts.linux.bytes,
    sha512: artifacts.linux.sha512,
  })

  const latestJson = buildLatestJson(version, pubDate, artifacts)
  const checksums = buildChecksums(artifacts)

  writeUpdaterMetadata({ latestYml, latestLinuxYml, latestJson, checksums })

  console.log(`Generated updater metadata for v${version}`)
  console.log(`- ${path.join(installerDir, 'latest.yml')}`)
  console.log(`- ${path.join(installerDir, 'latest-linux.yml')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

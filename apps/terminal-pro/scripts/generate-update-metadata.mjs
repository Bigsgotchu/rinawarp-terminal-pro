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

async function sha512Base64ForArtifact(filePath) {
  const hash = createHash('sha512')
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  return hash.digest('base64')
}

async function sha256HexForArtifact(filePath) {
  const hash = createHash('sha256')
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  return hash.digest('hex')
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

async function main() {
  const pubDate = new Date().toISOString()
  const escapedVersion = version.replaceAll('.', '\\.')
  const linuxName = findArtifact([new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}\\.AppImage$`, 'i')]) || ''
  const debName = findArtifact([new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}\\.deb$`, 'i')]) || ''
  const windowsName = findArtifact([new RegExp(`^RinaWarp-Terminal-Pro-${escapedVersion}\\.exe$`, 'i')]) || ''

  if (!linuxName || !windowsName) {
    throw new Error(`Missing required artifacts for ${version}. Expected AppImage and .exe in ${installerDir}`)
  }

  const linuxPath = path.join(installerDir, linuxName)
  const windowsPath = path.join(installerDir, windowsName)
  const debPath = debName ? path.join(installerDir, debName) : null

  const linuxSha512 = await sha512Base64ForArtifact(linuxPath)
  const windowsSha512 = await sha512Base64ForArtifact(windowsPath)
  const linuxSha256 = await sha256HexForArtifact(linuxPath)
  const windowsSha256 = await sha256HexForArtifact(windowsPath)
  const debSha256 = debPath ? await sha256HexForArtifact(debPath) : null

  fs.mkdirSync(installerDir, { recursive: true })
  fs.mkdirSync(path.join(installerDir, 'stable'), { recursive: true })

  const latestYml = toYaml({
    version,
    pubDate,
    fileName: windowsName,
    size: fs.statSync(windowsPath).size,
    sha512: windowsSha512,
  })

  const latestLinuxYml = toYaml({
    version,
    pubDate,
    fileName: linuxName,
    size: fs.statSync(linuxPath).size,
    sha512: linuxSha512,
  })

  const latestJson = {
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
        name: linuxName,
        path: `releases/${version}/${linuxName}`,
        sha256: linuxSha256,
        bytes: fs.statSync(linuxPath).size,
      },
      ...(debPath
        ? {
            deb: {
              name: debName,
              path: `releases/${version}/${debName}`,
              sha256: debSha256,
              bytes: fs.statSync(debPath).size,
            },
          }
        : {}),
      windows: {
        name: windowsName,
        path: `releases/${version}/${windowsName}`,
        sha256: windowsSha256,
        bytes: fs.statSync(windowsPath).size,
      },
    },
    platforms: {
      'linux-x86_64': {
        signature: '',
        url: `releases/${version}/${linuxName}`,
      },
    },
  }

  const checksums = [
    `${linuxSha256}  ${linuxName}`,
    ...(debPath && debSha256 && debName ? [`${debSha256}  ${debName}`] : []),
    `${windowsSha256}  ${windowsName}`,
  ].join('\n') + '\n'

  fs.writeFileSync(path.join(installerDir, 'latest.yml'), latestYml, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'latest-linux.yml'), latestLinuxYml, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'latest.json'), JSON.stringify(latestJson, null, 2), 'utf8')
  fs.writeFileSync(path.join(installerDir, 'SHASUMS256.txt'), checksums, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'stable', 'latest.yml'), latestYml, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'stable', 'latest-linux.yml'), latestLinuxYml, 'utf8')
  fs.writeFileSync(path.join(installerDir, 'stable', 'latest.json'), JSON.stringify(latestJson, null, 2), 'utf8')

  console.log(`Generated updater metadata for v${version}`)
  console.log(`- ${path.join(installerDir, 'latest.yml')}`)
  console.log(`- ${path.join(installerDir, 'latest-linux.yml')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

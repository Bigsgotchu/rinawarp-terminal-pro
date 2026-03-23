import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const preloadPath = path.join(projectRoot, 'src/preload.ts')
const mainRoot = path.join(projectRoot, 'src/main')
const mainEntryPath = path.join(projectRoot, 'src/main.ts')

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function walkTsFiles(rootDir) {
  const results = []
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (entry.isFile() && /\.(ts|tsx|mjs|cjs|js)$/.test(entry.name)) results.push(fullPath)
    }
  }
  return results
}

function parseStringSet(source, setName) {
  const match = source.match(new RegExp(`const\\s+${setName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`, 'm'))
  if (!match) {
    throw new Error(`Could not find ${setName} in preload.ts`)
  }
  return new Set([...match[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((entry) => entry[1]))
}

function parsePreloadInvokeChannels(source) {
  return new Set([...source.matchAll(/ipcRenderer\.invoke\(\s*['"`]([^'"`]+)['"`]/g)].map((entry) => entry[1]))
}

function parseMainHandledChannels(files) {
  const channels = new Map()
  const pattern = /ipcMain\.(?:handle|on)\(\s*['"`]([^'"`]+)['"`]/g
  for (const file of files) {
    const relPath = path.relative(projectRoot, file)
    const source = read(file)
    for (const match of source.matchAll(pattern)) {
      const channel = match[1]
      const owners = channels.get(channel) || []
      owners.push(relPath)
      channels.set(channel, owners)
    }
  }
  return channels
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

const preloadSource = read(preloadPath)
const allowedInvokeChannels = parseStringSet(preloadSource, 'ALLOWED_INVOKE_CHANNELS')
const preloadInvokeChannels = parsePreloadInvokeChannels(preloadSource)
const mainHandledChannels = parseMainHandledChannels([mainEntryPath, ...walkTsFiles(mainRoot)])

const channelsInvokedButNotAllowed = sorted(
  [...preloadInvokeChannels].filter((channel) => !allowedInvokeChannels.has(channel))
)
const allowedButNotInvoked = sorted([...allowedInvokeChannels].filter((channel) => !preloadInvokeChannels.has(channel)))
const invokedButNotHandled = sorted(
  [...preloadInvokeChannels].filter((channel) => !mainHandledChannels.has(channel))
)

if (
  channelsInvokedButNotAllowed.length > 0 ||
  invokedButNotHandled.length > 0
) {
  console.error('IPC contract audit failed.')
  if (channelsInvokedButNotAllowed.length > 0) {
    console.error('\nInvoked in preload but not allowlisted:')
    for (const channel of channelsInvokedButNotAllowed) console.error(` - ${channel}`)
  }
  if (invokedButNotHandled.length > 0) {
    console.error('\nInvoked in preload but missing a main-process handler:')
    for (const channel of invokedButNotHandled) console.error(` - ${channel}`)
  }
  process.exit(1)
}

if (allowedButNotInvoked.length > 0) {
  console.warn('IPC contract audit warnings:')
  console.warn('\nAllowlisted in preload but not exposed through preload invoke wrappers:')
  for (const channel of allowedButNotInvoked) console.warn(` - ${channel}`)
}

console.log(`IPC contracts OK. ${preloadInvokeChannels.size} invoke channels checked.`)

import fs from 'node:fs'
import path from 'node:path'

const ipcDir = path.resolve('src/main/ipc')
const canonicalFiles = new Set([
  'index.ts',
  'registerConsolidatedIpcHandlers.ts',
  'registerLicenseIpc.ts',
  'registerTerminalIpc.ts',
  'registerAgentExecutionIpc.ts',
  'secure-agent.ts',
  'safe-handler.ts',
])

const forbiddenFiles = ['consolidatedIndex.ts', 'registerAllIpc.ts', 'router.ts']
const presentForbidden = forbiddenFiles.filter((file) => fs.existsSync(path.join(ipcDir, file)))
if (presentForbidden.length > 0) {
  console.error('Forbidden legacy IPC files found:')
  for (const file of presentForbidden) console.error(` - src/main/ipc/${file}`)
  process.exit(1)
}

const registrations = new Map()
for (const file of fs.readdirSync(ipcDir)) {
  if (!file.endsWith('.ts') || !canonicalFiles.has(file)) continue
  const source = fs.readFileSync(path.join(ipcDir, file), 'utf8')
  const pattern = /ipcMain\.(?:handle|on)\(\s*['"`]([^'"`]+)['"`]/g
  for (const match of source.matchAll(pattern)) {
    const channel = match[1]
    const owners = registrations.get(channel) || []
    owners.push(file)
    registrations.set(channel, owners)
  }
}

const duplicates = [...registrations.entries()].filter(([, owners]) => owners.length > 1)
if (duplicates.length > 0) {
  console.error('Duplicate IPC channel registrations detected:')
  for (const [channel, owners] of duplicates) {
    console.error(` - ${channel}: ${owners.join(', ')}`)
  }
  process.exit(1)
}

console.log('IPC registration surfaces OK.')

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rendererRoot = path.join(__dirname, '..', 'src', 'renderer', 'styles')

// Allowlist for selectors that can use 999px radius (tiny status indicators)
const statusIndicatorAllowlist = [
  '.status', '.badge', '.pill', '.dot', '.count', '.rw-status-dot', '.status-dot',
  '.rw-market-badge', '.rw-run-status', '.rw-run-note', '.rw-market-summary-pill',
  '.rw-run-status-dot', '.rw-run-status-dot-ok', '.rw-run-status-dot-running',
  '.rw-run-status-dot-failed', '.rw-run-status-dot-interrupted', '.rw-status',
  '.rw-runtime-pill', '.stream-status--thinking', '.stream-status--running',
  '.stream-accent', '.rw-chip'
]

// Blocked border-radius values for non-status elements
const blockedBorderRadius = [
  { value: '24px', description: 'oversized radius (24px)' },
  { value: '18px', description: 'bubbly radius (18px)' },
  { value: '16px', description: 'card-heavy radius (16px)' },
]

// Blocked backgrounds on shell/app classes
const blockedBackgrounds = [
  { value: 'background: white', description: 'white fallback surface' },
  { value: 'background: #fff', description: 'white (#fff) fallback surface' },
]

// Blocked user-facing terminology
const blockedTerminology = [
  { value: 'Rina workbench', description: 'workbench terminology' },
  { value: 'AI workbench', description: 'workbench terminology' },
  { value: 'Receipt Viewer', description: 'receipt terminology' },
  { value: 'Execution Trace', description: 'execution trace terminology' },
]

let failed = false

function fail(message) {
  failed = true
  console.error(`- ${message}`)
}

function walk(dir, extensions = ['.css']) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(entryPath, extensions))
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(entryPath)
    }
  }
  return files
}

function checkBorderRadius(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const blocked of blockedBorderRadius) {
      if (line.includes(`border-radius: ${blocked.value}`)) {
        // Check if this line is for an allowed selector
        const isAllowed = statusIndicatorAllowlist.some(allow => {
          // Check if the selector prefix is on this line or previous lines (within same rule)
          if (line.includes(allow)) return true
          // Check previous lines for selector
          for (let j = i - 1; j >= 0; j--) {
            if (lines[j].includes(allow)) return true
            // Stop if we hit another selector block
            if (lines[j].includes('{') && !lines[j].includes('border-radius')) break
          }
          return false
        })
        if (!isAllowed) {
          fail(`${path.relative(rendererRoot, filePath)}:${i + 1} has ${blocked.description}`)
        }
      }
    }
  }
}

function checkBackgrounds(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const blocked of blockedBackgrounds) {
      if (line.includes(blocked.value)) {
        // Check if this is on a shell/app/body class
        const isShellContext = /html.*body|\.rw-panel|\.rw-sidebar|\.rw-workbench|\.stream-bubble|\.rw-card|\.rw-run-block/.test(line)
        if (isShellContext) {
          fail(`${path.relative(rendererRoot, filePath)}:${i + 1} has ${blocked.description}`)
        }
      }
    }
  }
}

function checkTerminology() {
  const rendererFiles = walk(path.join(__dirname, '..', 'src', 'renderer'))
  for (const filePath of rendererFiles) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const blocked of blockedTerminology) {
      if (content.includes(blocked.value)) {
        fail(`${path.relative(path.join(__dirname, '..', 'src', 'renderer'), filePath)} contains ${blocked.description}`)
      }
    }
  }
}

// Run checks
const cssFiles = walk(rendererRoot, ['.css'])
for (const filePath of cssFiles) {
  checkBorderRadius(filePath)
  checkBackgrounds(filePath)
}

checkTerminology()

if (failed) {
  console.error('Agent Shell style guard failed.')
  process.exit(1)
}

console.log('Agent Shell style guard passed.')
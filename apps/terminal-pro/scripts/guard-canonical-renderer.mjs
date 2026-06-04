import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const rendererRoot = path.join(appRoot, 'src/renderer')
const builtRendererRoot = path.join(appRoot, 'dist-electron/renderer')
const repoRoot = path.resolve(appRoot, '..', '..')

const requiredIndexPath = path.join(rendererRoot, 'index.html')
const requiredIndexTsPath = path.join(rendererRoot, 'index.ts')
const requiredIndexCssPath = path.join(rendererRoot, 'index.css')
const requiredRendererCssPath = path.join(rendererRoot, 'renderer.css')
const requiredThemeTokensPath = path.join(rendererRoot, 'workbench/theme.tokens.css')
const requiredProductUiLockPath = path.join(repoRoot, 'docs/PRODUCT_UI_LOCK.md')
const requiredBuiltRendererPath = path.join(builtRendererRoot, 'renderer.html')
const productionBootFiles = [
  requiredIndexTsPath,
  path.join(rendererRoot, 'bootstrap/initRenderer.ts'),
  path.join(rendererRoot, 'modern/initAgentShellRenderer.ts'),
  path.join(rendererRoot, 'workbench/render.ts'),
]

const removedFiles = [
  'main.tsx',
  'components/App.tsx',
  'index-conversation.html',
  'index-original.html',
  'components/conversation',
  'components/intent',
  'components/terminal',
  'components/layout',
]

const blockedRendererStrings = [
  'id="root"',
  "id='root'",
  'main.tsx',
  'App.tsx',
  'ChatScreen',
  'Ask Rina anything...',
  'legacy fallback',
  'legacyRendererFallback',
  'resolveLegacyRendererFallbackEnabled',
  'Receipt Viewer',
  'Runs Inspector',
  'Brain Inspector',
  'Diagnostics Inspector',
  'Execution Trace',
  'Resume fix',
  'Fix project button',
  'one-click Build project',
  'one-click Run tests',
  'Rina workbench',
  'AI workbench',
  'terminal wrapper',
  'button launcher',
]

const requiredVisualTokens = [
  '--bg-app',
  '--bg-panel',
  '--bg-elevated',
  '--text-primary',
  '--text-secondary',
  '--accent-pink',
  '--accent-cyan',
  '--accent-purple',
  '--success',
  '--warning',
  '--danger',
  '--border-subtle',
  '--glow-accent',
]

const requiredProductUiLockMarkers = [
  'RinaWarp Terminal Pro Product UI Lock',
  'Product: RinaWarp Terminal Pro',
  'AI copilot: Rina',
  'Desktop container: Agent Shell',
  'Primary user experience: Agent Thread',
  'white raw HTML shell',
  'Agent Thread is the visual focus',
]

let failed = false

function fail(message) {
  failed = true
  console.error(`- ${message}`)
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath))
    } else if (/\.(html|ts|tsx|js|mjs|css)$/.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

function relative(filePath) {
  return path.relative(appRoot, filePath)
}

function assertIndexContract() {
  if (!fs.existsSync(requiredIndexPath)) {
    fail('src/renderer/index.html is missing')
    return
  }

  const indexHtml = readText(requiredIndexPath)
  if (!indexHtml.includes('src="./index.ts"')) {
    fail('src/renderer/index.html must load ./index.ts')
  }
  if (indexHtml.includes('id="root"') || indexHtml.includes("id='root'")) {
    fail('src/renderer/index.html must not contain a React #root host')
  }
  if (indexHtml.includes('./main.tsx')) {
    fail('src/renderer/index.html must not load ./main.tsx')
  }
}

function assertStyleContract() {
  if (!fs.existsSync(requiredIndexTsPath)) {
    fail('src/renderer/index.ts is missing')
    return
  }
  if (!fs.existsSync(requiredIndexCssPath)) {
    fail('src/renderer/index.css is missing')
    return
  }
  if (!fs.existsSync(requiredRendererCssPath)) {
    fail('src/renderer/renderer.css is missing')
    return
  }
  if (!fs.existsSync(requiredThemeTokensPath)) {
    fail('src/renderer/workbench/theme.tokens.css is missing')
    return
  }

  const indexTs = readText(requiredIndexTsPath)
  if (!indexTs.includes("import './index.css'") && !indexTs.includes('import "./index.css"')) {
    fail('src/renderer/index.ts must import ./index.css')
  }

  const indexCss = readText(requiredIndexCssPath)
  if (!indexCss.includes("@import './renderer.css'") && !indexCss.includes('@import "./renderer.css"')) {
    fail('src/renderer/index.css must import ./renderer.css')
  }

  const rendererCss = readText(requiredRendererCssPath)
  if (!rendererCss.includes('./workbench/theme.tokens.css')) {
    fail('src/renderer/renderer.css must import canonical visual tokens')
  }
  if (!rendererCss.includes('./styles/renderer-agent.css')) {
    fail('src/renderer/renderer.css must include Agent Shell CSS')
  }
  if (!rendererCss.includes('html[data-rw-renderer="prod"] body') || !rendererCss.includes('background: var(--w-bg)')) {
    fail('src/renderer/renderer.css must keep the production Agent Shell dark')
  }

  const themeTokens = readText(requiredThemeTokensPath)
  for (const token of requiredVisualTokens) {
    if (!themeTokens.includes(token)) {
      fail(`src/renderer/workbench/theme.tokens.css is missing visual token: ${token}`)
    }
  }

  const agentCss = readText(path.join(rendererRoot, 'styles/renderer-agent-layout.css'))
  if (!agentCss.includes('.rw-agent-composer') || !agentCss.includes('.rw-agent-launch-empty')) {
    fail('Agent Shell CSS classes are missing from src/renderer/styles/renderer-agent-layout.css')
  }
}

function assertProductUiLockContract() {
  if (!fs.existsSync(requiredProductUiLockPath)) {
    fail('docs/PRODUCT_UI_LOCK.md is missing')
    return
  }

  const content = readText(requiredProductUiLockPath)
  for (const marker of requiredProductUiLockMarkers) {
    if (!content.includes(marker)) {
      fail(`docs/PRODUCT_UI_LOCK.md is missing required marker: ${marker}`)
    }
  }
  for (const token of requiredVisualTokens) {
    if (!content.includes(token)) {
      fail(`docs/PRODUCT_UI_LOCK.md is missing canonical token: ${token}`)
    }
  }
}

function assertProductionBootContract() {
  for (const filePath of productionBootFiles) {
    if (!fs.existsSync(filePath)) {
      fail(`${relative(filePath)} is missing`)
      continue
    }

    const content = readText(filePath)
    if (
      content.includes('legacy fallback') ||
      content.includes('legacyRendererFallback') ||
      content.includes('resolveLegacyRendererFallbackEnabled')
    ) {
      fail(`${relative(filePath)} uses legacy fallback`)
    }
  }
}

function assertRemovedFiles() {
  for (const file of removedFiles) {
    const filePath = path.join(rendererRoot, file)
    if (fs.existsSync(filePath)) {
      fail(`removed React renderer path still exists: src/renderer/${file}`)
    }
  }
}

function assertBlockedStrings() {
  for (const filePath of walkFiles(rendererRoot)) {
    const content = readText(filePath)
    for (const blockedString of blockedRendererStrings) {
      if (content.includes(blockedString)) {
        fail(`${relative(filePath)} contains blocked renderer string: ${blockedString}`)
      }
    }
  }
}

function assertBuiltRendererContract() {
  if (!fs.existsSync(requiredBuiltRendererPath)) {
    fail('dist-electron/renderer/renderer.html is missing; run build:electron before guard:canonical-renderer')
    return
  }

  const builtRendererHtml = readText(requiredBuiltRendererPath)
  if (builtRendererHtml.includes('id="root"') || builtRendererHtml.includes("id='root'")) {
    fail('dist-electron/renderer/renderer.html must not contain a React #root host')
  }
  if (!/<link\b[^>]+rel=["']stylesheet["'][^>]+\.css/.test(builtRendererHtml)) {
    fail('dist-electron/renderer/renderer.html must link built CSS')
  }

  const builtFiles = walkFiles(builtRendererRoot)
  const cssFiles = builtFiles.filter((filePath) => filePath.endsWith('.css'))
  if (cssFiles.length === 0) {
    fail('dist-electron/renderer must contain CSS assets')
  }

  for (const filePath of builtFiles) {
    const content = readText(filePath)
    if (content.includes('id="root"') || content.includes("id='root'")) {
      fail(`${relative(filePath)} must not contain a React #root host`)
    }
  }
}

assertIndexContract()
assertStyleContract()
assertProductUiLockContract()
assertProductionBootContract()
assertRemovedFiles()
assertBlockedStrings()
assertBuiltRendererContract()

if (failed) {
  console.error('Canonical renderer guard failed.')
  process.exit(1)
}

console.log('Canonical renderer guard passed.')

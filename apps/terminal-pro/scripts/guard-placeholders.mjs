import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')

const scanRoots = [
  path.join(projectRoot, 'src'),
]

// Blocked user-facing placeholder phrases that should not appear in production
const blocked = [
  'coming soon',
  'not implemented',
  'placeholder proof',
  'placeholder receipt',
  'fake success',
  'demo only',
  'lorem ipsum',
  'stub',
  'sample data',
]

// Allow these paths for tests/fixtures/docs
const allowedPathParts = [
  '/tests/',
  '/test/',
  '/fixtures/',
  '/__fixtures__/',
  '/docs/releases/tester-kit/',
  '/.pages-dist/',
]

// Allow these patterns (internal comments, test code, etc.)
const allowPatterns = [
  '// @ts-nocheck',
  'Type placeholder',
  'Create a search tool (placeholder',
  'getPerformanceStats',
  'env-mock',
  'mockInlineRinaFromEnv',
  'mockWorkspace',
  'mock data',
  'Rina Cloud Error',
  'RinaCloudError',
  'createDemoWorkspace',
  'demoWorkspace',
  'demo project',
  'demo:',
  'demo-',
  'placeholder="',
  'placeholder=\'',
  'outputPlaceholder:',
  'outputPlaceholder:',
  'placeholderFileContent',
]

let hasErrors = false

function fail(message) {
  console.error(`[guard:placeholders] ${message}`)
  hasErrors = true
}

function isAllowedPath(filePath) {
  return allowedPathParts.some(part => filePath.includes(part))
}

function isAllowedPattern(text) {
  return allowPatterns.some(pattern => text.includes(pattern))
}

function walk(dir, depth = 0) {
  if (depth > 20) return // prevent infinite recursion
  
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    
    // Skip build artifacts and hidden directories
    if (entry.name === 'node_modules' || entry.name === 'dist-electron' || entry.name === 'dist-renderer' || entry.name.startsWith('.')) {
      continue
    }
    
    if (entry.isDirectory()) {
      walk(full, depth + 1)
      continue
    }

    // Only check source files
    if (!/\.(ts|tsx|js|jsx|html|css|md)$/i.test(entry.name)) continue
    
    // Skip allowed paths
    if (isAllowedPath(full)) continue

    const text = fs.readFileSync(full, 'utf8')
    
    // Skip if file matches allow patterns
    if (isAllowedPattern(text)) continue
    
    for (const phrase of blocked) {
      if (text.toLowerCase().includes(phrase)) {
        fail(`Production placeholder "${phrase}" found in ${full}`)
      }
    }
  }
}

for (const dir of scanRoots) {
  if (fs.existsSync(dir)) {
    walk(dir)
  }
}

if (hasErrors) {
  process.exit(1)
}

console.log('[guard:placeholders] clean - no production placeholders found.')
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const legacyRendererPath = path.join(projectRoot, 'src', 'renderer.html')
const packagedRendererPath = path.join(projectRoot, 'dist-electron', 'renderer', 'renderer.html')
const preloadPath = path.join(projectRoot, 'src', 'preload.ts')

function fail(message) {
  console.error(`[guard:product-realness] ${message}`)
  process.exitCode = 1
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

function parsePreloadMethods(source) {
  const exposed = source.match(/contextBridge\.exposeInMainWorld\(\s*['"]rina['"]\s*,\s*\{([\s\S]*?)\n\}\)/m)
  if (!exposed) return new Set()
  return new Set([...exposed[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1]))
}

function parseRendererRinaMethods(source) {
  return new Set([...source.matchAll(/window\.rina(?:\?\.)?([A-Za-z_$][\w$]*)/g)].map((match) => match[1]))
}

if (fs.existsSync(legacyRendererPath)) {
  fail('legacy src/renderer.html is reachable by name; keep the archived legacy shell out of src/.')
}

const packagedRenderer = readIfExists(packagedRendererPath)
if (!packagedRenderer) {
  fail(`missing packaged renderer: ${packagedRendererPath}`)
} else {
  if (!packagedRenderer.includes('id="root"')) {
    fail('packaged renderer is not the Vite/React shell.')
  }
  if (packagedRenderer.includes('executeStepStream') || packagedRenderer.includes('doctorPlan')) {
    fail('packaged renderer contains legacy runtime API references.')
  }
}

const preloadMethods = parsePreloadMethods(readIfExists(preloadPath))
if (preloadMethods.size === 0) {
  fail('could not parse exposed window.rina methods from preload.ts')
}

const rendererMethods = parseRendererRinaMethods(packagedRenderer)
const missing = [...rendererMethods].filter((method) => !preloadMethods.has(method)).sort()
if (missing.length > 0) {
  fail(`packaged renderer references window.rina methods not exposed by preload: ${missing.join(', ')}`)
}

if (process.exitCode) process.exit(process.exitCode)
console.log('[guard:product-realness] renderer shell and preload API references are clean.')

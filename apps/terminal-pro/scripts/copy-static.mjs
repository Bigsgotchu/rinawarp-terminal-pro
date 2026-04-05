import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.resolve(__dirname, '..')
const outDir = path.join(projectRoot, 'dist-electron')
const repoRoot = path.resolve(projectRoot, '..', '..')
const projectNodeModules = path.join(projectRoot, 'node_modules')
const repoNodeModules = path.join(repoRoot, 'node_modules')

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return
  fs.mkdirSync(destDir, { recursive: true })

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      copyDir(src, dest)
    } else {
      copyFile(src, dest)
    }
  }
}

// Canonical desktop shell. Copy Vite-built React app
const srcRendererDir = path.join(projectRoot, 'dist-electron', 'renderer')
const outRendererDir = path.join(outDir, 'renderer')

if (!fs.existsSync(srcRendererDir)) {
  console.error(`Missing: ${srcRendererDir} - did you run 'npm run build:renderer'?`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
copyDir(srcRendererDir, outRendererDir)

copyDir(path.join(projectRoot, 'src', 'assets'), path.join(outDir, 'assets'))
copyDir(path.join(projectRoot, 'themes'), path.join(outDir, 'themes'))
copyDir(path.join(repoRoot, 'policy'), path.join(outDir, 'policy'))

// Copy renderer CSS files
copyDir(path.join(projectRoot, 'src', 'renderer'), path.join(outDir, 'renderer'))

function copyOptional(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Optional asset missing: ${src}`)
    return
  }
  copyFile(src, dest)
}

function resolveNodeModulePath(...segments) {
  const projectPath = path.join(projectNodeModules, ...segments)
  if (fs.existsSync(projectPath)) return projectPath
  const repoPath = path.join(repoNodeModules, ...segments)
  if (fs.existsSync(repoPath)) return repoPath
  return projectPath
}

function removeStaleOutput(target) {
  fs.rmSync(target, { recursive: true, force: true })
}

// Remove stale alternate renderer outputs so we only ever ship one desktop shell.
removeStaleOutput(path.join(outDir, 'ui'))
removeStaleOutput(path.join(outDir, 'renderer.js'))
removeStaleOutput(path.join(outDir, 'renderer.js.map'))
removeStaleOutput(path.join(outDir, 'renderer.d.ts'))
removeStaleOutput(path.join(outDir, 'renderer.d.ts.map'))

copyOptional(resolveNodeModulePath('@xterm', 'xterm', 'lib', 'xterm.js'), path.join(outDir, 'vendor', 'xterm.js'))
copyOptional(resolveNodeModulePath('@xterm', 'xterm', 'css', 'xterm.css'), path.join(outDir, 'vendor', 'xterm.css'))
copyOptional(
  resolveNodeModulePath('@xterm', 'addon-fit', 'lib', 'addon-fit.js'),
  path.join(outDir, 'vendor', 'xterm-addon-fit.js')
)

console.log('Static assets copied to dist-electron/')

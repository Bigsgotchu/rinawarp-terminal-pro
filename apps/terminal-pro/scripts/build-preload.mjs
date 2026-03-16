import { build } from 'esbuild'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'src', 'preload.ts')
const outDir = path.join(root, 'dist-electron')
const outFile = path.join(outDir, 'preload.cjs')

fs.mkdirSync(outDir, { recursive: true })

await build({
  entryPoints: [src],
  outfile: outFile,
  platform: 'node',
  format: 'cjs',
  target: ['node18'],
  bundle: true,
  sourcemap: true,
  external: ['electron'],
})

console.log(`Built preload: ${outFile}`)

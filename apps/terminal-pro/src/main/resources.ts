import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const electron = require('electron')
const { app } = electron
import type { DiagnosticsFileInfo } from './context.js'

export type DevResourceBase = 'repo' | 'app'

export function resolveResourcePath(args: {
  relPath: string
  devBase: DevResourceBase
  repoRoot: string
  appProjectRoot: string
  dirname: string
}): string {
  const normalizedRel = String(args.relPath || '').replace(/^[/\\]+/, '')
  if (app.isPackaged) {
    const packagedCandidates = [
      path.join(app.getAppPath(), normalizedRel),
      path.join(process.resourcesPath, normalizedRel),
      path.join(args.dirname, normalizedRel),
    ]
    for (const p of packagedCandidates) {
      if (fs.existsSync(p)) return p
    }
    return packagedCandidates[0]
  }

  const base = args.devBase === 'repo' ? args.repoRoot : args.appProjectRoot
  return path.join(base, normalizedRel)
}

export function fileSha256IfExists(p: string): string | null {
  try {
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return null
    const buf = fs.readFileSync(p)
    return crypto.createHash('sha256').update(buf).digest('hex')
  } catch {
    return null
  }
}

export function fileInfoIfExists(p: string): DiagnosticsFileInfo {
  try {
    if (!fs.existsSync(p)) return { path: p, exists: false, sha256: null, sizeBytes: null }
    const stat = fs.statSync(p)
    if (!stat.isFile()) return { path: p, exists: false, sha256: null, sizeBytes: null }
    const sha256 = fileSha256IfExists(p)
    return { path: p, exists: true, sha256, sizeBytes: stat.size }
  } catch {
    return { path: p, exists: false, sha256: null, sizeBytes: null }
  }
}

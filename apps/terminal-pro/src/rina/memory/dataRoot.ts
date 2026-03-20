import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function resolveElectronUserData(): string | null {
  try {
    const electron = require('electron')
    const app = electron?.app
    const userData = app?.getPath?.('userData')
    return typeof userData === 'string' && userData.trim() ? userData : null
  } catch {
    return null
  }
}

export function resolveRinaDataDir(): string {
  const explicit = String(process.env.RINA_DATA_DIR || '').trim()
  const userData = resolveElectronUserData()
  const homeDir = os.homedir()
  const fallbackHome = homeDir ? path.join(homeDir, '.rinawarp') : path.join('.', '.rinawarp')
  const root = explicit || userData || fallbackHome
  fs.mkdirSync(root, { recursive: true })
  return root
}


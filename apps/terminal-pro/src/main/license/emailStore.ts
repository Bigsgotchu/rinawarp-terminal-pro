import * as fs from 'node:fs'
import * as path from 'node:path'
import * as electron from 'electron'

const { app } = electron

const FILE = 'license-email.json'

export function getCachedEmail(): string | null {
  try {
    const filePath = path.join(app.getPath('userData'), FILE)
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as { email?: string }
    const email = String(parsed?.email || '').trim().toLowerCase()
    return email || null
  } catch {
    return null
  }
}

export function setCachedEmail(email: string): void {
  const filePath = path.join(app.getPath('userData'), FILE)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({ email: email.trim().toLowerCase() }, null, 2), 'utf8')
}

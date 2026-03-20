import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'
import * as electron from 'electron'

const { app } = electron

type DeviceIdFile = { deviceId: string }

export function getOrCreateDeviceId(): string {
  const dir = app.getPath('userData')
  const filePath = path.join(dir, 'device-id.json')

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as DeviceIdFile
    if (parsed?.deviceId && typeof parsed.deviceId === 'string') return parsed.deviceId
  } catch {
    // Ignore missing/invalid file and create a new one below.
  }

  const deviceId = randomUUID()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({ deviceId }, null, 2), 'utf8')
  return deviceId
}

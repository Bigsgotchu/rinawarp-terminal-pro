import type { RinaTaskKind } from './types.js'

export function routeRinaTask(message: string): RinaTaskKind {
  const text = message.toLowerCase()

  if (text.includes('disk') || text.includes('space') || text.includes('storage')) {
    return 'disk_recovery'
  }

  if (text.includes('port') || text.includes('3000') || text.includes('busy')) {
    return 'port_conflict'
  }

  if (text.includes('build') || text.includes('npm run') || text.includes('test failed')) {
    return 'failed_build'
  }

  return 'unknown'
}

export function extractPort(message: string): number | null {
  const match = message.match(/\b([1-9]\d{1,4})\b/)
  if (!match) return null
  const port = Number(match[1])
  return Number.isInteger(port) && port <= 65_535 ? port : null
}

/**
 * Palette filtering - fuzzy search with recents boost and command mode.
 */

import { scoreTextMatch } from '../../search-ranking.js'
import type { PaletteCommand } from './model.js'
import type { PaletteState } from './state.js'
import { buildRecentBoost } from './state.js'

const COMMAND_MODE_PREFIX = '>'

type CommandRoute = {
  key: string
  keywords: string[]
  filter: (cmd: PaletteCommand) => boolean
}

function buildCommandRoutes(): CommandRoute[] {
  return [
    {
      key: 'theme',
      keywords: ['theme', 'themes', 'appearance', 'colors'],
      filter: (cmd) => cmd.id.startsWith('theme.set.'),
    },
    {
      key: 'settings',
      keywords: ['settings', 'preferences', 'options', 'config'],
      filter: (cmd) => cmd.id.startsWith('settings.'),
    },
    {
      key: 'support',
      keywords: ['support', 'bundle', 'zip', 'diagnostics'],
      filter: (cmd) => cmd.id.includes('support') || cmd.id.includes('bundle'),
    },
    {
      key: 'devtools',
      keywords: ['devtools', 'debug', 'inspect'],
      filter: (cmd) => cmd.id.includes('devtools'),
    },
  ]
}

function parseCommandMode(query: string): { mode: string | null; rest: string } {
  const trimmed = query.trim()
  if (!trimmed.startsWith(COMMAND_MODE_PREFIX)) {
    return { mode: null, rest: query }
  }
  const afterPrefix = trimmed.slice(1).trim()
  const spaceIdx = afterPrefix.indexOf(' ')
  if (spaceIdx === -1) {
    return { mode: afterPrefix.toLowerCase(), rest: '' }
  }
  return {
    mode: afterPrefix.slice(0, spaceIdx).toLowerCase(),
    rest: afterPrefix.slice(spaceIdx + 1).trim(),
  }
}

export function applyFilter(query: string, state: PaletteState, commands: PaletteCommand[]): void {
  const { mode, rest } = parseCommandMode(query)
  const recentBoost = buildRecentBoost()

  // Command mode: filter by route first
  let baseList = commands
  if (mode) {
    const routes = buildCommandRoutes()
    const route = routes.find((r) => r.key === mode || r.keywords.includes(mode))
    if (route) {
      baseList = commands.filter(route.filter)
    }
  }

  // Empty query: show recents first, then all by score
  if (!rest && !mode) {
    const recents = loadRecentCommands(baseList, recentBoost)
    const others = baseList
      .filter((c) => !recentBoost.has(c.id))
      .map((c) => ({ cmd: c, score: 0.25 }))
      .sort((a, b) => a.cmd.title.localeCompare(b.cmd.title))

    state.filtered = [...recents, ...others.map((x) => x.cmd)].slice(0, 30)
    state.activeIndex = 0
    return
  }

  // Normal fuzzy search
  const scored = baseList
    .map((c) => {
      const hay = `${c.title} ${c.subtitle ?? ''} ${c.keywords?.join(' ') ?? ''}`
      const s = rest ? scoreTextMatch(rest, hay) : 0.25
      if (rest && s < 0) return null
      const boost = recentBoost.get(c.id) ?? 0
      const total = Number((Math.max(0.05, s) + boost).toFixed(4))
      return { cmd: c, score: total }
    })
    .filter((x): x is { cmd: PaletteCommand; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  state.filtered = scored.map((x) => x.cmd)
  state.activeIndex = 0
}

function loadRecentCommands(commands: PaletteCommand[], recentBoost: Map<string, number>): PaletteCommand[] {
  const recentIds = Array.from(recentBoost.keys())
  const recentCmds: PaletteCommand[] = []

  for (const id of recentIds) {
    const cmd = commands.find((c) => c.id === id)
    if (cmd) recentCmds.push(cmd)
    if (recentCmds.length >= 8) break
  }

  return recentCmds
}

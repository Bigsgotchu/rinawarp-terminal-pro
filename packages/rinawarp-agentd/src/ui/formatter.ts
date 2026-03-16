/**
 * Formatter
 *
 * Terminal output formatting.
 */

import type { RiskLevel } from '../safety/risk.js'

export function riskBadge(risk: RiskLevel): string {
  switch (risk) {
    case 'low':
      return '[LOW ✓]'
    case 'medium':
      return '[MEDIUM ⚠]'
    case 'high':
      return '[HIGH ✗]'
  }
}

export function command(cmd: string): string {
  return `$ ${cmd}`
}

export function success(msg: string): string {
  return `✓ ${msg}`
}

export function error(msg: string): string {
  return `✗ ${msg}`
}

export function warning(msg: string): string {
  return `⚠ ${msg}`
}

export function info(msg: string): string {
  return `ℹ ${msg}`
}

export function header(title: string): string {
  return `\n━━━ ${title} ━━━\n`
}

export function keyValue(key: string, value: string): string {
  return `${key}: ${value}`
}

export function listItem(item: string): string {
  return `  • ${item}`
}

export function numberedItem(n: number, item: string): string {
  return `  ${n}. ${item}`
}

export function output(text: string): string {
  return `\n${text}\n`
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

export function help(commands: [string, string][]): string {
  let s = 'Available commands:\n'
  for (const [cmd, desc] of commands) {
    s += `  ${cmd.padEnd(20)} ${desc}\n`
  }
  return s
}

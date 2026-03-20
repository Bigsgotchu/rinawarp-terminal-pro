/**
 * RinaWarp Terminal Theme
 *
 * Custom xterm.js theme with RinaWarpTech branding:
 * - Hot Pink (#ff2e88)
 * - Coral (#ff6f61)
 * - Teal (#1de9b6)
 * - Baby Blue (#7cc7ff)
 * - Black (#050505)
 */

import type { ITheme } from 'xterm'

export const rinaWarpTheme: ITheme = {
  background: '#050505',
  foreground: '#e6f1ff',

  // Cursor
  cursor: '#ff2e88',
  cursorAccent: '#050505',

  // Selection
  selectionBackground: 'rgba(29, 233, 182, 0.4)',
  selectionForeground: '#e6f1ff',

  // ANSI colors
  black: '#0b0b0b',
  red: '#ff6f61',
  green: '#1de9b6',
  yellow: '#ffb86c',
  blue: '#7cc7ff',
  magenta: '#ff2e88',
  cyan: '#1de9b6',
  white: '#d6e2f0',

  // Bright colors
  brightBlack: '#1c1c1c',
  brightRed: '#ff8a80',
  brightGreen: '#40ffd6',
  brightYellow: '#ffd28a',
  brightBlue: '#9bd7ff',
  brightMagenta: '#ff59a6',
  brightCyan: '#55ffe0',
  brightWhite: '#ffffff',

  // Extended colors (256-color palette)
  extendedAnsi: [
    // Gradients of brand colors
    '#050505', // 0
    '#ff2e88', // 1 - Hot Pink
    '#ff6f61', // 2 - Coral
    '#1de9b6', // 3 - Teal
    '#7cc7ff', // 4 - Baby Blue
  ],
}

/**
 * Apply the theme to an xterm.js Terminal instance
 *
 * @example
 * import { Terminal } from "xterm";
 * import { rinaWarpTheme } from "./theme/rinawarp-theme";
 *
 * const term = new Terminal({
 *   theme: rinaWarpTheme,
 *   fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
 *   fontSize: 13,
 *   fontWeight: "400",
 *   lineHeight: 1.3,
 *   cursorBlink: true,
 *   cursorStyle: "block",
 *   cursorWidth: 1,
 *   letterSpacing: 0.5,
 *   tabStopWidth: 4,
 *   allowTransparency: false,
 *   scrollback: 10000,
 *   experimentalCharAtlas: "dynamic",
 * });
 */
export function applyRinaWarpTheme(term: import('xterm').Terminal): void {
  term.options.theme = rinaWarpTheme
}

/**
 * Rina system message helper
 * Outputs styled Rina messages in the execution stream
 */
export function rinaLog(
  term: import('xterm').Terminal,
  text: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): void {
  const colors = {
    info: '\x1b[36m', // Cyan/Teal
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
  }
  const reset = '\x1b[0m'

  term.writeln(`${colors[type]}[Rina]${reset} ${text}`)
}

/**
 * Rina command helper
 * Outputs styled Rina commands in the execution stream
 */
export function rinaCommand(term: import('xterm').Terminal, command: string): void {
  // Coral color for Rina commands
  term.writeln(`\x1b[38;5;203m[Rina] > ${command}\x1b[0m`)
}

/**
 * Custom prompt configuration
 * Hot pink user, teal path, pink prompt symbol
 */
export const RINA_PROMPT = {
  userColor: '\x1b[38;5;198m', // Hot pink
  pathColor: '\x1b[38;5;45m', // Teal
  symbolColor: '\x1b[38;5;198m', // Hot pink
  reset: '\x1b[0m',

  /**
   * Generate prompt string
   * @param username - Current user (default: rina)
   * @param cwd - Current working directory
   */
  generate: function (username = 'rina', cwd = '~/workspace'): string {
    return `${this.userColor}${username}@warp${this.reset} ${this.pathColor}${cwd}${this.reset} ${this.symbolColor}❯${this.reset} `
  },
}

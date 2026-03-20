/**
 * RinaWarp Design Tokens
 *
 * Defines the CSS custom properties (variables) used throughout the application.
 * These tokens control spacing, typography, colors, and other visual properties.
 */

export type Density = 'compact' | 'comfortable'
export type Skin = 'default' | 'vscode'

export interface ThemeTokens {
  // Spacing
  space1: string
  space2: string
  space3: string

  // Border radius
  radius1: string
  radius2: string

  // Typography
  fontSm: string
  fontMd: string

  // Colors
  bg: string
  surface: string
  text: string
  muted: string
  border: string

  // Additional colors for gradients, etc.
  hotpink: string
  teal: string
  babyblue: string
}

// Base tokens for default density and skin
export const baseTokens: ThemeTokens = {
  space1: '8px',
  space2: '12px',
  space3: '16px',
  radius1: '8px',
  radius2: '12px',
  fontSm: '12px',
  fontMd: '14px',
  bg: '#0b0d10',
  surface: '#11151c',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.62)',
  border: 'rgba(255,255,255,0.08)',
  hotpink: '#ff2fb3',
  teal: '#26f7d4',
  babyblue: '#7dd3ff',
}

// Density overrides
export const densityTokens: Record<Density, Partial<ThemeTokens>> = {
  compact: {},
  comfortable: {
    space1: '10px',
    space2: '14px',
    space3: '18px',
    fontSm: '13px',
    fontMd: '15px',
  },
}

// Skin overrides
export const skinTokens: Record<Skin, Partial<ThemeTokens>> = {
  default: {},
  vscode: {
    bg: '#0d1117',
    surface: '#161b22',
    text: 'rgba(255,255,255,0.9)',
    muted: 'rgba(255,255,255,0.68)',
    border: 'rgba(255,255,255,0.10)',
  },
}

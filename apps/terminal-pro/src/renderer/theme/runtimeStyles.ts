/**
 * Runtime Style Injection
 *
 * Generates and injects CSS custom properties based on current theme tokens.
 */

import { baseTokens, densityTokens, skinTokens, type Density, type Skin, type ThemeTokens } from './tokens.js'

export function generateThemeCSS(density: Density, skin: Skin): string {
  // Start with base tokens
  const tokens: ThemeTokens = { ...baseTokens }

  // Apply density overrides
  Object.assign(tokens, densityTokens[density])

  // Apply skin overrides
  Object.assign(tokens, skinTokens[skin])

  // Generate CSS
  return `
    :root {
      --rw-space-1: ${tokens.space1};
      --rw-space-2: ${tokens.space2};
      --rw-space-3: ${tokens.space3};
      --rw-radius-1: ${tokens.radius1};
      --rw-radius-2: ${tokens.radius2};
      --rw-font-sm: ${tokens.fontSm};
      --rw-font-md: ${tokens.fontMd};
      --rw-bg: ${tokens.bg};
      --rw-surface: ${tokens.surface};
      --rw-text: ${tokens.text};
      --rw-muted: ${tokens.muted};
      --rw-border: ${tokens.border};
      --rw-hotpink: ${tokens.hotpink};
      --rw-teal: ${tokens.teal};
      --rw-babyblue: ${tokens.babyblue};

      /* Legacy compatibility */
      --w-bg: ${tokens.bg};
      --w-panel: ${tokens.surface};
      --w-panel-2: ${tokens.surface};
      --w-border: ${tokens.border};
      --w-divider: ${tokens.border};
      --w-fg: ${tokens.text};
      --w-muted: ${tokens.muted};
      --w-r1: ${tokens.radius1};
      --w-r2: ${tokens.radius2};
      --w-shadow: none;
      --w-pad-xs: ${tokens.space1};
      --w-pad-s: ${tokens.space2};
      --w-pad-m: ${tokens.space3};
      --w-gap: ${tokens.space2};
      --w-pill-h: 24px;
      --w-pill-r: 7px;
    }
  `
}

export function injectThemeCSS(css: string): void {
  // Remove existing theme style if present
  const existing = document.getElementById('rw-theme-styles')
  if (existing) {
    existing.remove()
  }

  // Inject new style
  const style = document.createElement('style')
  style.id = 'rw-theme-styles'
  style.textContent = css
  document.head.appendChild(style)
}
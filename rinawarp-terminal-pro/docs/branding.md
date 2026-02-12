# Branding Contract

This is the authoritative branding split for the public website and product surfaces.

## Terminal Pro (Mermaid Brand)

- Product: RinaWarp Terminal Pro
- Primary logo: `/assets/img/rinawarp-logo.png`
- Palette direction: mermaid neon
- Required core colors:
  - Hot pink: `#FF1B8D`
  - Coral: `#FF6B6B`
  - Teal: `#00D1C1`
  - Baby blue: `#12D6FF`
  - Black/dark base: `#05060a` / `#0a0a0f`

## Music (Unicorn Brand)

- Product: Music Video Creator / Rina Vex music pages
- Primary logo: `/assets/img/rina-unicorn-logo.png`
- Palette direction: unicorn neon (not pastel)
- Required core colors:
  - Unicorn pink: `#ff0f8a`
  - Unicorn violet: `#7a3bff`
  - Unicorn cyan: `#00d7ff`
  - Dark base: `#04050a`

## Route Ownership

- Terminal Pro and core marketing pages must use RinaWarp logo.
- Music pages must use unicorn logo.
- Do not mix logos between these route groups.

Current music pages:

- `/music-video-creator`
- `/rina-vex`
- `/rina-vex-music`

## Enforcement

- CI check: `npm run verify:branding`
- Script: `scripts/verify-branding.sh`

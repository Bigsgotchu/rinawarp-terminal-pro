# RinaWarp Terminal Pro Product UI Lock

Product: RinaWarp Terminal Pro
AI copilot: Rina
Desktop container: Agent Shell
Primary user experience: Agent Thread
Agent Thread is the visual focus

RinaWarp Terminal Pro uses a professional dark Agent Shell.

The product is not a workbench. Agent Shell is only the Electron container. Agent Thread is the primary user experience.

## Required Visual Direction

- Dark navy/black shell
- Professional, compact layout
- Agent Thread primary
- Details/Inspect rail secondary
- Magenta and teal accents
- No white fallback UI
- No bubble/card-heavy design
- No childish rounded cards
- No duplicate panels

## CSS Design Tokens

Use these canonical tokens:

- --bg-app: main application background
- --bg-panel: panel/card background
- --bg-elevated: elevated surface background
- --text-primary: primary text color
- --text-secondary: secondary text color
- --accent-pink: pink accent color
- --accent-cyan: cyan accent color
- --accent-purple: purple accent color
- --success: success state color
- --warning: warning state color
- --danger: danger/error color
- --border-subtle: subtle border color
- --glow-accent: accent glow effect

## Radius Rule

Use 8px maximum border radius for panels, cards, composer, buttons, and drawers.

999px is allowed only for tiny status indicators, dots, badges, or count pills.

## Visible Terminology

Use:
- Project
- Proof
- Rina ready
- Agent Thread
- Agent Shell

Avoid:
- workbench terminology
- viewer/receipt naming
- execution/trace naming
- Runtime Connected
- Workspace in visible copy

## Composer

The Agent Thread composer must always be visible, full-width, and aligned with Send.

Suggestions must not overlap the composer.

## Never Restore

- React legacy shell
- white raw HTML shell
- stale rina-panel selectors
- bubble UI
- workbench product language

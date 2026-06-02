# First-Run QA Checklist

This checklist is for the first-launch stabilization pass.

Use the locked build from [CORE_PATH_BUILD_LOCK.md](/home/karina/Documents/rinawarp-terminal-pro/docs/CORE_PATH_BUILD_LOCK.md).

## Test Build

Use this artifact:

- `/home/karina/Downloads/RinaWarp-Terminal-Pro-1.1.9.AppImage`

Expected hash:

- see [CORE_PATH_BUILD_LOCK.md](/home/karina/Documents/rinawarp-terminal-pro/docs/CORE_PATH_BUILD_LOCK.md)

## Main Questions

The first 30 seconds should answer:

- where do I pick my project?
- what do I do first?
- where do settings live?
- can I ask Rina something and get a sane answer?

## Manual Pass

### 1. No Workspace Selected

Launch the app with no valid project selected.

Confirm:

- the Agent view leads with a workspace setup card
- the main action is `Choose workspace`
- the top bar also shows a visible workspace picker
- the app does not pretend it already has a good project context

### 2. Weak Workspace Selected

Pick a generic folder like `Downloads`.

Confirm:

- the UI treats it as weak context
- the warning language is calm and clear
- the top-bar workspace picker reflects that the workspace may be wrong
- the agent still offers `Choose workspace` and workspace guidance

### 3. Real Project Selected

Pick a real project root with clear markers like `package.json`, `wrangler.toml`, `Dockerfile`, or `.git`.

Confirm:

- the weak-context warning goes away
- the workspace picker shows the project name cleanly
- the Agent surface feels ready for real work

### 4. Settings

Confirm:

- `Settings` is hidden until ready
- once visible, clicking it actually opens the settings surface
- the workspace setup actions that open settings land in the right place

### 5. Ask Rina

Send these messages:

- `hi rina`
- `what can u do`
- `scan yourself`

Confirm:

- the composer submits once per message
- `hi rina` gets a conversational reply
- `what can u do` answers with capabilities/help and does not start verification
- `scan yourself` starts a real self-check run instead of a generic command failure or clarify loop
- the app does not unexpectedly switch views or reopen Settings

### 6. Footer Status

Confirm:

- status is in the bottom utility strip
- it reads like customer-safe product language
- it does not steal attention from the Agent thread
- it still exposes workspace, mode, last run, and recovery clearly

## Pass Bar

This pass is ready when:

- workspace selection is obvious on first launch
- weak folders are treated as weak, not normal
- Settings is usable
- one plain message gets one sane reply
- the footer carries status quietly and clearly

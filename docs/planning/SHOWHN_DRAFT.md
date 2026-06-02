# Show HN Draft - RinaWarp

## Title

**Show HN: RinaWarp - desktop app that fixes broken projects automatically**

## Post Body

I built RinaWarp around one very specific job:

fix a broken project automatically, then prove what changed.

Most AI dev tools stop at suggestions or chat. RinaWarp is built around a tighter loop:

- detect what is broken
- show a repair plan
- execute the repair with live output
- verify whether the project actually works
- attach proof, changed files, and a confidence score to the result

The main flow is called `Fix Project`.

### What it looks like

Broken project:

```text
> npm run build
Module not found: react-scripts
```

RinaWarp:

```text
> rina fix
Installing missing dependency
Updating project config
Rebuilding project
Build successful
```

Then the app summarizes the result in plain language, for example:

```text
Fixed 3 issues
- Installed missing dependencies
- Updated project configuration
- Resolved build errors

Project now builds successfully.
Confidence: High
```

### Why I built it

I wanted something that felt less like "AI pair programmer chat" and more like:

"this just saved me hours"

The product is strongest when you have a broken local repo, messy setup drift, config issues, missing dependencies, or build failures and you want one button that starts moving immediately.

### Current focus

Right now I'm testing this against real broken repos and tightening whatever fails in practice.

I care most about three questions:

1. Did it fix something real?
2. Where did it fail?
3. Was anything confusing?

### Demo / site

- Site: `https://rinawarptech.com`
- Download: `https://rinawarptech.com/download`

## Prepared Responses

### Q: How is this different from Cursor / Claude Code / ChatGPT?

A: The point is not "better chat." The point is a tighter repair loop: detect, fix, verify, prove. The product is optimized around fixing broken projects, not around being a general-purpose coding assistant first.

### Q: Does it auto-run dangerous commands?

A: No. High-impact steps are gated. The UI shows the plan first, streams the execution live, and keeps proof attached to the result.

### Q: What kinds of projects does it work best on?

A: Right now the sweet spot is Node, React, Next.js, Electron, and TypeScript repos with broken local setup, dependency issues, config drift, and build/test failures.

### Q: Is this a cloud service or local app?

A: The main product is a desktop app. The experience is built around local project inspection, execution visibility, and proof-backed results.

### Q: What are you learning from launch?

A: Whether people actually trust and reuse a one-button repair workflow. The main metric is simple: does it fix real broken repos for real people.

## Launch Rule

Keep the story simple:

**Fix your broken project automatically.**

Everything else is supporting detail.

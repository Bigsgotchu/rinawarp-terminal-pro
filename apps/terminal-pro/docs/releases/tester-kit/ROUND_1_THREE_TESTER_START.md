# Private Beta Round 1 - Three Tester Start

Start with three testers before expanding to 10-25.

## Live Links

- Beta signup: https://www.rinawarptech.com/beta
- Beta feedback: https://www.rinawarptech.com/beta-feedback
- Artifact inventory: `apps/terminal-pro/docs/releases/v1.8.2-beta-artifacts.md`
- Tester checklist: `apps/terminal-pro/docs/releases/tester-kit/TESTER_CHECKLIST.md`
- Tester invite: `apps/terminal-pro/docs/releases/tester-kit/TESTER_INVITE.md`

## Tester Slots

| Slot | OS | Tester | Artifact | Sent | Install success | Security warning experience | Workspace selected | First proof generated | Time to first proof | Proof exported | Restart persistence | Safe-fix understood | Feedback received | Would use again | Would pay | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Linux |  | AppImage or deb |  |  |  |  |  |  |  |  |  |  |  |  |
| 2 | macOS |  | DMG or ZIP unsigned preview |  |  |  |  |  |  |  |  |  |  |  |  |
| 3 | Windows |  | Windows unsigned installer |  |  |  |  |  |  |  |  |  |  |  |  |

## Test Script

Ask each tester to:

1. Download the artifact for their OS.
2. Follow any unsigned-build security bypass instructions.
3. Open a test project workspace first, not a sensitive production repo.
4. Ask: `Build this project and tell me what fails.`
5. Confirm Rina streams the run.
6. Confirm proof appears.
7. Export proof.
8. Quit and reopen.
9. Confirm history/proof persists.
10. Ask: `Plan a fix safely.`
11. Submit feedback at https://www.rinawarptech.com/beta-feedback.

## What To Record

For each tester, record:

- OS
- artifact used
- install success
- security warning experience
- workspace selected
- first proof generated
- time to first proof
- proof exported
- restart persistence
- safe-fix approval understood
- confusing UI moments
- crashes/errors
- would use again
- would pay

## Expansion Rule

Move from three testers to 10-25 only after:

- [ ] At least one Linux tester reaches first proof
- [ ] At least one macOS tester confirms the unsigned bypass instructions are clear
- [ ] At least one Windows tester confirms the SmartScreen path is clear
- [ ] No install blocker affects all testers on a platform
- [ ] The feedback form captures the first-proof and use/pay signal cleanly

## Fix Rule

During Round 1, fix only beta-blocking issues:

- install cannot complete
- app cannot launch
- workspace selection blocks first proof
- proof does not appear
- proof export fails
- restart loses proof/history
- safe-fix approval is confusing enough to break trust

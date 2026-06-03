# Private Beta Round 1 - Three Tester Start

Start with three testers before expanding to 10-25.

## Live Links

- Beta signup: https://www.rinawarptech.com/beta
- Beta feedback: https://www.rinawarptech.com/beta-feedback
- Artifact inventory: `apps/terminal-pro/docs/releases/v1.8.2-beta-artifacts.md`
- Tester checklist: `apps/terminal-pro/docs/releases/tester-kit/TESTER_CHECKLIST.md`

## Tester Slots

| Slot | OS | Tester | Artifact | Sent | Installed | First proof | Proof exported | Restart persistence | Safe-fix understood | Feedback received | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Linux |  | AppImage or deb |  |  |  |  |  |  |  |  |
| 2 | macOS |  | DMG or ZIP unsigned preview |  |  |  |  |  |  |  |  |
| 3 | Windows |  | Windows unsigned installer |  |  |  |  |  |  |  |  |

## Test Script

Ask each tester to:

1. Download the artifact for their OS.
2. Follow any unsigned-build security bypass instructions.
3. Open a real project workspace.
4. Ask: `Build this project and tell me what fails.`
5. Confirm proof appears.
6. Export proof.
7. Quit and reopen.
8. Confirm history/proof persists.
9. Ask: `Plan a fix safely.`
10. Submit feedback at https://www.rinawarptech.com/beta-feedback.

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


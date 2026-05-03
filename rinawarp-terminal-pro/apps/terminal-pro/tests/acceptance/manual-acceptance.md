# RinaWarp Terminal Pro - Manual Acceptance Gate

This is the only test that answers:
"Does the product actually work?"

Run this after every meaningful change.

---

## Fresh Launch Required

- Fully quit the app.
- Start a new session.

---

## 1. Terminal Usability

Input:

```text
pwd
```

Expect:
- Command executes immediately.
- Output shows current directory.
- No Rina involvement.

---

## 2. Terminal Routing

Input:

```text
git status
```

Expect:
- Runs directly in PTY.
- No inline Rina UI appears.

---

## 3. Rina Routing

Input:

```text
why did this fail?
```

Expect:
- Inline Rina result appears.
- Contains explanation, risk, and optional command.
- No shell execution.

---

## 4. Ambiguous Handling

Input:

```text
build app
```

Expect:
- Explicit choice UI appears.
- No automatic routing.
- No execution.

---

## 5. Approve -> Same PTY Execution

Steps:
- Trigger a Rina suggestion with a command.
- Click approve.

Then input:

```text
pwd
```

Expect:
- Suggested command executes.
- `pwd` confirms same session continuity.
- No hidden reset or detached shell.

---

## 6. Failure Affordance

Input:

```text
ls /definitely-not-a-real-path
```

Expect:
- Command fails in terminal.

Then:
- Click "Explain failure" or "Suggest fix".

Expect:
- Inline Rina response appears.
- Response is tied to that failure.

---

## 7. Selection-Based Ask Rina

Steps:
- Select terminal output.
- Trigger "Ask Rina".

Expect:
- Context-aware explanation appears.
- No PTY execution.

---

## 8. Persistence / Lifecycle

Steps:
- Complete one full inline run:
  created -> approved -> executed -> exit.
- Open Settings > Diagnostics.

Expect:
- Run is present.
- Lifecycle states are correct.
- Exit outcome is recorded.

---

## 9. Regression Sanity

Steps:
- Quit app.
- Relaunch app.

Expect:
- Terminal still executes commands.
- Rina still responds.
- No degraded routing.

---

## 10. Session Continuity

Input:

```text
cd ..
pwd
```

Expect:
- `cd ..` executes in the active PTY.
- `pwd` reflects the parent directory.
- No Rina UI or ambiguity prompt appears.

---

## Pass Criteria

All must be true:

- Shell commands execute directly.
- Rina only triggers on clear intent.
- Ambiguous input never auto-routes.
- Approve executes in the same session.
- Failure affordances work.
- Diagnostics reflect reality.
- No submitted action silently disappears.
- `cd` / `pwd` confirms same PTY session continuity.

---

## Fast Check

Run in order:

```text
pwd
git status
why did this fail?
build app
ls /definitely-not-a-real-path
```

Expected behavior:

- `pwd` works directly.
- `git status` works directly.
- `why did this fail?` routes to Rina.
- `build app` forces explicit choice.
- `ls /definitely-not-a-real-path` fails, then failure affordance should help.

If any of these behave incorrectly, fail the acceptance gate.

---

## Rule

Green tests do not prove the product works.
This checklist is the product usability gate.

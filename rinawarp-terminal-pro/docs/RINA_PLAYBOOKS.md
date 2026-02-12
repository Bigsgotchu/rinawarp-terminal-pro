# Rina Playbooks

Playbooks are deterministic workflows with the same lifecycle:

`detect -> explain -> propose -> confirm -> execute -> verify -> report`

## System Doctor Playbooks (Phase 1)

### 1) Computer Running Hot
- Detect: CPU, top processes, thermal indicators
- Explain: sustained load source and likely impact
- Propose: scoped mitigation options
- Confirm: required for process kill/service changes
- Execute: minimal-risk first
- Verify: CPU/temp trend improvement
- Report: root cause, actions, result

### 2) Disk Full
- Detect: volume usage, largest paths, growth patterns
- Explain: where pressure is and why
- Propose: safe cleanup candidates
- Confirm: required before delete/move
- Execute: least-risk cleanup sequence
- Verify: free space delta and app health
- Report: reclaimed space + residual risk

### 3) Laptop Slow
- Detect: CPU, memory, disk I/O, startup overhead
- Explain: bottleneck classification
- Propose: prioritized fixes by impact
- Confirm: medium/high-risk steps
- Execute: one fix at a time
- Verify: response/load improvements
- Report: before/after metrics

### 4) Wi-Fi Slow
- Detect: signal, latency, packet loss, DNS timing
- Explain: link vs network vs DNS issue
- Propose: targeted network steps
- Confirm: adapter/reset actions
- Execute: bounded changes
- Verify: latency/loss improvements
- Report: diagnosed layer + outcome

### 5) Memory Leak Suspected
- Detect: memory trend over time, process growth
- Explain: candidate processes + confidence
- Propose: restart/update/config options
- Confirm: service/process restarts
- Execute: reversible step first
- Verify: memory stabilization window
- Report: confidence and next monitor window

### 6) Malware Suspicion (Safe Checks Only)
- Detect: persistence indicators, unusual processes, network outliers
- Explain: suspicious signals and confidence level
- Propose: safe containment checks only
- Confirm: any high-risk action
- Execute: non-destructive checks
- Verify: signal reduction / escalation path
- Report: evidence bundle + recommended escalation

## Dev Fixer Playbooks (Phase 2)

- Build failing (Node/Python/Rust/Go)
- Port already in use
- Docker environment drift
- Permissions failures
- Dependency conflict resolution
- Toolchain mismatch correction

Each follows the same lifecycle and must end in a real rerun of failing command(s).

## Project Builder Playbooks (Phase 3)

- Scaffold project from template
- Add CI/lint/test/build
- Add runtime/tooling integrations
- Hardening pass (gated)

Requirements:
- explicit plan artifact
- file diffs before write
- rollback strategy
- verification gates before “done”

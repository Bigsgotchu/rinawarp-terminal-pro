import { applySafetyToPlans } from './safetyGate.js'
import type { RinaCommandPlan, RinaTaskKind, RinaTaskPlan, RinaTaskRequest } from './types.js'

function commandPlan(input: Omit<RinaCommandPlan, 'requiresApproval'> & { requiresApproval?: boolean }): RinaCommandPlan {
  return {
    requiresApproval: input.risk !== 'read',
    ...input,
  }
}

function diskReadPlans(): RinaCommandPlan[] {
  return [
    commandPlan({
      id: 'disk-read-df',
      command: 'df -h',
      reason: 'Inspect mounted filesystem usage. This does not change anything.',
      risk: 'read',
      expectedEffect: 'Show current disk pressure before any cleanup is proposed.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Use this as the before measurement.',
    }),
    commandPlan({
      id: 'disk-read-downloads',
      command: 'du -sh ~/Downloads/* 2>/dev/null | sort -h',
      reason: 'Inspect the largest visible Downloads items without deleting anything.',
      risk: 'read',
      expectedEffect: 'Identify large files that may need manual review.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Use the largest entries as evidence, not as automatic cleanup targets.',
    }),
    commandPlan({
      id: 'disk-read-docker',
      command: 'docker system df',
      reason: 'Inspect Docker image, container, volume, and build-cache usage.',
      risk: 'read',
      expectedEffect: 'Estimate whether Docker cleanup could recover meaningful space.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Only propose Docker cleanup after this read-only check.',
    }),
    commandPlan({
      id: 'disk-read-npm',
      command: 'npm cache verify',
      reason: 'Inspect npm cache health and size without changing cache contents.',
      risk: 'read',
      expectedEffect: 'Estimate whether npm cache cleanup is worth approving.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Only propose npm cache cleanup after this read-only check.',
    }),
  ]
}

function diskActionPlans(): RinaCommandPlan[] {
  return [
    commandPlan({
      id: 'disk-action-npm-cache',
      label: 'Clean npm cache',
      command: 'npm cache clean --force',
      reason: 'Remove npm cache files only after the user approves this action.',
      risk: 'safe-write',
      expectedEffect: 'Recover space used by npm cache files. npm can recreate this cache later.',
      rollbackAwareness: 'Regenerable cache data.',
      verificationHint: 'Re-check disk usage after cleanup.',
    }),
    commandPlan({
      id: 'disk-action-docker-prune',
      label: 'Remove Docker unused data',
      command: 'docker system prune',
      reason: 'Remove unused Docker images, containers, networks, and build cache only after approval.',
      risk: 'destructive',
      expectedEffect: 'Recover space used by Docker data that is not attached to running containers.',
      rollbackAwareness: 'Can be re-downloaded, but Rina cannot restore it automatically.',
      verificationHint: 'Re-check disk usage after cleanup.',
    }),
  ]
}

function portReadPlans(port: number): RinaCommandPlan[] {
  return [
    commandPlan({
      id: `port-${port}-read-lsof`,
      command: `lsof -i :${port} -P -n`,
      reason: `Check which process is listening on port ${port}. This does not stop or change anything.`,
      risk: 'read',
      expectedEffect: `Show the process using port ${port}, if one is present.`,
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: `Use this as the before measurement for port ${port}.`,
    }),
    commandPlan({
      id: `port-${port}-read-ss`,
      command: `ss -ltnp "sport = :${port}"`,
      reason: `Use ss as a read-only listener check for port ${port} when available.`,
      risk: 'read',
      expectedEffect: `Confirm whether port ${port} is listening and expose PID details when available.`,
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: `Use this as secondary evidence for port ${port}.`,
    }),
    commandPlan({
      id: `port-${port}-read-netstat`,
      command: `netstat -tulpn | grep :${port}`,
      reason: `Use netstat as a read-only fallback for port ${port} when available.`,
      risk: 'read',
      expectedEffect: `Confirm whether port ${port} appears in listening network sockets.`,
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: `Use this as fallback evidence for port ${port}.`,
    }),
  ]
}

function failedBuildReadPlans(packageManager: 'pnpm' | 'npm' = 'npm'): RinaCommandPlan[] {
  const buildCommand = packageManager === 'pnpm' ? 'pnpm build' : 'npm run build'
  return [
    commandPlan({
      id: 'build-read-pwd',
      command: 'pwd',
      reason: 'Confirm the working directory before diagnosing the failed build.',
      risk: 'read',
      expectedEffect: 'Show the project directory Rina is inspecting.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Use this as the workspace anchor for the recovery.',
    }),
    commandPlan({
      id: 'build-read-ls',
      command: 'ls',
      reason: 'Inspect the top-level project files before choosing a package-manager command.',
      risk: 'read',
      expectedEffect: 'Reveal package manager and project metadata files.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Confirm package.json and lockfiles are present.',
    }),
    commandPlan({
      id: 'build-read-package',
      command: 'cat package.json',
      reason: 'Inspect package scripts before running the build.',
      risk: 'read',
      expectedEffect: 'Show available scripts and dependency metadata.',
      rollbackAwareness: 'No change; nothing to roll back.',
      verificationHint: 'Use package.json to explain the likely failing script path.',
    }),
    commandPlan({
      id: 'build-read-run-build',
      command: buildCommand,
      reason: `Run the safest supported Node build diagnostic for this package manager: ${buildCommand}.`,
      risk: 'read',
      expectedEffect: 'Capture the first concrete build error for diagnosis.',
      rollbackAwareness: 'This is a diagnostic build command; Rina still will not edit files or install packages without approval.',
      verificationHint: `After an approved fix, rerun ${buildCommand} to verify recovery.`,
    }),
  ]
}

function failedBuildActionPlans(packageManager: 'pnpm' | 'npm' = 'npm'): RinaCommandPlan[] {
  const installCommand = packageManager === 'pnpm' ? 'pnpm install' : 'npm install'
  const buildCommand = packageManager === 'pnpm' ? 'pnpm build' : 'npm run build'
  return [
    commandPlan({
      id: 'build-action-install',
      label: 'Restore dependencies',
      command: installCommand,
      reason: `If the parsed build error points to missing local packages or binaries, restore dependencies with ${installCommand} only after approval.`,
      risk: 'safe-write',
      expectedEffect: 'Restore declared packages and local build binaries for the current Node project.',
      rollbackAwareness: 'This changes node_modules and may update package-manager metadata depending on the install tool.',
      verificationHint: `Rerun ${buildCommand} after the approved install.`,
    }),
  ]
}

export function createPortStopPlan(port: number, pid: number, processName = 'process'): RinaCommandPlan {
  return commandPlan({
    id: `port-${port}-action-kill-${pid}`,
    label: `Stop ${processName} on port ${port}`,
    command: `kill ${pid}`,
    reason: `Stop PID ${pid}, which is currently using port ${port}.`,
    risk: 'safe-write',
    expectedEffect: `Stops the process currently using port ${port}.`,
    rollbackAwareness:
      'This cannot resume the exact process automatically, but you can usually restart it from the project/app that launched it.',
    verificationHint: `Re-check port ${port} after stopping the process.`,
  })
}

export function planRinaTask(
  request: RinaTaskRequest,
  kind: RinaTaskKind,
  options?: { port?: number; packageManager?: 'pnpm' | 'npm' }
): RinaTaskPlan {
  if (kind === 'disk_recovery') {
    return {
      taskId: request.id,
      kind,
      explanation: 'I will inspect disk usage with read-only commands first. No cleanup runs without approval.',
      readOnlyCommands: applySafetyToPlans(diskReadPlans()),
      proposedActions: applySafetyToPlans(diskActionPlans()),
    }
  }

  if (kind === 'port_conflict' && options?.port) {
    return {
      taskId: request.id,
      kind,
      explanation: `I will check what is listening on port ${options.port}. This is read-only and will not stop or change anything.`,
      readOnlyCommands: applySafetyToPlans(portReadPlans(options.port)),
      proposedActions: [],
    }
  }

  if (kind === 'failed_build') {
    const packageManager = options?.packageManager || 'npm'
    return {
      taskId: request.id,
      kind,
      explanation:
        'I will inspect this Node project, run one safe build diagnostic, parse the failure, and stop at one approval-gated fix.',
      readOnlyCommands: applySafetyToPlans(failedBuildReadPlans(packageManager)),
      proposedActions: applySafetyToPlans(failedBuildActionPlans(packageManager)),
    }
  }

  return {
    taskId: request.id,
    kind,
    explanation: 'I do not have a safe recovery workflow for this request yet.',
    readOnlyCommands: [],
    proposedActions: [],
  }
}

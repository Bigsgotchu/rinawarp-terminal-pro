import type {
  ArtifactReceipt,
  CommandReceipt,
  ExecutionReceipt,
  FileChangeReceipt,
  VerificationReceipt,
} from '@rinawarp/rina-contracts'

type LegacyCommand = Partial<CommandReceipt> & {
  command?: string
  output?: string
  stdout?: string
  stderr?: string
  exitCode?: number
}

type LegacyReceiptLike = {
  id?: string
  runId?: string
  sessionId?: string
  workspaceId?: string
  userIntent?: string
  planId?: string
  startedAt?: string
  completedAt?: string
  status?: ExecutionReceipt['status']
  summary?: string
  exitCode?: number
  commands?: Array<string | LegacyCommand>
  commandsExecuted?: Array<string | LegacyCommand>
  fileChanges?: (string | FileChangeReceipt)[]
  filesChanged?: string[] | FileChangeReceipt[]
  mcpCalls?: ExecutionReceipt['mcpCalls']
  artifacts?: Array<string | ArtifactReceipt>
  risk?: ExecutionReceipt['risk']
  verification?: VerificationReceipt
  verificationResults?: VerificationReceipt['checks']
  rollbackOccurred?: boolean
}

export function getReceiptId(receipt?: LegacyReceiptLike): string {
  return receipt?.id ?? receipt?.runId ?? 'unknown-receipt'
}

export function getReceiptRunId(receipt?: LegacyReceiptLike): string {
  return receipt?.runId ?? getReceiptId(receipt)
}

export function getReceiptCommands(receipt?: LegacyReceiptLike): CommandReceipt[] {
  const commands = receipt?.commands ?? receipt?.commandsExecuted ?? []

  return commands.map((command, index): CommandReceipt => {
    if (typeof command === 'string') {
      return {
        id: `legacy-command-${index}`,
        command,
        cwd: '',
        startedAt: '',
        completedAt: '',
        exitCode: undefined,
        stdout: '',
        stderr: '',
      }
    }

    return {
      id: command.id ?? `legacy-command-${index}`,
      command: command.command ?? '',
      cwd: command.cwd ?? '',
      startedAt: command.startedAt ?? '',
      completedAt: command.completedAt ?? '',
      exitCode: command.exitCode,
      stdout: command.stdout ?? (typeof command.output === 'string' ? command.output : ''),
      stderr: command.stderr ?? '',
    }
  })
}

export function getReceiptFileChanges(receipt?: LegacyReceiptLike): FileChangeReceipt[] {
  const changes = receipt?.fileChanges ?? receipt?.filesChanged ?? []

  return changes.map((change): FileChangeReceipt => {
    if (typeof change === 'string') {
      return {
        path: change,
        changeType: 'modified',
      }
    }

    return {
      path: change.path,
      changeType: change.changeType ?? 'modified',
      diff: change.diff,
    }
  })
}

export function getReceiptVerificationChecks(receipt?: LegacyReceiptLike): VerificationReceipt['checks'] {
  return receipt?.verification?.checks ?? receipt?.verificationResults ?? []
}

export function getReceiptVerificationStatus(receipt?: LegacyReceiptLike): VerificationReceipt['status'] {
  return receipt?.verification?.status ?? 'skipped'
}

export function getReceiptArtifacts(receipt?: LegacyReceiptLike): ArtifactReceipt[] {
  const artifacts = receipt?.artifacts ?? []
  return artifacts.filter((artifact): artifact is ArtifactReceipt => {
    return (
      artifact !== null &&
      typeof artifact === 'object' &&
      typeof artifact.type === 'string' &&
      typeof artifact.label === 'string' &&
      typeof artifact.value === 'string'
    )
  })
}

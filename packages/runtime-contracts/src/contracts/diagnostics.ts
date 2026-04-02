export interface DiagnosticsCommand {
  readonly command: string;
  readonly timeoutMs?: number;
  readonly cwd?: string;
  readonly risk?: "read" | "safe-write" | "high-impact";
}

export interface DiagnosticsGatherCommand {
  readonly description: string;
  readonly command: string;
  readonly timeout: number;
}

export interface DiagnosticsGatherResult {
  readonly description: string;
  readonly output: string;
}

export interface DiagnosticsService {
  diagnoseHot(): Promise<unknown>;
  runCommand(command: DiagnosticsCommand): Promise<string>;
  runGatherCommand(
    command: DiagnosticsGatherCommand,
  ): Promise<DiagnosticsGatherResult>;
}

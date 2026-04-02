import type {
  DiagnosticsCommand,
  DiagnosticsGatherCommand,
  DiagnosticsGatherResult,
  DiagnosticsService,
  LicenseTier,
} from "../../../runtime-contracts/dist/index.js";

export interface DiagnosticsServiceConfig {
  readonly os: {
    cpus(): Array<{ model?: string }>;
    loadavg?(): number[];
    totalmem(): number;
    freemem(): number;
  };
  readonly process: {
    platform: string;
  };
  readonly topCpuCmdSafe: string;
  readonly getDefaultCwd: () => string;
  readonly getLicenseTier: () => LicenseTier | string;
  readonly terminalWriteSafetyFields: (
    risk: DiagnosticsCommand["risk"],
  ) => Record<string, unknown>;
  readonly executeViaEngine: (args: {
    engine: unknown;
    plan: unknown[];
    projectRoot: string;
    license: string;
  }) => Promise<{
    steps?: Array<{
      result?: {
        success?: boolean;
        output?: string;
        error?: string;
      };
    }>;
  }>;
  readonly engine: unknown;
}

export interface DiagnosticsHotReport {
  readonly platform: string;
  readonly cpuModel: string;
  readonly cpuCores: number;
  readonly loadavg: number[];
  readonly mem: {
    readonly totalBytes: number;
    readonly freeBytes: number;
  };
  readonly topProcesses: string;
  readonly sensors: string;
}

export interface DiagnosticsRuntimeService extends DiagnosticsService {
  diagnoseHotLinux(): Promise<DiagnosticsHotReport>;
  runCommandOnce(command: DiagnosticsCommand): Promise<string>;
  runCommandOnceViaEngine(command: DiagnosticsCommand): Promise<string>;
}

export function createDiagnosticsService(
  config: DiagnosticsServiceConfig,
): DiagnosticsRuntimeService {
  async function runCommandOnceViaEngine(
    command: DiagnosticsCommand,
  ): Promise<string> {
    const projectRoot = command.cwd || config.getDefaultCwd();
    const plan = [
      {
        tool: "terminal.write",
        input: {
          command: command.command,
          cwd: projectRoot,
          timeoutMs: command.timeoutMs,
          stepId: "diagnostic",
        },
        stepId: "diagnostic",
        description: `Diagnostic command: ${command.command}`,
        ...config.terminalWriteSafetyFields(command.risk ?? "read"),
        verification_plan: { steps: [] },
      },
    ];
    const report = await config.executeViaEngine({
      engine: config.engine,
      plan,
      projectRoot,
      license: String(config.getLicenseTier()),
    });
    const result = report.steps?.[0]?.result;
    if (!result?.success) {
      throw new Error(result?.error ?? "Command failed");
    }
    return result.output ?? "";
  }

  function runCommandOnce(command: DiagnosticsCommand): Promise<string> {
    return runCommandOnceViaEngine(command);
  }

  async function runCommand(command: DiagnosticsCommand): Promise<string> {
    return runCommandOnce(command);
  }

  async function runGatherCommand(
    command: DiagnosticsGatherCommand,
  ): Promise<DiagnosticsGatherResult> {
    try {
      const output = await runCommandOnce({
        command: command.command,
        timeoutMs: command.timeout,
      });
      return {
        description: command.description,
        output: output || "(no output)",
      };
    } catch (error) {
      return {
        description: command.description,
        output: `Error: ${String(error)}`,
      };
    }
  }

  async function diagnoseHot(): Promise<DiagnosticsHotReport> {
    const cpus = config.os.cpus();
    const loadavg = config.os.loadavg?.() ?? [];
    const totalMem = config.os.totalmem();
    const freeMem = config.os.freemem();
    const topProcesses = await runCommandOnce({
      command: config.topCpuCmdSafe.replace("head -15", "head -n 15"),
      timeoutMs: 8000,
    }).catch((error) => `Unable to read processes: ${String(error)}`);
    const sensors = await runCommandOnce({
      command: "sensors",
      timeoutMs: 8000,
    }).catch(
      () => "No `sensors` output.",
    );
    return {
      platform: config.process.platform,
      cpuModel: cpus?.[0]?.model ?? "unknown",
      cpuCores: cpus?.length ?? 0,
      loadavg,
      mem: { totalBytes: totalMem, freeBytes: freeMem },
      topProcesses,
      sensors,
    };
  }

  return {
    diagnoseHot,
    diagnoseHotLinux: diagnoseHot,
    runCommand,
    runCommandOnce,
    runCommandOnceViaEngine,
    runGatherCommand,
  };
}

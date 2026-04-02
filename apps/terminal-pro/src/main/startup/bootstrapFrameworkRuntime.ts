import { RuntimeKernel } from "../../../../../packages/runtime-core/dist/index.js";
import { TOKENS } from "../../../../../packages/runtime-contracts/dist/index.js";
import type {
  LicenseTier,
} from "../../../../../packages/runtime-contracts/dist/index.js";
import { agentdPlugin } from "../../../../../packages/runtime-feature-agentd/dist/index.js";
import { diagnosticsPlugin } from "../../../../../packages/runtime-feature-diagnostics/dist/index.js";
import { licensingPlugin } from "../../../../../packages/runtime-feature-licensing/dist/index.js";
import { teamPlugin } from "../../../../../packages/runtime-feature-team/dist/index.js";
import { workspacePlugin } from "../../../../../packages/runtime-feature-workspace/dist/index.js";
import { electronPlatformPlugin } from "../../../../../packages/runtime-platform-electron/dist/index.js";

import type { ExecutionRuntime } from "./runtimeTypes.js";

type BootstrapFrameworkRuntimeInput = {
  environment: "development" | "test" | "production";
  appName: string;
  appVersion: string;
  execution: Pick<
    ExecutionRuntime,
    "engine" | "executeViaEngine" | "terminalWriteSafetyFields"
  >;
  app: {
    isPackaged: boolean;
    getPath(name: string): string;
  };
  fs: {
    unlinkSync(path: string): void;
  };
  path: {
    join(...parts: string[]): string;
  };
  agentdBaseUrl: string;
  agentdAuthToken: string;
  fetchImpl: typeof fetch;
  verifyLicense: (
    customerId: string,
    options?: { force?: boolean },
  ) => Promise<{
    ok?: boolean;
    tier: string;
    license_token?: string | null;
    expires_at?: number | null;
    customer_id?: string | null;
    status?: string;
  }>;
  writeJsonFile: (filePath: string, value: unknown) => unknown;
  readJsonIfExists: (filePath: string) => unknown;
  appProjectRoot: string;
  os: {
    cpus(): Array<{ model?: string }>;
    loadavg?(): number[];
    totalmem(): number;
    freemem(): number;
  };
  process: {
    platform: string;
  };
  topCpuCmdSafe: string;
  normalizeProjectRoot: (
    input: string,
    workspaceRoot?: string,
  ) => string;
  resolveProjectRootSafe: (input: unknown) => string;
  canonicalizePath: (input: string) => string;
  isWithinRoot: (target: string, root: string) => boolean;
  ipcMain: {
    handle(
      channel: string,
      listener: (event: unknown, ...args: unknown[]) => unknown,
    ): void;
  };
};

export async function bootstrapFrameworkRuntime(
  input: BootstrapFrameworkRuntimeInput,
): Promise<RuntimeKernel> {
  const kernel = new RuntimeKernel({
    environment: input.environment,
    appName: input.appName,
    appVersion: input.appVersion,
  });

  await kernel.install(electronPlatformPlugin, {
    ipcMain: input.ipcMain,
  });

  await kernel.install(licensingPlugin, {
    isPackaged: input.app.isPackaged,
    verifyLicense: input.verifyLicense,
    writeJsonFile: (filePath, value) => input.writeJsonFile(filePath, value),
    readJsonIfExists: (filePath) => input.readJsonIfExists(filePath),
    deleteFile: (filePath) => {
      try {
        input.fs.unlinkSync(filePath);
      } catch {}
    },
    entitlementFile: () =>
      input.path.join(input.app.getPath("userData"), "license-entitlement.json"),
  });

  await kernel.install(workspacePlugin, {
    appProjectRoot: input.appProjectRoot,
    normalizeProjectRoot: input.normalizeProjectRoot,
    resolveProjectRootSafe: input.resolveProjectRootSafe,
    canonicalizePath: input.canonicalizePath,
    isWithinRoot: input.isWithinRoot,
  });

  await kernel.install(agentdPlugin, {
    baseUrl: input.agentdBaseUrl,
    authToken: input.agentdAuthToken,
    fetchImpl: input.fetchImpl,
  });

  await kernel.install(diagnosticsPlugin, {
    os: input.os,
    process: input.process,
    topCpuCmdSafe: input.topCpuCmdSafe,
    getDefaultCwd: () =>
      kernel.container.resolve(TOKENS.workspaceService).getDefaultCwd(),
    getLicenseTier: () =>
      kernel.container.resolve(TOKENS.licensingService).getSnapshot().tier as LicenseTier,
    terminalWriteSafetyFields: input.execution.terminalWriteSafetyFields,
    executeViaEngine: input.execution.executeViaEngine,
    engine: input.execution.engine,
  });

  await kernel.install(teamPlugin, {
    readJsonIfExists: (filePath) => input.readJsonIfExists(filePath),
    writeJsonFile: (filePath, value) => input.writeJsonFile(filePath, value),
    teamFile: () =>
      input.path.join(input.app.getPath("userData"), "team-workspace.json"),
  });
  return kernel;
}

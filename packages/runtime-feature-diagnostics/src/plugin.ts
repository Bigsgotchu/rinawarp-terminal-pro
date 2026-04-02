import type {
  DiagnosticsCommand,
  DiagnosticsGatherCommand,
  DiagnosticsGatherResult,
  DiagnosticsService,
} from "../../runtime-contracts/dist/index.js";
import { TOKENS } from "../../runtime-contracts/dist/index.js";
import type { RuntimePlugin } from "../../runtime-core/dist/index.js";
import {
  createDiagnosticsService,
  type DiagnosticsServiceConfig,
} from "./services/createDiagnosticsService.js";

export interface DiagnosticsPluginConfig extends DiagnosticsServiceConfig {}

class DefaultDiagnosticsService implements DiagnosticsService {
  constructor(private readonly service: DiagnosticsService) {}

  diagnoseHot(): Promise<unknown> {
    return this.service.diagnoseHot();
  }

  runCommand(command: DiagnosticsCommand): Promise<string> {
    return this.service.runCommand(command);
  }

  runGatherCommand(
    command: DiagnosticsGatherCommand,
  ): Promise<DiagnosticsGatherResult> {
    return this.service.runGatherCommand(command);
  }
}

export const diagnosticsPlugin: RuntimePlugin<DiagnosticsPluginConfig> = {
  meta: {
    id: "feature.diagnostics",
    displayName: "Diagnostics",
    version: "1.0.0",
  },
  dependsOn: ["feature.workspace", "feature.licensing"],

  register(ctx) {
    const service = createDiagnosticsService(ctx.config);
    ctx.container.registerFactory(
      TOKENS.diagnosticsService,
      () => new DefaultDiagnosticsService(service),
      { singleton: true },
    );
  },
};

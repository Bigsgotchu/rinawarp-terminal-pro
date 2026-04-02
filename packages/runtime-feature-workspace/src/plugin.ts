import type { WorkspaceService } from "../../runtime-contracts/dist/index.js";
import { TOKENS } from "../../runtime-contracts/dist/index.js";
import type { RuntimePlugin } from "../../runtime-core/dist/index.js";
import {
  createWorkspaceService,
  type WorkspaceServiceConfig,
} from "./services/createWorkspaceService.js";

export type WorkspacePluginConfig = WorkspaceServiceConfig;

export const workspacePlugin: RuntimePlugin<WorkspacePluginConfig> = {
  meta: {
    id: "feature.workspace",
    displayName: "Workspace",
    version: "1.0.0",
  },

  register(ctx) {
    ctx.container.registerFactory(
      TOKENS.workspaceService,
      (): WorkspaceService => createWorkspaceService(ctx.config),
      { singleton: true },
    );
  },
};

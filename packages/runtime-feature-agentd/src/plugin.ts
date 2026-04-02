import type { AgentdClient } from "../../runtime-contracts/dist/index.js";
import { TOKENS } from "../../runtime-contracts/dist/index.js";
import type { RuntimePlugin } from "../../runtime-core/dist/index.js";

import { HttpAgentdClient, type HttpAgentdClientConfig } from "./httpAgentdClient.js";

export type AgentdPluginConfig =
  | { readonly service: AgentdClient }
  | HttpAgentdClientConfig;

function isServiceConfig(
  config: AgentdPluginConfig,
): config is { readonly service: AgentdClient } {
  return "service" in config;
}

export const agentdPlugin: RuntimePlugin<AgentdPluginConfig> = {
  meta: {
    id: "feature.agentd",
    displayName: "Agentd",
    version: "1.0.0",
  },
  dependsOn: ["feature.licensing"],

  register(ctx) {
    ctx.container.registerFactory(
      TOKENS.agentdClient,
      (container) => {
        if (isServiceConfig(ctx.config)) {
          return ctx.config.service;
        }

        return new HttpAgentdClient(
          ctx.config,
          container.resolve(TOKENS.licensingService),
        );
      },
      { singleton: true },
    );
  },
};

import { TOKENS, type IpcRegistrar } from "../../runtime-contracts/dist/index.js";
import type { RuntimeContainer, RuntimePlugin } from "../../runtime-core/dist/index.js";

export interface IpcRouteRegistrar {
  readonly id: string;
  register(
    registrar: IpcRegistrar,
    container: RuntimeContainer,
  ): void | Promise<void>;
}

export interface IpcPluginConfig {
  readonly registrars: readonly IpcRouteRegistrar[];
}

export const ipcPlugin: RuntimePlugin<IpcPluginConfig> = {
  meta: {
    id: "feature.ipc",
    displayName: "IPC",
    version: "1.0.0",
  },

  async register(ctx) {
    const registrar = ctx.container.resolve(TOKENS.ipcRegistrar);
    for (const routeRegistrar of ctx.config.registrars) {
      await routeRegistrar.register(registrar, ctx.container);
    }
  },
};

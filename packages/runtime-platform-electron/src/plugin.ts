import { TOKENS } from "../../runtime-contracts/dist/index.js";
import type { RuntimePlugin } from "../../runtime-core/dist/index.js";

import {
  createElectronIpcRegistrar,
  type ElectronIpcMainLike,
} from "./adapters/createElectronIpcRegistrar.js";

export interface ElectronPlatformPluginConfig {
  readonly ipcMain: ElectronIpcMainLike;
}

export const electronPlatformPlugin: RuntimePlugin<ElectronPlatformPluginConfig> = {
  meta: {
    id: "platform.electron",
    displayName: "Electron Platform",
    version: "1.0.0",
  },

  register(ctx) {
    ctx.container.registerValue(
      TOKENS.ipcRegistrar,
      createElectronIpcRegistrar(ctx.config.ipcMain),
    );
  },
};

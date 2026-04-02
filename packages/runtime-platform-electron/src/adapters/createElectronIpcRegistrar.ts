import type { IpcRegistrar } from "../../../runtime-contracts/dist/index.js";

export interface ElectronIpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => unknown,
  ): void;
}

export function createElectronIpcRegistrar(
  ipcMain: ElectronIpcMainLike,
): IpcRegistrar {
  return {
    handle(channel, listener) {
      ipcMain.handle(channel, (_event, ...args) => listener(...args));
    },
  };
}

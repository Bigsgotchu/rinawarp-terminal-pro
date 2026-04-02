export interface IpcRegistrar {
  handle(
    channel: string,
    listener: (...args: unknown[]) => unknown | Promise<unknown>,
  ): void;
}

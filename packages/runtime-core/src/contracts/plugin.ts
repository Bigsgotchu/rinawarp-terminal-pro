import type { RuntimeContainer } from "../container/container.js";
import type { RuntimeKernel } from "../kernel/runtime-kernel.js";
import type { Awaitable } from "../types/common.js";

export interface PluginMetadata {
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
}

export interface PluginContext<TConfig extends object = object> {
  readonly config: Readonly<TConfig>;
  readonly container: RuntimeContainer;
  readonly kernel: RuntimeKernel;
}

export interface RuntimePlugin<TConfig extends object = object> {
  readonly meta: PluginMetadata;
  readonly dependsOn?: readonly string[];
  register(ctx: PluginContext<TConfig>): Awaitable<void>;
  start?(ctx: PluginContext<TConfig>): Awaitable<void>;
  stop?(ctx: PluginContext<TConfig>): Awaitable<void>;
}

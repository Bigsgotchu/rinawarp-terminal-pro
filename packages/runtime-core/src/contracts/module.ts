import type { RuntimeContainer } from "../container/container.js";
import type { Awaitable } from "../types/common.js";

export interface RuntimeModule {
  readonly id: string;
  readonly dependsOn?: readonly string[];
  initialize(container: RuntimeContainer): Awaitable<void>;
  shutdown?(container: RuntimeContainer): Awaitable<void>;
}

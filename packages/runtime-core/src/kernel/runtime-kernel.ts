import type { PluginContext, RuntimePlugin } from "../contracts/plugin.js";
import { RuntimeContainer } from "../container/container.js";
import { RuntimeError } from "../errors/runtime-error.js";

export interface KernelConfig {
  readonly environment: "development" | "test" | "production";
  readonly appName: string;
  readonly appVersion: string;
}

type KernelState = "idle" | "starting" | "started" | "stopping";

interface InstalledPlugin<TConfig extends object = object> {
  readonly plugin: RuntimePlugin<TConfig>;
  readonly context: PluginContext<TConfig>;
}

export class RuntimeKernel {
  public readonly container = new RuntimeContainer();
  private readonly plugins = new Map<string, InstalledPlugin<object>>();
  private readonly startOrder: string[] = [];
  private readonly started = new Set<string>();
  private state: KernelState = "idle";
  private startPromise: Promise<void> | null = null;
  private sortedPlugins: string[] | null = null;

  constructor(public readonly config: KernelConfig) {}

  async install<TConfig extends object>(
    plugin: RuntimePlugin<TConfig>,
    pluginConfig: TConfig,
  ): Promise<this> {
    if (this.state !== "idle") {
      throw new RuntimeError("Cannot install plugins after runtime has started");
    }

    if (this.plugins.has(plugin.meta.id)) {
      throw new RuntimeError(`Plugin already installed: ${plugin.meta.id}`);
    }

    const context: PluginContext<TConfig> = {
      config: pluginConfig,
      container: this.container,
      kernel: this,
    };

    await plugin.register(context);
    this.plugins.set(plugin.meta.id, {
      plugin,
      context,
    } as InstalledPlugin<object>);
    this.sortedPlugins = null;
    return this;
  }

  async start(): Promise<void> {
    if (this.state === "started") {
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.startInternal();
    return this.startPromise;
  }

  private async startInternal(): Promise<void> {
    if (this.state === "stopping") {
      throw new RuntimeError("Cannot start while stopping");
    }

    this.state = "starting";

    const ordered = this.sortedPlugins ??= this.topologicallySortPlugins();
    try {
      for (const id of ordered) {
        if (this.started.has(id)) {
          continue;
        }

        const installed = this.plugins.get(id);
        if (!installed?.plugin.start) {
          continue;
        }

        await installed.plugin.start(installed.context);
        this.startOrder.push(id);
        this.started.add(id);
      }

      this.state = "started";
    } catch (error) {
      this.state = "idle";
      throw error;
    } finally {
      this.startPromise = null;
    }
  }

  async stop(): Promise<void> {
    if (this.state === "idle") {
      return;
    }

    if (this.state === "stopping") {
      return;
    }

    this.state = "stopping";
    const errors: Array<{ pluginId: string; error: unknown }> = [];

    for (const id of [...this.startOrder].reverse()) {
      const installed = this.plugins.get(id);
      if (!installed?.plugin.stop) {
        continue;
      }

      try {
        await installed.plugin.stop(installed.context);
      } catch (error) {
        errors.push({ pluginId: id, error });
      }
    }

    this.startOrder.length = 0;
    this.started.clear();
    this.state = "idle";

    if (errors.length > 0) {
      throw new RuntimeError(
        `Runtime shutdown failed for ${errors.length} plugin(s): ${errors
          .map(({ pluginId }) => pluginId)
          .join(", ")}`,
        { cause: errors[0]?.error },
      );
    }
  }

  private topologicallySortPlugins(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const output: string[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) {
        return;
      }

      if (visiting.has(id)) {
        throw new RuntimeError(`Cyclic plugin dependency detected at: ${id}`);
      }

      const installed = this.plugins.get(id);
      if (!installed) {
        throw new RuntimeError(`Missing plugin dependency: ${id}`);
      }

      visiting.add(id);
      for (const dependencyId of installed.plugin.dependsOn ?? []) {
        if (!this.plugins.has(dependencyId)) {
          throw new RuntimeError(
            `Plugin ${id} depends on missing plugin ${dependencyId}`,
          );
        }
        visit(dependencyId);
      }
      visiting.delete(id);
      visited.add(id);
      output.push(id);
    };

    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return output;
  }
}

import type { ServiceToken } from "../contracts/token.js";
import { RuntimeError } from "../errors/runtime-error.js";

type Factory<T> = (container: RuntimeContainer) => T;

interface Registration<T> {
  readonly singleton: boolean;
  readonly factory: Factory<T>;
  instance?: T;
}

export class RuntimeContainer {
  private readonly registrations = new Map<symbol, Registration<unknown>>();

  registerValue<T>(token: ServiceToken<T>, value: T): void {
    this.assertNotRegistered(token);
    this.registrations.set(token.id, {
      singleton: true,
      factory: () => value,
      instance: value,
    });
  }

  registerFactory<T>(
    token: ServiceToken<T>,
    factory: Factory<T>,
    options?: { singleton?: boolean },
  ): void {
    this.assertNotRegistered(token);
    this.registrations.set(token.id, {
      singleton: options?.singleton ?? true,
      factory,
    });
  }

  resolve<T>(token: ServiceToken<T>): T {
    const registration = this.registrations.get(token.id);
    if (!registration) {
      throw new RuntimeError(`Service not registered: ${token.description}`);
    }

    if (registration.singleton) {
      if (registration.instance === undefined) {
        registration.instance = registration.factory(this);
      }

      return registration.instance as T;
    }

    return registration.factory(this) as T;
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token.id);
  }

  private assertNotRegistered<T>(token: ServiceToken<T>): void {
    if (this.registrations.has(token.id)) {
      throw new RuntimeError(`Duplicate registration: ${token.description}`);
    }
  }
}

import { GlobalObjectManager } from '../src/utilities/global-object-manager';

/**
 * Test Suite - GlobalObjectManager
 *
 * Ensure robust management of global objects, dependencies, and conflicts.
 */
describe('GlobalObjectManager', () => {
  let manager;

  beforeEach(() => {
    // Clear singleton instance before each test
    GlobalObjectManager.instance = null;
    manager = new GlobalObjectManager();
  });

  afterEach(async () => {
    if (manager) {
      await manager.cleanup();
      GlobalObjectManager.instance = null;
    }
  });

  it('registers and initializes global objects correctly', async () => {
    const service = jest.fn(async () => ({ start: jest.fn() }));

    manager.register('myService', service);
    const instance = await manager.get('myService');

    expect(service).toHaveBeenCalled();
    expect(instance).toBeDefined();
  });

  it('prevents multiple registrations of the same global object', () => {
    const service = jest.fn();
    manager.register('myService', service);
    manager.register('myService', service);

    expect(manager.initializers.size).toBe(1);
  });

  it('initializes dependencies before the main object', async () => {
    const callOrder = [];
    const dependencyService = jest.fn(async () => {
      callOrder.push('depService');
      return {};
    });
    const myService = jest.fn(async () => {
      callOrder.push('myService');
      return { start: jest.fn() };
    });

    manager.register('depService', dependencyService);
    manager.register('myService', myService, { dependencies: ['depService'] });
    await manager.get('myService');

    expect(callOrder).toEqual(['depService', 'myService']);
  });

  it('returns the same instance on multiple get calls for singletons', async () => {
    const service = jest.fn(async () => ({ start: jest.fn() }));

    manager.register('singletonService', service);
    const instance1 = await manager.get('singletonService');
    const instance2 = await manager.get('singletonService');

    expect(instance1).toBe(instance2);
  });

  it('logs conflicts when exposing the same object to a global namespace', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const conflictingService = jest.fn(async () => ({}));

    manager.register('conflictService', conflictingService);
    window.conflictService = {};
    await manager.get('conflictService');

    expect(spy).toHaveBeenCalledWith(
      '[WARN] Global object conflict detected',
      expect.objectContaining({
        component: 'global-object-manager',
        object: 'conflictService',
      })
    );
    spy.mockRestore();
  });

  // Additional tests to cover lifecycle, cleanup, etc.
});

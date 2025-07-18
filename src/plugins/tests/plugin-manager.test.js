/**
 * Unit tests for PluginManager class
 */

import { jest } from '@jest/globals';
import { PluginManager, PluginSecurity, PluginMarketplace } from '../plugin-manager.js';

// Mock dependencies
jest.mock('events');
jest.mock('vm2');

describe('PluginManager', () => {
  let pluginManager;
  let mockTerminalManager;

  beforeEach(() => {
    mockTerminalManager = {
      writeToTerminal: jest.fn(),
      executeCommand: jest.fn(),
      onOutput: jest.fn(),
      getCurrentDirectory: jest.fn().mockReturnValue('/test/dir'),
      getHistory: jest.fn().mockReturnValue([]),
      addMenuItem: jest.fn(),
      addStatusBarItem: jest.fn(),
      showNotification: jest.fn(),
      createPanel: jest.fn(),
      addTheme: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };

    pluginManager = new PluginManager(mockTerminalManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(pluginManager.terminalManager).toBe(mockTerminalManager);
      expect(pluginManager.plugins).toBeInstanceOf(Map);
      expect(pluginManager.sandboxes).toBeInstanceOf(Map);
      expect(pluginManager.pluginAPI).toBeDefined();
      expect(pluginManager.marketplace).toBeInstanceOf(PluginMarketplace);
      expect(pluginManager.security).toBeInstanceOf(PluginSecurity);
    });
  });

  describe('createPluginAPI', () => {
    it('should create a comprehensive plugin API', () => {
      const api = pluginManager.createPluginAPI();
      
      expect(api.terminal).toBeDefined();
      expect(api.ui).toBeDefined();
      expect(api.storage).toBeDefined();
      expect(api.events).toBeDefined();
      expect(api.http).toBeDefined();
      expect(api.fs).toBeDefined();
      expect(api.utils).toBeDefined();
    });

    it('should provide terminal access methods', () => {
      const api = pluginManager.createPluginAPI();
      
      api.terminal.write('test');
      expect(mockTerminalManager.writeToTerminal).toHaveBeenCalledWith('test');
      
      api.terminal.execute('ls');
      expect(mockTerminalManager.executeCommand).toHaveBeenCalledWith('ls');
      
      expect(api.terminal.getCurrentDirectory()).toBe('/test/dir');
    });
  });

  describe('loadPlugin', () => {
    beforeEach(() => {
      pluginManager.loadPluginCode = jest.fn().mockResolvedValue('plugin code');
      pluginManager.loadPluginManifest = jest.fn().mockResolvedValue({
        name: 'test-plugin',
        version: '1.0.0',
        permissions: ['terminal:access']
      });
      pluginManager.security.validatePlugin = jest.fn().mockResolvedValue(true);
      pluginManager.createSandbox = jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ init: jest.fn() })
      });
    });

    it('should load a plugin successfully', async () => {
      const result = await pluginManager.loadPlugin('/test/plugin');
      
      expect(result).toBe(true);
      expect(pluginManager.plugins.has('test-plugin')).toBe(true);
      expect(pluginManager.emit).toHaveBeenCalledWith('plugin-loaded', 'test-plugin');
    });

    it('should handle plugin loading errors', async () => {
      pluginManager.loadPluginCode.mockRejectedValue(new Error('Load failed'));
      
      const result = await pluginManager.loadPlugin('/test/plugin');
      
      expect(result).toBe(false);
      expect(pluginManager.emit).toHaveBeenCalledWith('plugin-error', 
        expect.objectContaining({ error: expect.any(Error) }));
    });
  });

  describe('unloadPlugin', () => {
    beforeEach(() => {
      pluginManager.plugins.set('test-plugin', {
        manifest: { name: 'test-plugin', version: '1.0.0' },
        instance: { cleanup: jest.fn() },
        sandbox: {},
        trusted: false,
        active: true
      });
      pluginManager.sandboxes.set('test-plugin', {});
    });

    it('should unload a plugin successfully', async () => {
      const result = await pluginManager.unloadPlugin('test-plugin');
      
      expect(result).toBe(true);
      expect(pluginManager.plugins.has('test-plugin')).toBe(false);
      expect(pluginManager.sandboxes.has('test-plugin')).toBe(false);
      expect(pluginManager.emit).toHaveBeenCalledWith('plugin-unloaded', 'test-plugin');
    });

    it('should handle plugin not found', async () => {
      await expect(pluginManager.unloadPlugin('nonexistent-plugin'))
        .rejects.toThrow('Plugin nonexistent-plugin not found');
    });
  });

  describe('createSandbox', () => {
    it('should create a secure sandbox for untrusted plugins', () => {
      const sandbox = pluginManager.createSandbox('test-plugin', false);
      
      expect(sandbox).toBeDefined();
      expect(pluginManager.sandboxes.has('test-plugin')).toBe(true);
    });

    it('should create an enhanced sandbox for trusted plugins', () => {
      const sandbox = pluginManager.createSandbox('test-plugin', true);
      
      expect(sandbox).toBeDefined();
      expect(pluginManager.sandboxes.has('test-plugin')).toBe(true);
    });
  });

  describe('secureRequest', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should allow requests to whitelisted domains', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      await pluginManager.secureRequest('GET', 'https://api.rinawarp.com/data');
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should reject requests to non-whitelisted domains', async () => {
      await expect(pluginManager.secureRequest('GET', 'https://evil.com/data'))
        .rejects.toThrow('Domain not whitelisted for plugin requests');
    });
  });

  describe('getPluginStatus', () => {
    beforeEach(() => {
      pluginManager.plugins.set('test-plugin', {
        manifest: { name: 'test-plugin', version: '1.0.0', permissions: ['terminal:access'] },
        instance: {},
        sandbox: {},
        trusted: false,
        active: true
      });
    });

    it('should return status of all plugins', () => {
      const status = pluginManager.getPluginStatus();
      
      expect(status['test-plugin']).toEqual({
        active: true,
        version: '1.0.0',
        trusted: false,
        permissions: ['terminal:access']
      });
    });
  });

  describe('utility methods', () => {
    it('should generate UUID', () => {
      const uuid = pluginManager.generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should format date', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const formatted = pluginManager.formatDate(date);
      expect(formatted).toBe(date.toLocaleString());
    });

    it('should debounce function calls', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = pluginManager.debounce(mockFn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(mockFn).not.toHaveBeenCalled();
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    it('should throttle function calls', (done) => {
      const mockFn = jest.fn();
      const throttledFn = pluginManager.throttle(mockFn, 100);
      
      throttledFn();
      throttledFn();
      throttledFn();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      setTimeout(() => {
        throttledFn();
        expect(mockFn).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });
  });
});

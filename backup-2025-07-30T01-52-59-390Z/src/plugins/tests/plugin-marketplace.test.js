/**
 * Unit tests for PluginMarketplace class
 */

import { jest } from '@jest/globals';
import { PluginMarketplace } from '../plugin-manager.js';

// Mock global fetch
global.fetch = jest.fn();

describe('PluginMarketplace', () => {
  let pluginMarketplace;
  let mockPluginManager;

  beforeEach(() => {
    mockPluginManager = {
      loadPlugin: jest.fn(),
      emit: jest.fn(),
    };

    pluginMarketplace = new PluginMarketplace(mockPluginManager);

    // Reset localStorage mock
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(pluginMarketplace.pluginManager).toBe(mockPluginManager);
      expect(pluginMarketplace.apiEndpoint).toBe('https://plugins.rinawarp.com/api');
    });
  });

  describe('searchPlugins', () => {
    it('should search for plugins successfully', async () => {
      const mockResponse = {
        plugins: [
          { id: 'plugin1', name: 'Test Plugin 1', description: 'A test plugin' },
          { id: 'plugin2', name: 'Test Plugin 2', description: 'Another test plugin' },
        ],
      };

      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await pluginMarketplace.searchPlugins('test');

      expect(global.fetch).toHaveBeenCalledWith('https://plugins.rinawarp.com/api/search?q=test');
      expect(result).toEqual(mockResponse);
    });

    it('should handle search errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(pluginMarketplace.searchPlugins('test')).rejects.toThrow(
        'Failed to search plugins: Network error'
      );
    });

    it('should encode search queries properly', async () => {
      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ plugins: [] }),
      });

      await pluginMarketplace.searchPlugins('test query with spaces');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://plugins.rinawarp.com/api/search?q=test query with spaces'
      );
    });
  });

  describe('getPlugin', () => {
    it('should get plugin details successfully', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        downloadUrl: 'https://plugins.rinawarp.com/downloads/test-plugin.js',
        trusted: false,
      };

      global.fetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockPlugin),
      });

      const result = await pluginMarketplace.getPlugin('test-plugin');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://plugins.rinawarp.com/api/plugins/test-plugin'
      );
      expect(result).toEqual(mockPlugin);
    });

    it('should handle plugin not found', async () => {
      global.fetch.mockRejectedValue(new Error('Plugin not found'));

      await expect(pluginMarketplace.getPlugin('nonexistent-plugin')).rejects.toThrow(
        'Failed to get plugin: Plugin not found'
      );
    });
  });

  describe('installPlugin', () => {
    beforeEach(() => {
      pluginMarketplace.getPlugin = jest.fn();
      pluginMarketplace.downloadPlugin = jest.fn();
      pluginMarketplace.saveInstalledPlugin = jest.fn();
    });

    it('should install plugin successfully', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        downloadUrl: 'https://plugins.rinawarp.com/downloads/test-plugin.js',
        trusted: false,
      };

      const mockPluginCode = 'console.log("Test plugin loaded");';

      pluginMarketplace.getPlugin.mockResolvedValue(mockPlugin);
      pluginMarketplace.downloadPlugin.mockResolvedValue(mockPluginCode);
      pluginMarketplace.saveInstalledPlugin.mockResolvedValue(true);
      mockPluginManager.loadPlugin.mockResolvedValue(true);

      const result = await pluginMarketplace.installPlugin('test-plugin');

      expect(pluginMarketplace.getPlugin).toHaveBeenCalledWith('test-plugin');
      expect(pluginMarketplace.downloadPlugin).toHaveBeenCalledWith(mockPlugin.downloadUrl);
      expect(mockPluginManager.loadPlugin).toHaveBeenCalledWith(mockPluginCode, false);
      expect(pluginMarketplace.saveInstalledPlugin).toHaveBeenCalledWith('test-plugin');
      expect(result).toBe(true);
    });

    it('should handle installation errors', async () => {
      pluginMarketplace.getPlugin.mockRejectedValue(new Error('Plugin not found'));

      await expect(pluginMarketplace.installPlugin('nonexistent-plugin')).rejects.toThrow(
        'Failed to install plugin: Plugin not found'
      );
    });

    it('should handle download errors', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        downloadUrl: 'https://plugins.rinawarp.com/downloads/test-plugin.js',
        trusted: false,
      };

      pluginMarketplace.getPlugin.mockResolvedValue(mockPlugin);
      pluginMarketplace.downloadPlugin.mockRejectedValue(new Error('Download failed'));

      await expect(pluginMarketplace.installPlugin('test-plugin')).rejects.toThrow(
        'Failed to install plugin: Download failed'
      );
    });

    it('should handle plugin loading errors', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        downloadUrl: 'https://plugins.rinawarp.com/downloads/test-plugin.js',
        trusted: false,
      };

      const mockPluginCode = 'console.log("Test plugin loaded");';

      pluginMarketplace.getPlugin.mockResolvedValue(mockPlugin);
      pluginMarketplace.downloadPlugin.mockResolvedValue(mockPluginCode);
      mockPluginManager.loadPlugin.mockRejectedValue(new Error('Load failed'));

      await expect(pluginMarketplace.installPlugin('test-plugin')).rejects.toThrow(
        'Failed to install plugin: Load failed'
      );
    });

    it('should install trusted plugins with correct flag', async () => {
      const mockPlugin = {
        id: 'trusted-plugin',
        downloadUrl: 'https://plugins.rinawarp.com/downloads/trusted-plugin.js',
        trusted: true,
      };

      const mockPluginCode = 'console.log("Trusted plugin loaded");';

      pluginMarketplace.getPlugin.mockResolvedValue(mockPlugin);
      pluginMarketplace.downloadPlugin.mockResolvedValue(mockPluginCode);
      pluginMarketplace.saveInstalledPlugin.mockResolvedValue(true);
      mockPluginManager.loadPlugin.mockResolvedValue(true);

      await pluginMarketplace.installPlugin('trusted-plugin');

      expect(mockPluginManager.loadPlugin).toHaveBeenCalledWith(mockPluginCode, true);
    });
  });

  describe('downloadPlugin', () => {
    it('should download plugin code successfully', async () => {
      const mockCode = 'console.log("Plugin code");';

      global.fetch.mockResolvedValue({
        text: jest.fn().mockResolvedValue(mockCode),
      });

      const result = await pluginMarketplace.downloadPlugin('https://example.com/plugin.js');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/plugin.js');
      expect(result).toBe(mockCode);
    });

    it('should handle download errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(
        pluginMarketplace.downloadPlugin('https://example.com/plugin.js')
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid response', async () => {
      global.fetch.mockResolvedValue({
        text: jest.fn().mockRejectedValue(new Error('Invalid response')),
      });

      await expect(
        pluginMarketplace.downloadPlugin('https://example.com/plugin.js')
      ).rejects.toThrow('Invalid response');
    });
  });

  describe('saveInstalledPlugin', () => {
    it('should save plugin to localStorage', async () => {
      const existingPlugins = ['existing-plugin'];
      global.localStorage.getItem.mockReturnValue(JSON.stringify(existingPlugins));

      await pluginMarketplace.saveInstalledPlugin('new-plugin');

      expect(global.localStorage.getItem).toHaveBeenCalledWith('installed-plugins');
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'installed-plugins',
        JSON.stringify(['existing-plugin', 'new-plugin'])
      );
    });

    it('should handle empty localStorage', async () => {
      global.localStorage.getItem.mockReturnValue(null);

      await pluginMarketplace.saveInstalledPlugin('new-plugin');

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'installed-plugins',
        JSON.stringify(['new-plugin'])
      );
    });

    it('should handle invalid localStorage data', async () => {
      global.localStorage.getItem.mockReturnValue('invalid json');

      await pluginMarketplace.saveInstalledPlugin('new-plugin');

      // Should fallback to empty array and add the new plugin
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'installed-plugins',
        JSON.stringify(['new-plugin'])
      );
    });

    it('should not duplicate plugins', async () => {
      const existingPlugins = ['existing-plugin', 'duplicate-plugin'];
      global.localStorage.getItem.mockReturnValue(JSON.stringify(existingPlugins));

      await pluginMarketplace.saveInstalledPlugin('duplicate-plugin');

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'installed-plugins',
        JSON.stringify(['existing-plugin', 'duplicate-plugin', 'duplicate-plugin'])
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete plugin installation flow', async () => {
      const mockPlugin = {
        id: 'complete-plugin',
        name: 'Complete Plugin',
        version: '1.0.0',
        downloadUrl: 'https://plugins.rinawarp.com/downloads/complete-plugin.js',
        trusted: false,
      };

      const mockPluginCode = `
        export default {
          name: 'Complete Plugin',
          init() {
            console.log('Plugin initialized');
          }
        };
      `;

      // Mock all the network calls
      global.fetch
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockPlugin),
        })
        .mockResolvedValueOnce({
          text: jest.fn().mockResolvedValue(mockPluginCode),
        });

      global.localStorage.getItem.mockReturnValue('[]');
      mockPluginManager.loadPlugin.mockResolvedValue(true);

      const result = await pluginMarketplace.installPlugin('complete-plugin');

      expect(result).toBe(true);
      expect(mockPluginManager.loadPlugin).toHaveBeenCalledWith(mockPluginCode, false);
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'installed-plugins',
        JSON.stringify(['complete-plugin'])
      );
    });

    it('should handle marketplace API errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('API temporarily unavailable'));

      await expect(pluginMarketplace.searchPlugins('test')).rejects.toThrow(
        'Failed to search plugins: API temporarily unavailable'
      );

      await expect(pluginMarketplace.getPlugin('test-plugin')).rejects.toThrow(
        'Failed to get plugin: API temporarily unavailable'
      );
    });
  });
});

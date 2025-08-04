import { jest } from '@jest/globals';
import { AIProviderManager } from '../src/renderer/ai-provider-manager.js';

// Mock the AIProviderFactory
jest.mock('../src/renderer/ai-providers.js', () => ({
  AIProviderFactory: {
    createProvider: jest.fn((type) => {
      const mockProvider = {
        type,
        initialize: jest.fn().mockResolvedValue(true),
        isAvailable: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue(`${type}-provider`),
        getDescription: jest.fn().mockReturnValue(`Mock ${type} provider`),
        getCapabilities: jest.fn().mockReturnValue(['completion', 'chat']),
        generateResponse: jest.fn().mockResolvedValue({
          explanation: 'Test response',
          reasoning: 'Test reasoning',
          alternatives: [],
          expert_tips: [],
          safety_analysis: { risk_level: 'low', warnings: [] },
          best_practices: [],
          personality_flavor: 'Test flavor',
        }),
        lastError: null,
      };
      return mockProvider;
    }),
  },
}));

describe('AIProviderManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AIProviderManager();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(manager.providers).toBeInstanceOf(Map);
      expect(manager.activeProvider).toBeNull();
      expect(manager.isInitialized).toBe(false);
      expect(manager.config.preferredProvider).toBe('anthropic');
      expect(manager.config.enableFallback).toBe(true);
      expect(manager.config.responseTimeout).toBe(10000);
    });

    it('should initialize all providers', async () => {
      await manager.initialize();

      expect(manager.providers.size).toBe(4);
      expect(manager.providers.has('local')).toBe(true);
      expect(manager.providers.has('anthropic')).toBe(true);
      expect(manager.providers.has('openai')).toBe(true);
      expect(manager.providers.has('custom')).toBe(true);
      expect(manager.isInitialized).toBe(true);
    });

    it('should handle provider initialization failure gracefully', async () => {
      const { AIProviderFactory } = require('../src/renderer/ai-providers.js');
      AIProviderFactory.createProvider.mockImplementationOnce(() => {
        const provider = {
          initialize: jest.fn().mockRejectedValue(new Error('Init failed')),
          lastError: null,
        };
        return provider;
      });

      await manager.initializeProviders();
      
      // Should still have the provider in the map with error stored
      expect(manager.providers.size).toBe(4);
    });
  });

  describe('provider selection', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should select preferred provider when available', async () => {
      manager.config.preferredProvider = 'anthropic';
      await manager.selectActiveProvider();

      expect(manager.activeProvider).toBeTruthy();
      expect(manager.activeProvider.getName()).toBe('anthropic-provider');
    });

    it('should fallback to first available provider when preferred is unavailable', async () => {
      const anthropicProvider = manager.providers.get('anthropic');
      anthropicProvider.isAvailable.mockReturnValue(false);

      await manager.selectActiveProvider();

      expect(manager.activeProvider).toBeTruthy();
      expect(manager.activeProvider.type).toBe('local');
    });

    it('should handle no available providers', async () => {
      // Make all providers unavailable
      manager.providers.forEach(provider => {
        provider.isAvailable.mockReturnValue(false);
      });

      await manager.selectActiveProvider();

      expect(manager.activeProvider).toBeNull();
    });
  });

  describe('response generation', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should generate response with active provider', async () => {
      const query = 'Test query';
      const context = { test: true };

      const response = await manager.generateResponse(query, context);

      expect(response).toBeTruthy();
      expect(response.explanation).toBe('Test response');
      expect(response.provider_info).toBeTruthy();
      expect(response.provider_info.name).toBe('anthropic-provider');
      expect(response.processing_time).toBeDefined();
    });

    it('should handle response timeout', async () => {
      manager.config.responseTimeout = 100;
      manager.config.enableFallback = false; // Disable fallback to force timeout error
      const provider = manager.activeProvider;
      provider.generateResponse.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(manager.generateResponse('test')).rejects.toThrow('Response timeout');
    });

    it('should fallback to other providers on error', async () => {
      manager.config.enableFallback = true;
      const anthropicProvider = manager.providers.get('anthropic');
      anthropicProvider.generateResponse.mockRejectedValueOnce(new Error('Provider error'));

      const response = await manager.generateResponse('test');

      expect(response).toBeTruthy();
      expect(response.provider_info.fallback).toBe(true);
      expect(manager.activeProvider.type).not.toBe('anthropic');
    });

    it('should generate basic fallback response when all providers fail', async () => {
      manager.providers.forEach(provider => {
        provider.isAvailable.mockReturnValue(false);
      });
      manager.activeProvider = null;

      const response = await manager.generateResponse('help');

      expect(response).toBeTruthy();
      expect(response.provider).toBe('basic_fallback');
      expect(response.explanation).toContain('help');
    });
  });

  describe('basic fallback responses', () => {
    beforeEach(() => {
      manager.activeProvider = null;
    });

    it('should provide git-related response for git queries', () => {
      const response = manager.generateBasicFallbackResponse('git status', {});
      expect(response.explanation).toContain('Git is a powerful version control system');
    });

    it('should provide docker-related response for docker queries', () => {
      const response = manager.generateBasicFallbackResponse('docker info', {});
      expect(response.explanation).toContain('Docker helps you containerize applications');
    });

    it('should provide node-related response for node queries', () => {
      const response = manager.generateBasicFallbackResponse('node version', {});
      expect(response.explanation).toContain('Node.js is great for JavaScript development');
    });

    it('should provide generic response for unknown queries', () => {
      const response = manager.generateBasicFallbackResponse('random query', {});
      expect(response.explanation).toContain('I\'m still here to help');
    });
  });

  describe('provider management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should list all available providers', () => {
      const providers = Array.from(manager.providers.keys());
      expect(providers).toContain('local');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers).toContain('custom');
    });

    it('should track provider errors', async () => {
      const provider = manager.activeProvider;
      const error = new Error('Test error');
      provider.generateResponse.mockRejectedValueOnce(error);

      try {
        await manager.generateResponse('test');
      } catch {}

      expect(provider.lastError).toBe(error);
    });
  });
});

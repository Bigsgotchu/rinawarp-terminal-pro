/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - AI API Handler
 * Server-side AI request processing with provider management and mermaid personality
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AIProviderFactory } from '../renderer/ai-providers.js';
import { getCommandPrediction, explainCommand, getWorkflowAutomation } from '../ai/openaiClient.js';

const router = Router();

// AI Provider Manager
class AIProviderManager {
  constructor() {
    this.providers = new Map();
    this.currentProvider = 'local';
    this.fallbackProvider = 'local';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize local provider (always available)
      const localProvider = AIProviderFactory.createProvider('local');
      await localProvider.initialize();
      this.providers.set('local', localProvider);

      // Try to initialize OpenAI provider
      try {
        const openaiProvider = AIProviderFactory.createProvider('openai');
        await openaiProvider.initialize();
        this.providers.set('openai', openaiProvider);
      } catch (error) {}

      // Try to initialize Anthropic provider
      try {
        const anthropicProvider = AIProviderFactory.createProvider('anthropic');
        await anthropicProvider.initialize();
        this.providers.set('anthropic', anthropicProvider);
      } catch (error) {}

      this.initialized = true;
    } catch (error) {
      console.error('[AI] Provider initialization failed:', error);
      throw new Error(error);
    }
  }

  getProvider(name = null) {
    const providerName = name || this.currentProvider;
    const provider = this.providers.get(providerName);

    if (provider && provider.isAvailable()) {
      return provider;
    }

    // Fallback to local provider
    const fallback = this.providers.get(this.fallbackProvider);
    if (fallback && fallback.isAvailable()) {
      return fallback;
    }

    throw new Error(new Error('No AI providers available'));
  }

  getAvailableProviders() {
    const available = [];
    for (const [name, provider] of this.providers) {
      if (provider.isAvailable()) {
        available.push({
          name,
          description: provider.getDescription(),
          capabilities: provider.getCapabilities(),
          rateLimits: provider.getRateLimits(),
        });
      }
    }
    return available;
  }

  setProvider(name) {
    if (this.providers.has(name) && this.providers.get(name).isAvailable()) {
      this.currentProvider = name;
      return true;
    }
    return false;
  }
}

// Initialize provider manager
const aiManager = new AIProviderManager();

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 AI requests per minute
  message: {
    error: 'Too many AI requests. Please slow down, the mermaids need time to think! 🧜‍♀️',
    retryAfter: '1 minute',
    hint: 'Deep thoughts require deep waters - patience, dear sailor! ⭐',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const heavyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit heavy requests
  message: {
    error: 'Too many complex AI requests. Even mermaids need rest! 🧜‍♀️💤',
    retryAfter: '5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const aiQuerySchema = Joi.object({
  query: Joi.string().required().min(1).max(5000).messages({
    'string.empty': 'Query cannot be empty - what would you like to know?',
    'string.max': 'Query too long - mermaids prefer concise questions! 🧜‍♀️',
  }),
  context: Joi.object({
    workingDirectory: Joi.string().optional(),
    recentHistory: Joi.array().items(Joi.string()).max(50).optional(),
    systemInfo: Joi.object().optional(),
    sessionId: Joi.string().optional(),
  }).optional(),
  provider: Joi.string().valid('local', 'openai', 'anthropic', 'auto').default('auto'),
  personality: Joi.string()
    .valid('mermaid', 'professional', 'friendly', 'expert')
    .default('mermaid'),
  requestType: Joi.string().valid('chat', 'command', 'explain', 'analyze').default('chat'),
});

const commandSchema = Joi.object({
  command: Joi.string().required().min(1).max(500),
  context: Joi.object().optional(),
});

const providerConfigSchema = Joi.object({
  provider: Joi.string().valid('openai', 'anthropic', 'custom').required(),
  apiKey: Joi.string().when('provider', {
    is: Joi.string().valid('openai', 'anthropic'),
    then: Joi.required().min(10),
  }),
  config: Joi.object().when('provider', {
    is: 'custom',
    then: Joi.object({
      apiUrl: Joi.string().uri().required(),
      model: Joi.string().optional(),
      headers: Joi.object().optional(),
    }).required(),
  }),
});

// Validation middleware
const validate = schema => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '🧜‍♀️ Oops! Your request needs some adjustments...',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }
    next();
  };
};

// Mermaid personality transformer
class MermaidPersonality {
  static transform(response, personality = 'mermaid') {
    if (personality !== 'mermaid') return response;

    const mermaidPhrases = [
      '🧜‍♀️ *swishes tail thoughtfully*',
      '⭐ From the depths of digital ocean...',
      '🌊 Like waves upon the shore...',
      '🐚 Ah, a treasure of knowledge!',
      '🏖️ Surfacing with wisdom...',
      '💎 A pearl of technical insight:',
      '🌙 By the light of the code moon...',
      '🐠 Swimming through the data currents...',
    ];

    const closingPhrases = [
      'May your code flow like gentle tides! 🌊✨',
      'Happy coding, brave sailor! ⚓',
      'Until the next digital dive! 🏊‍♀️',
      'Keep your terminals shipshape! 🚢',
      'Smooth sailing ahead! ⛵',
      'May your bugs be as rare as sea pearls! 💎',
      'Dive deeper, code stronger! 🤿',
    ];

    // Add mermaid introduction
    const intro = mermaidPhrases[Math.floor(Math.random() * mermaidPhrases.length)];
    const outro = closingPhrases[Math.floor(Math.random() * closingPhrases.length)];

    if (typeof response === 'string') {
      return `${intro}\n\n${response}\n\n${outro}`;
    }

    if (response.explanation) {
      response.explanation = `${intro}\n\n${response.explanation}\n\n${outro}`;
    }

    // Add mermaid metadata
    response.personality = 'mermaid';
    response.mood = this.generateMermaidMood();

    return response;
  }

  static generateMermaidMood() {
    const moods = [
      { mood: 'playful', emoji: '🧜‍♀️✨', description: 'Splashing with joy!' },
      { mood: 'wise', emoji: '🧙‍♀️🔮', description: 'Ancient wisdom flows...' },
      { mood: 'curious', emoji: '👀🔍', description: 'Exploring new depths!' },
      { mood: 'helpful', emoji: '🤝💙', description: 'Ready to assist!' },
      { mood: 'energetic', emoji: '⚡🌊', description: 'Charged with sea power!' },
    ];
    return moods[Math.floor(Math.random() * moods.length)];
  }
}

// Initialize AI manager on first request
async function ensureInitialized(req, res, next) {
  try {
    if (!aiManager.initialized) {
      await aiManager.initialize();
    }
    next();
  } catch (error) {
    res.status(503).json({
      error: 'AI service initialization failed',
      message: '🧜‍♀️ The mermaids are still setting up their digital coral reef...',
      details: error.message,
      retryAfter: 30,
    });
  }
}

/**
 * POST /api/ai/chat
 * Main AI chat endpoint with personality transformation
 */
router.post(
  '/chat',
  aiLimiter,
  validate(aiQuerySchema),
  ensureInitialized,
  asyncHandler(async (req, res) => {
    const { query, context, provider, personality, requestType } = req.body;
    const startTime = Date.now();

    try {
      const aiProvider = aiManager.getProvider(provider === 'auto' ? null : provider);

      // Enhanced context with session info
      const enhancedContext = {
        ...context,
        requestType,
        timestamp: Date.now(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      };

      const response = await aiProvider.generateResponse(query, enhancedContext);

      // Apply personality transformation
      const transformedResponse = MermaidPersonality.transform(response, personality);

      // Add processing metadata
      transformedResponse.metadata = {
        provider: aiProvider.getName(),
        processingTime: Date.now() - startTime,
        requestType,
        personality,
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        response: transformedResponse,
      });
    } catch (error) {
      console.error('[AI] Chat error:', error);

      // Fallback response with mermaid personality
      const fallbackResponse = MermaidPersonality.transform(
        `🧜‍♀️ *apologetic bubble sounds* \n\nSorry, sailor! The digital currents are a bit choppy right now. ${error.message}\n\nTry again in a moment when the waves calm down!`,
        personality
      );

      res.status(500).json({
        success: false,
        error: 'AI processing failed',
        fallback: fallbackResponse,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  })
);

/**
 * POST /api/ai/command
 * Command prediction and analysis
 */
router.post(
  '/command',
  aiLimiter,
  validate(commandSchema),
  ensureInitialized,
  asyncHandler(async (req, res) => {
    const { command, context } = req.body;

    try {
      // Use legacy OpenAI client for command prediction
      const prediction = await getCommandPrediction(command, context?.workingDirectory);
      const explanation = await explainCommand(command);

      const response = MermaidPersonality.transform({
        command,
        prediction,
        explanation,
        safety: {
          riskLevel: calculateCommandRisk(command),
          warnings: generateSafetyWarnings(command),
        },
        alternatives: generateAlternatives(command),
      });

      res.json({
        success: true,
        response,
      });
    } catch (error) {
      console.error('[AI] Command analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Command analysis failed',
        fallback: MermaidPersonality.transform(
          `🧜‍♀️ The command currents are murky... Try: \`man ${command.split(' ')[0]}\` for guidance!`
        ),
      });
    }
  })
);

/**
 * POST /api/ai/workflow
 * Workflow automation suggestions
 */
router.post(
  '/workflow',
  heavyLimiter,
  validate(
    Joi.object({
      commandHistory: Joi.array().items(Joi.string()).max(100).required(),
      context: Joi.object().optional(),
    })
  ),
  ensureInitialized,
  asyncHandler(async (req, res) => {
    const { commandHistory, _context } = req.body;

    try {
      const automation = await getWorkflowAutomation(commandHistory);

      const response = MermaidPersonality.transform({
        automation,
        patterns: analyzeCommandPatterns(commandHistory),
        suggestions: generateWorkflowSuggestions(commandHistory),
        scripts: generateAutomationScripts(commandHistory),
      });

      res.json({
        success: true,
        response,
      });
    } catch (error) {
      console.error('[AI] Workflow analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Workflow analysis failed',
        fallback: MermaidPersonality.transform(
          '🧜‍♀️ The workflow waves are too complex right now. Try organizing your commands in smaller groups!'
        ),
      });
    }
  })
);

/**
 * GET /api/ai/providers
 * List available AI providers
 */
router.get(
  '/providers',
  ensureInitialized,
  asyncHandler(async (req, res) => {
    const providers = aiManager.getAvailableProviders();
    const current = aiManager.currentProvider;

    res.json({
      success: true,
      current,
      available: providers,
      message: '🧜‍♀️ Here are your available AI companions!',
    });
  })
);

/**
 * POST /api/ai/provider
 * Configure AI provider
 */
router.post(
  '/provider',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Limited provider changes
    message: { error: 'Too many provider configuration attempts' },
  }),
  validate(providerConfigSchema),
  ensureInitialized,
  asyncHandler(async (req, res) => {
    const { provider, apiKey, config } = req.body;

    try {
      if (provider === 'openai' && apiKey) {
        const openaiProvider = aiManager.getProvider('openai');
        if (openaiProvider) {
          openaiProvider.setAPIKey(apiKey);
          await openaiProvider.initialize();
        }
      } else if (provider === 'anthropic' && apiKey) {
        const anthropicProvider = aiManager.getProvider('anthropic');
        if (anthropicProvider) {
          anthropicProvider.setAPIKey(apiKey);
          await anthropicProvider.initialize();
        }
      } else if (provider === 'custom' && config) {
        const customProvider = AIProviderFactory.createProvider('custom');
        customProvider.updateConfiguration(config);
        aiManager.providers.set('custom', customProvider);
      }

      // Set as current provider
      const success = aiManager.setProvider(provider);

      res.json({
        success,
        message: success
          ? `🧜‍♀️ Successfully switched to ${provider} AI provider!`
          : `🧜‍♀️ Could not switch to ${provider} - check your configuration!`,
        currentProvider: aiManager.currentProvider,
      });
    } catch (error) {
      console.error('[AI] Provider configuration error:', error);
      res.status(400).json({
        success: false,
        error: 'Provider configuration failed',
        message: '🧜‍♀️ The AI spirits are not responding to this configuration...',
        details: error.message,
      });
    }
  })
);

/**
 * GET /api/ai/health
 * AI service health check
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const health = {
      status: 'ok',
      initialized: aiManager.initialized,
      providers: {},
      timestamp: new Date().toISOString(),
    };

    // Check each provider
    for (const [name, provider] of aiManager.providers) {
      health.providers[name] = {
        available: provider.isAvailable(),
        description: provider.getDescription(),
        lastError: provider.lastError?.message || null,
      };
    }

    const overallHealth = Object.values(health.providers).some(p => p.available);

    res.status(overallHealth ? 200 : 503).json({
      ...health,
      message: overallHealth
        ? '🧜‍♀️ All AI systems are swimming smoothly!'
        : '🧜‍♀️ Some AI systems need attention...',
    });
  })
);

// Helper functions
function calculateCommandRisk(command) {
  const dangerousCommands = ['rm -rf', 'sudo rm', 'format', 'del /f', 'killall'];
  const hasRisk = dangerousCommands.some(danger =>
    command.toLowerCase().includes(danger.toLowerCase())
  );
  return hasRisk ? 'high' : 'low';
}

function generateSafetyWarnings(command) {
  const warnings = [];
  if (command.toLowerCase().includes('rm -rf')) {
    warnings.push('⚠️ This command can permanently delete files!');
  }
  if (command.toLowerCase().includes('sudo')) {
    warnings.push('⚠️ This command requires administrative privileges');
  }
  if (command.toLowerCase().includes('chmod 777')) {
    warnings.push('⚠️ This makes files accessible to everyone - security risk!');
  }
  return warnings;
}

function generateAlternatives(command) {
  const alternatives = [];

  if (command.includes('rm ')) {
    alternatives.push('Use `trash` command for safer file deletion');
    alternatives.push('Use `mv file /tmp/` to move instead of delete');
  }

  if (command.includes('chmod 777')) {
    alternatives.push('Use `chmod 755` for executable files');
    alternatives.push('Use `chmod 644` for regular files');
  }

  return alternatives;
}

function analyzeCommandPatterns(history) {
  const patterns = {
    frequency: {},
    sequences: [],
    timePatterns: {},
  };

  // Count command frequency
  history.forEach(cmd => {
    const baseCmd = cmd.split(' ')[0];
    patterns.frequency[baseCmd] = (patterns.frequency[baseCmd] || 0) + 1;
  });

  // Find common sequences
  for (let i = 0; i < history.length - 1; i++) {
    const sequence = `${history[i]} → ${history[i + 1]}`;
    const existing = patterns.sequences.find(s => s.sequence === sequence);
    if (existing) {
      existing.count++;
    } else {
      patterns.sequences.push({ sequence, count: 1 });
    }
  }

  return patterns;
}

function generateWorkflowSuggestions(history) {
  const suggestions = [];

  // Git workflow detection
  const hasGitCommands = history.some(cmd => cmd.startsWith('git'));
  if (hasGitCommands) {
    suggestions.push({
      type: 'git-workflow',
      title: 'Create Git workflow alias',
      description: 'Automate your git add, commit, push workflow',
      script: 'git add . && git commit -m "$1" && git push',
    });
  }

  // Build workflow detection
  const hasBuildCommands = history.some(cmd => cmd.includes('npm') || cmd.includes('yarn'));
  if (hasBuildCommands) {
    suggestions.push({
      type: 'build-workflow',
      title: 'Create build and test script',
      description: 'Automate install, test, and build process',
      script: 'npm install && npm test && npm run build',
    });
  }

  return suggestions;
}

function generateAutomationScripts(history) {
  // Generate shell scripts based on common patterns
  const scripts = {};

  const gitCommands = history.filter(cmd => cmd.startsWith('git'));
  if (gitCommands.length > 3) {
    scripts.quickCommit = {
      name: 'Quick Commit',
      content: '#!/bin/bash\ngit add .\ngit commit -m "${1:-Quick update}"\ngit push',
    };
  }

  return scripts;
}

export default router;

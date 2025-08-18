/**
 * RinaWarp AI Assistant - Core AI Engine
 * Main orchestrator for all AI assistant functionality
 */

import { OllamaClient } from './ollama-client.js';
import { ContextManager } from './context-manager.js';
import { CodebaseAnalyzer } from '../analysis/codebase-analyzer.js';
import { TaskManager } from '../tasks/task-manager.js';
import logger from '../utils/logger.js';

export class RinaWarpAI {
  constructor() {
    this.ollamaClient = new OllamaClient();
    this.contextManager = new ContextManager();
    this.codebaseAnalyzer = new CodebaseAnalyzer();
    this.taskManager = new TaskManager();

    this.isInitialized = false;
    this.currentProject = null;
    this.userPreferences = this.loadUserPreferences();
  }

  /**
   * Initialize the AI assistant
   */
  async initialize() {
    try {
      logger.info('🚀 Initializing RinaWarp AI Assistant...');

      // Test Ollama connection
      await this.ollamaClient.testConnection();

      // Load user coding patterns if available
      await this.loadCodingPatterns();

      this.isInitialized = true;
      logger.info('✅ AI Assistant initialized successfully');

      return {
        success: true,
        message: 'RinaWarp AI Assistant is ready!',
        capabilities: this.getCapabilities(),
      };
    } catch (error) {
      logger.error('❌ Failed to initialize AI Assistant:', error);
      throw new Error(`AI Assistant initialization failed: ${error.message}`);
    }
  }

  /**
   * Main command processor - like my tool calling system
   */
  async processCommand(command, context = {}) {
    if (!this.isInitialized) {
      throw new Error('AI Assistant not initialized. Call initialize() first.');
    }

    try {
      logger.info(`📝 Processing command: ${command}`);

      // Parse command intent
      const intent = await this.parseCommandIntent(command, context);

      // Execute based on intent
      switch (intent.action) {
        case 'analyze_code':
          return await this.analyzeCode(intent.params);

        case 'suggest_improvements':
          return await this.suggestImprovements(intent.params);

        case 'create_task':
          return await this.createTask(intent.params);

        case 'breakdown_task':
          return await this.breakdownTask(intent.params);

        case 'generate_code':
          return await this.generateCode(intent.params);

        case 'explain_code':
          return await this.explainCode(intent.params);

        case 'review_changes':
          return await this.reviewChanges(intent.params);

        default:
          return await this.handleGeneralQuery(command, context);
      }
    } catch (error) {
      logger.error('❌ Command processing failed:', error);
      throw error;
    }
  }

  /**
   * Analyze code structure and quality
   */
  async analyzeCode(params) {
    const { filePath, projectPath, depth = 'file' } = params;

    logger.info(`🔍 Analyzing code: ${filePath || projectPath}`);

    let analysisResults;

    if (depth === 'project' || projectPath) {
      // Full project analysis
      analysisResults = await this.codebaseAnalyzer.analyzeProject(projectPath);
    } else {
      // Single file analysis
      analysisResults = await this.codebaseAnalyzer.analyzeFile(filePath);
    }

    // Get AI insights on the analysis
    const aiInsights = await this.ollamaClient.generateInsights({
      type: 'code_analysis',
      data: analysisResults,
      context: this.contextManager.getCurrentContext(),
    });

    return {
      success: true,
      analysis: analysisResults,
      insights: aiInsights,
      recommendations: this.generateRecommendations(analysisResults),
    };
  }

  /**
   * Create development tasks with AI breakdown
   */
  async createTask(params) {
    const { description, breakdown = true, estimate = false } = params;

    logger.info(`📋 Creating task: ${description}`);

    // Use AI to understand the task requirements
    const taskAnalysis = await this.ollamaClient.analyzeTask({
      description,
      context: {
        currentProject: this.currentProject,
        userPatterns: this.userPreferences.codingPatterns,
        projectStructure: await this.codebaseAnalyzer.getProjectStructure(),
      },
    });

    // Create the task with AI-generated breakdown
    const task = await this.taskManager.createTask({
      description,
      analysis: taskAnalysis,
      breakdown: breakdown
        ? await this.breakdownTask({ description, analysis: taskAnalysis })
        : null,
      estimate: estimate ? await this.estimateTask(taskAnalysis) : null,
    });

    return {
      success: true,
      task,
      message: `Task created: ${task.id}`,
    };
  }

  /**
   * Generate code that matches user's patterns
   */
  async generateCode(params) {
    const { description, fileContext, _style = 'user-patterns' } = params;

    logger.info(`🎯 Generating code: ${description}`);

    // Get user's coding patterns for this type of code
    const patterns = await this.getUserPatternsFor(fileContext?.language || 'javascript');

    // Generate code using AI
    const generatedCode = await this.ollamaClient.generateCode({
      description,
      context: fileContext,
      patterns: patterns,
      style: this.userPreferences.codeStyle,
    });

    return {
      success: true,
      code: generatedCode,
      explanation: generatedCode.explanation,
      suggestions: generatedCode.alternatives,
    };
  }

  /**
   * Parse command intent - like my tool selection logic
   */
  async parseCommandIntent(command, context) {
    const prompt = `
        Analyze this development command and determine the intent:
        Command: "${command}"
        Context: ${JSON.stringify(context, null, 2)}
        
        Return JSON with:
        {
            "action": "action_name",
            "params": {...},
            "confidence": 0.9
        }
        
        Available actions:
        - analyze_code: Analyze file or project structure
        - suggest_improvements: Suggest code improvements
        - create_task: Create development task
        - breakdown_task: Break task into steps
        - generate_code: Generate new code
        - explain_code: Explain existing code
        - review_changes: Review git changes
        `;

    const response = await this.ollamaClient.generateResponse(prompt);
    return JSON.parse(response);
  }

  /**
   * Get available capabilities - like my tool list
   */
  getCapabilities() {
    return {
      analysis: [
        'Code quality analysis',
        'Dependency mapping',
        'Security vulnerability detection',
        'Performance bottleneck identification',
      ],
      generation: [
        'Code generation from descriptions',
        'Test case generation',
        'Documentation generation',
        'Boilerplate code creation',
      ],
      tasks: [
        'Intelligent task breakdown',
        'Progress tracking',
        'Dependency management',
        'Time estimation',
      ],
      learning: [
        'Coding pattern recognition',
        'Personal style adaptation',
        'Project-specific recommendations',
        'Continuous improvement',
      ],
    };
  }

  /**
   * Load user's coding patterns for personalization
   */
  async loadCodingPatterns() {
    try {
      // This would analyze user's existing code to learn patterns
      logger.info('📚 Loading coding patterns...');
      // Implementation would go here
    } catch (error) {
      logger.warn('⚠️ Could not load coding patterns:', error.message);
    }
  }

  /**
   * Load user preferences
   */
  loadUserPreferences() {
    // Default preferences - would load from config file
    return {
      preferredModels: {
        codeGeneration: 'deepseek-coder:6.7b',
        codeReview: 'codellama:13b',
        quickSuggestions: 'deepseek-coder:1.3b',
      },
      codeStyle: {
        indentation: '  ', // 2 spaces
        quotes: 'single',
        semicolons: true,
        trailingComma: 'es5',
      },
      codingPatterns: {}, // Learned from user's code
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.complexity?.high) {
      recommendations.push({
        type: 'refactor',
        priority: 'high',
        message: 'Consider breaking down complex functions',
        files: analysis.complexity.files,
      });
    }

    if (analysis.duplicates?.length > 0) {
      recommendations.push({
        type: 'deduplication',
        priority: 'medium',
        message: 'Extract common code into reusable functions',
        duplicates: analysis.duplicates,
      });
    }

    return recommendations;
  }

  /**
   * Handle general queries - like my general conversation ability
   */
  async handleGeneralQuery(query, _context) {
    const response = await this.ollamaClient.generateResponse(query, {
      context: this.contextManager.getCurrentContext(),
      systemPrompt:
        'You are RinaWarp AI, a personal development assistant. You help with coding tasks, project management, and development workflows. Be helpful, concise, and focused on actionable advice.',
    });

    return {
      success: true,
      response,
      type: 'general_query',
    };
  }
}

export default RinaWarpAI;

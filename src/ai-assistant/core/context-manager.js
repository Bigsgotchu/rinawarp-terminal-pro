/**
 * RinaWarp AI Assistant - Context Manager
 * Manages conversation context, project context, and memory
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

export class ContextManager {
  constructor() {
    this.conversationHistory = [];
    this.projectContext = new Map();
    this.userPreferences = {};
    this.activeSession = null;
    this.maxHistoryLength = 50; // Keep last 50 interactions

    this.loadContext();
  }

  /**
   * Start a new conversation session
   */
  startSession(projectPath = null) {
    this.activeSession = {
      id: `session_${Date.now()}`,
      started: new Date().toISOString(),
      project_path: projectPath,
      interactions: 0,
      context_summary: null,
    };

    if (projectPath) {
      this.setProjectContext(projectPath);
    }

    logger.info(`🎯 New session started: ${this.activeSession.id}`);
    return this.activeSession;
  }

  /**
   * Add interaction to conversation history
   */
  addInteraction(interaction) {
    const contextualInteraction = {
      id: `interaction_${Date.now()}`,
      session_id: this.activeSession?.id,
      timestamp: new Date().toISOString(),
      user_input: interaction.input,
      ai_response: interaction.response,
      command_type: interaction.type,
      project_path: this.activeSession?.project_path,
      context: {
        files_mentioned: this.extractFilesFromText(interaction.input),
        commands_used: this.extractCommandsFromText(interaction.input),
        technologies: this.extractTechnologiesFromText(interaction.input),
      },
    };

    this.conversationHistory.push(contextualInteraction);

    // Increment session interactions
    if (this.activeSession) {
      this.activeSession.interactions++;
    }

    // Trim history if too long
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }

    this.saveContext();
    return contextualInteraction;
  }

  /**
   * Get current context for AI processing
   */
  getCurrentContext() {
    const context = {
      session: this.activeSession,
      recent_interactions: this.conversationHistory.slice(-5), // Last 5 interactions
      project_context: this.getCurrentProjectContext(),
      user_preferences: this.userPreferences,
      working_directory: process.cwd(),
      timestamp: new Date().toISOString(),
    };

    return context;
  }

  /**
   * Set project context when analyzing a specific project
   */
  async setProjectContext(projectPath) {
    try {
      const absolutePath = path.resolve(projectPath);

      // Check if we already have context for this project
      if (this.projectContext.has(absolutePath)) {
        const existing = this.projectContext.get(absolutePath);
        // Update last accessed time
        existing.last_accessed = new Date().toISOString();
        logger.debug(`📁 Using existing project context: ${absolutePath}`);
        return existing;
      }

      // Create new project context
      const context = {
        path: absolutePath,
        name: path.basename(absolutePath),
        created: new Date().toISOString(),
        last_accessed: new Date().toISOString(),

        // Basic project info (will be populated by analysis)
        structure: null,
        dependencies: null,
        git_info: null,
        patterns: null,

        // Conversation-specific context
        recent_files_worked_on: [],
        common_commands: [],
        frequent_topics: [],

        // Learning context
        user_patterns: {
          coding_style: {},
          preferred_solutions: [],
          common_workflows: [],
        },
      };

      this.projectContext.set(absolutePath, context);

      if (this.activeSession) {
        this.activeSession.project_path = absolutePath;
      }

      logger.info(`📁 Project context set: ${absolutePath}`);
      return context;
    } catch (error) {
      logger.error('❌ Failed to set project context:', error);
      return null;
    }
  }

  /**
   * Update project context with analysis results
   */
  updateProjectContext(projectPath, analysisResults) {
    const context = this.projectContext.get(projectPath);
    if (!context) return;

    context.structure = analysisResults.structure;
    context.dependencies = analysisResults.dependencies;
    context.git_info = analysisResults.git_info;
    context.patterns = analysisResults.patterns;
    context.last_analyzed = new Date().toISOString();

    logger.debug(`📁 Project context updated with analysis: ${projectPath}`);
  }

  /**
   * Get current project context
   */
  getCurrentProjectContext() {
    if (!this.activeSession?.project_path) {
      return null;
    }

    return this.projectContext.get(this.activeSession.project_path);
  }

  /**
   * Track file interactions for context
   */
  trackFileInteraction(filePath, interactionType = 'viewed') {
    const currentProject = this.getCurrentProjectContext();
    if (!currentProject) return;

    const interaction = {
      file_path: filePath,
      interaction_type: interactionType,
      timestamp: new Date().toISOString(),
    };

    currentProject.recent_files_worked_on.unshift(interaction);

    // Keep only last 20 file interactions
    if (currentProject.recent_files_worked_on.length > 20) {
      currentProject.recent_files_worked_on = currentProject.recent_files_worked_on.slice(0, 20);
    }
  }

  /**
   * Learn from user patterns
   */
  learnFromInteraction(interaction) {
    const currentProject = this.getCurrentProjectContext();
    if (!currentProject) return;

    // Learn coding patterns
    if (interaction.command_type === 'generate_code') {
      const codeStyle = this.extractCodingStyle(interaction.ai_response);
      if (codeStyle) {
        Object.assign(currentProject.user_patterns.coding_style, codeStyle);
      }
    }

    // Track frequently used commands
    const commands = this.extractCommandsFromText(interaction.user_input);
    for (const command of commands) {
      const existing = currentProject.common_commands.find(c => c.command === command);
      if (existing) {
        existing.frequency++;
      } else {
        currentProject.common_commands.push({
          command,
          frequency: 1,
          first_used: new Date().toISOString(),
        });
      }
    }

    // Sort by frequency
    currentProject.common_commands.sort((a, b) => b.frequency - a.frequency);
    currentProject.common_commands = currentProject.common_commands.slice(0, 10);
  }

  /**
   * Generate conversation summary for long sessions
   */
  generateSessionSummary() {
    if (!this.activeSession || this.conversationHistory.length < 10) {
      return null;
    }

    const sessionInteractions = this.conversationHistory.filter(
      i => i.session_id === this.activeSession.id
    );

    const summary = {
      session_id: this.activeSession.id,
      total_interactions: sessionInteractions.length,
      duration: new Date() - new Date(this.activeSession.started),
      main_topics: this.extractMainTopics(sessionInteractions),
      files_worked_on: this.extractUniqueFiles(sessionInteractions),
      commands_used: this.extractUniqueCommands(sessionInteractions),
      project_focus: this.activeSession.project_path,
    };

    this.activeSession.context_summary = summary;
    return summary;
  }

  /**
   * Get relevant context for current query
   */
  getRelevantContext(query) {
    const context = this.getCurrentContext();

    // Find related previous interactions
    const relatedInteractions = this.findRelatedInteractions(query, 3);

    // Get relevant project files
    const relevantFiles = this.getRelevantProjectFiles(query);

    return {
      ...context,
      related_interactions: relatedInteractions,
      relevant_files: relevantFiles,
      query_context: {
        mentioned_files: this.extractFilesFromText(query),
        mentioned_commands: this.extractCommandsFromText(query),
        mentioned_technologies: this.extractTechnologiesFromText(query),
      },
    };
  }

  /**
   * Helper methods for text analysis
   */

  extractFilesFromText(text) {
    // Extract file paths and names from text
    const fileRegex =
      /(?:\b[\w-]+\.(?:js|ts|jsx|tsx|py|java|cpp|c|cs|php|rb|go|rs|swift|kt|scala|dart|vue|svelte|html|css|scss|json|md|yaml|yml|xml|sql|sh)\b)/gi;
    return [...new Set(text.match(fileRegex) || [])];
  }

  extractCommandsFromText(text) {
    // Extract potential command names
    const commandRegex =
      /\b(?:analyze|generate|create|build|test|debug|refactor|optimize|deploy|install|update|fix|review)\b/gi;
    return [...new Set(text.match(commandRegex) || [])].map(c => c.toLowerCase());
  }

  extractTechnologiesFromText(text) {
    // Extract technology mentions
    const techRegex =
      /\b(?:react|vue|angular|node|express|python|django|flask|java|spring|docker|kubernetes|git|github|aws|azure|gcp)\b/gi;
    return [...new Set(text.match(techRegex) || [])].map(t => t.toLowerCase());
  }

  extractCodingStyle(generatedCode) {
    if (!generatedCode || typeof generatedCode !== 'string') return null;

    const style = {};

    // Detect indentation
    const indentMatch = generatedCode.match(/^(\s+)/m);
    if (indentMatch) {
      style.indentation = indentMatch[1].includes('\t')
        ? '\t'
        : '  '.repeat(indentMatch[1].length / 2);
    }

    // Detect quote style
    const singleQuotes = (generatedCode.match(/'/g) || []).length;
    const doubleQuotes = (generatedCode.match(/"/g) || []).length;
    style.quotes = singleQuotes > doubleQuotes ? 'single' : 'double';

    // Detect semicolon usage
    style.semicolons = generatedCode.includes(';');

    return style;
  }

  extractMainTopics(interactions) {
    const topics = new Map();

    for (const interaction of interactions) {
      const commands = interaction.context.commands_used;
      const techs = interaction.context.technologies;

      [...commands, ...techs].forEach(topic => {
        topics.set(topic, (topics.get(topic) || 0) + 1);
      });
    }

    return Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, frequency: count }));
  }

  extractUniqueFiles(interactions) {
    const files = new Set();
    interactions.forEach(i => {
      i.context.files_mentioned.forEach(file => files.add(file));
    });
    return Array.from(files);
  }

  extractUniqueCommands(interactions) {
    const commands = new Set();
    interactions.forEach(i => {
      i.context.commands_used.forEach(cmd => commands.add(cmd));
    });
    return Array.from(commands);
  }

  findRelatedInteractions(query, limit = 3) {
    const queryTerms = query.toLowerCase().split(' ');

    return this.conversationHistory
      .map(interaction => {
        const text = `${interaction.user_input} ${interaction.ai_response}`.toLowerCase();
        const relevanceScore = queryTerms.reduce((score, term) => {
          return score + (text.includes(term) ? 1 : 0);
        }, 0);

        return { interaction, relevanceScore };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .map(item => item.interaction);
  }

  getRelevantProjectFiles(query) {
    const currentProject = this.getCurrentProjectContext();
    if (!currentProject) return [];

    const mentionedFiles = this.extractFilesFromText(query);
    const recentFiles = currentProject.recent_files_worked_on.slice(0, 5);

    return [...mentionedFiles, ...recentFiles.map(f => f.file_path)];
  }

  /**
   * Persistence methods
   */

  async loadContext() {
    try {
      const contextFile = path.join(process.cwd(), '.rinawarp', 'context.json');
      const data = await fs.readFile(contextFile, 'utf-8');
      const context = JSON.parse(data);

      this.conversationHistory = context.conversationHistory || [];
      this.userPreferences = context.userPreferences || {};

      if (context.projectContext) {
        this.projectContext = new Map(context.projectContext);
      }

      logger.info(`📚 Context loaded: ${this.conversationHistory.length} interactions`);
    } catch (error) {
      logger.info('📚 Starting with fresh context');
    }
  }

  async saveContext() {
    try {
      const rinawarpDir = path.join(process.cwd(), '.rinawarp');
      await fs.mkdir(rinawarpDir, { recursive: true });

      const contextFile = path.join(rinawarpDir, 'context.json');
      const contextData = {
        conversationHistory: this.conversationHistory,
        userPreferences: this.userPreferences,
        projectContext: Array.from(this.projectContext.entries()),
        lastSaved: new Date().toISOString(),
      };

      await fs.writeFile(contextFile, JSON.stringify(contextData, null, 2));
    } catch (error) {
      logger.error('❌ Failed to save context:', error);
    }
  }

  /**
   * Clean up old context data
   */
  async cleanup() {
    // Remove old project contexts (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const [projectPath, context] of this.projectContext.entries()) {
      if (new Date(context.last_accessed) < thirtyDaysAgo) {
        this.projectContext.delete(projectPath);
        logger.debug(`🗑️  Cleaned up old project context: ${projectPath}`);
      }
    }

    await this.saveContext();
  }
}

export default ContextManager;

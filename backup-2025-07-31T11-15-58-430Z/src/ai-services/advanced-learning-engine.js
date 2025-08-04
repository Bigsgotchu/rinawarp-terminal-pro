/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Advanced Learning Engine for Terminal AI
 * Implements sophisticated machine learning algorithms for:
 * - User behavior pattern recognition
 * - Command prediction and suggestions
 * - Contextual understanding improvement
 * - Adaptive response generation
 */

class AdvancedLearningEngine {
  constructor() {
    this.userProfile = {
      commandFrequency: new Map(),
      sequencePatterns: new Map(),
      timePatterns: new Map(),
      contextPreferences: new Map(),
      skillLevel: 'intermediate', // beginner, intermediate, advanced, expert
      preferredTools: new Set(),
      workingHours: { start: 9, end: 17 },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    this.sessionData = {
      currentSession: [],
      sessionStartTime: Date.now(),
      consecutiveErrors: 0,
      successfulCommands: 0,
      averageConfidence: 0.7,
      contextSwitches: 0,
    };

    this.learningMetrics = {
      totalInteractions: 0,
      accuracyScore: 0.8,
      adaptationRate: 0.1,
      forgettingFactor: 0.95,
      confidenceThreshold: 0.6,
      learningRate: 0.05,
    };

    this.contextAnalyzer = new ContextAnalyzer();
    this.patternMatcher = new PatternMatcher();
    this.predictionEngine = new PredictionEngine();
    this.adaptiveNLP = new AdaptiveNLP();

    this.isInitialized = false;
    this.trainingData = [];
    this.neuralNetwork = null; // Simple neural network for pattern recognition
  }

  /**
   * Initialize the learning engine
   */
  async initialize() {
    try {
      // Load existing user profile and training data
      await this.loadUserProfile();
      await this.loadTrainingData();

      // Initialize sub-components
      await this.contextAnalyzer.initialize();
      await this.patternMatcher.initialize(this.userProfile);
      await this.predictionEngine.initialize(this.userProfile, this.trainingData);
      await this.adaptiveNLP.initialize();

      // Set up neural network for advanced pattern recognition
      this.initializeNeuralNetwork();

      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize learning engine:', error);
      return false;
    }
  }

  /**
   * Process a user command and learn from the interaction
   */
  async processInteraction(command, context, result) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const interaction = {
      command: command.toLowerCase().trim(),
      originalCommand: command,
      context: context || this.contextAnalyzer.getCurrentContext(),
      result,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionStartTime,
      success: !result.error && result.confidence > this.learningMetrics.confidenceThreshold,
      confidence: result.confidence || 0.5,
    };

    // Add to current session
    this.sessionData.currentSession.push(interaction);

    // Update metrics
    this.updateLearningMetrics(interaction);

    // Learn from the interaction
    this.learnFromInteraction(interaction);

    // Update user profile
    this.updateUserProfile(interaction);

    // Train adaptive NLP
    await this.adaptiveNLP.learn(interaction);

    // Update neural network
    this.updateNeuralNetwork(interaction);

    this.learningMetrics.totalInteractions++;

    // Periodic optimization
    if (this.learningMetrics.totalInteractions % 50 === 0) {
      await this.optimizeModels();
    }

    return this.generateLearningInsights(interaction);
  }

  /**
   * Learn from user interaction patterns
   */
  learnFromInteraction(interaction) {
    const { command, _success, _timestamp } = interaction;

    // Update command frequency
    const currentFreq = this.userProfile.commandFrequency.get(command) || 0;
    this.userProfile.commandFrequency.set(command, currentFreq + 1);

    // Learn sequence patterns
    this.learnSequencePatterns(interaction);

    // Learn time-based patterns
    this.learnTimePatterns(interaction);

    // Learn contextual preferences
    this.learnContextualPreferences(interaction);

    // Update skill level assessment
    this.assessSkillLevel(interaction);
  }

  /**
   * Learn sequence patterns (what commands follow what)
   */
  learnSequencePatterns(interaction) {
    const sessionCommands = this.sessionData.currentSession.map(i => i.command);

    if (sessionCommands.length >= 2) {
      const previousCommand = sessionCommands[sessionCommands.length - 2];
      const currentCommand = interaction.command;
      const sequence = `${previousCommand} -> ${currentCommand}`;

      const currentWeight = this.userProfile.sequencePatterns.get(sequence) || 0;
      this.userProfile.sequencePatterns.set(sequence, currentWeight + 1);
    }

    // Learn 3-command sequences for more sophisticated prediction
    if (sessionCommands.length >= 3) {
      const threeCommandSeq = sessionCommands.slice(-3).join(' -> ');
      const tripleWeight = this.userProfile.sequencePatterns.get(threeCommandSeq) || 0;
      this.userProfile.sequencePatterns.set(threeCommandSeq, tripleWeight + 0.5);
    }
  }

  /**
   * Learn time-based usage patterns
   */
  learnTimePatterns(interaction) {
    const date = new Date(interaction.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const timeKey = `${dayOfWeek}-${hour}`;

    const timePattern = this.userProfile.timePatterns.get(timeKey) || {
      count: 0,
      commands: new Map(),
    };
    timePattern.count++;

    const commandCount = timePattern.commands.get(interaction.command) || 0;
    timePattern.commands.set(interaction.command, commandCount + 1);

    this.userProfile.timePatterns.set(timeKey, timePattern);

    // Update working hours estimation
    this.updateWorkingHours(hour, interaction.success);
  }

  /**
   * Learn contextual preferences
   */
  learnContextualPreferences(interaction) {
    const context = interaction.context;
    const command = interaction.command;

    // Learn directory-specific commands
    if (context.currentDirectory) {
      const dirKey = `dir:${context.currentDirectory}`;
      const dirPrefs = this.userProfile.contextPreferences.get(dirKey) || new Map();
      const cmdCount = dirPrefs.get(command) || 0;
      dirPrefs.set(command, cmdCount + 1);
      this.userProfile.contextPreferences.set(dirKey, dirPrefs);
    }

    // Learn project-type specific commands
    if (context.projectType) {
      const projKey = `project:${context.projectType}`;
      const projPrefs = this.userProfile.contextPreferences.get(projKey) || new Map();
      const cmdCount = projPrefs.get(command) || 0;
      projPrefs.set(command, cmdCount + 1);
      this.userProfile.contextPreferences.set(projKey, projPrefs);
    }
  }

  /**
   * Assess and update user skill level
   */
  assessSkillLevel(interaction) {
    const commandComplexity = this.assessCommandComplexity(interaction.command);
    const errorRate =
      this.sessionData.consecutiveErrors / Math.max(this.sessionData.successfulCommands, 1);

    // Factors for skill assessment
    const factors = {
      commandComplexity: commandComplexity,
      errorRate: 1 - errorRate,
      averageConfidence: this.sessionData.averageConfidence,
      toolDiversity: this.userProfile.preferredTools.size,
      sessionLength: this.sessionData.currentSession.length,
    };

    const skillScore = this.calculateSkillScore(factors);

    // Update skill level based on score
    if (skillScore > 0.8) {
      this.userProfile.skillLevel = 'expert';
    } else if (skillScore > 0.6) {
      this.userProfile.skillLevel = 'advanced';
    } else if (skillScore > 0.4) {
      this.userProfile.skillLevel = 'intermediate';
    } else {
      this.userProfile.skillLevel = 'beginner';
    }
  }

  /**
   * Generate intelligent predictions for user commands
   */
  async generatePredictions(currentInput, context) {
    const predictions = {
      nextCommands: [],
      commandCompletions: [],
      contextualSuggestions: [],
      smartCorrections: [],
    };

    // Predict next likely commands based on sequence patterns
    predictions.nextCommands = this.predictNextCommands(context);

    // Generate command completions
    predictions.commandCompletions = this.generateCompletions(currentInput);

    // Contextual suggestions
    predictions.contextualSuggestions = this.generateContextualSuggestions(context);

    // Smart corrections for potential typos
    predictions.smartCorrections = this.generateSmartCorrections(currentInput);

    // Use neural network for advanced predictions
    if (this.neuralNetwork) {
      const neuralPredictions = this.neuralNetwork.predict(this.encodeInput(currentInput, context));
      predictions.neuralSuggestions = this.decodeNeuralOutput(neuralPredictions);
    }

    return predictions;
  }

  /**
   * Predict next likely commands
   */
  predictNextCommands(_context) {
    const recentCommands = this.sessionData.currentSession.slice(-3).map(i => i.command);

    if (recentCommands.length === 0) return [];

    const predictions = [];
    const lastCommand = recentCommands[recentCommands.length - 1];

    // Look for sequence patterns
    for (const [sequence, weight] of this.userProfile.sequencePatterns.entries()) {
      if (sequence.startsWith(lastCommand + ' ->')) {
        const nextCommand = sequence.split(' -> ')[1];
        predictions.push({
          command: nextCommand,
          confidence: this.normalizeWeight(weight),
          reason: 'sequence_pattern',
        });
      }
    }

    // Time-based predictions
    const currentTime = new Date();
    const timeKey = `${currentTime.getDay()}-${currentTime.getHours()}`;
    const timePattern = this.userProfile.timePatterns.get(timeKey);

    if (timePattern) {
      for (const [command, count] of timePattern.commands.entries()) {
        predictions.push({
          command,
          confidence: count / timePattern.count,
          reason: 'time_pattern',
        });
      }
    }

    // Sort by confidence and return top 5
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Generate command completions
   */
  generateCompletions(partialInput) {
    if (!partialInput || partialInput.length < 2) return [];

    const completions = [];
    const input = partialInput.toLowerCase();

    // Find matching commands from frequency map
    for (const [command, frequency] of this.userProfile.commandFrequency.entries()) {
      if (command.startsWith(input)) {
        completions.push({
          completion: command,
          confidence: this.normalizeFrequency(frequency),
          reason: 'frequency_match',
        });
      }
    }

    // Fuzzy matching for similar commands
    for (const [command, frequency] of this.userProfile.commandFrequency.entries()) {
      const similarity = this.calculateSimilarity(input, command);
      if (similarity > 0.7 && !command.startsWith(input)) {
        completions.push({
          completion: command,
          confidence: similarity * this.normalizeFrequency(frequency),
          reason: 'fuzzy_match',
        });
      }
    }

    return completions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  /**
   * Generate contextual suggestions
   */
  generateContextualSuggestions(context) {
    const suggestions = [];

    // Directory-specific suggestions
    if (context.currentDirectory) {
      const dirKey = `dir:${context.currentDirectory}`;
      const dirPrefs = this.userProfile.contextPreferences.get(dirKey);

      if (dirPrefs) {
        for (const [command, count] of dirPrefs.entries()) {
          suggestions.push({
            command,
            confidence: this.normalizeCount(count, dirPrefs.size),
            reason: 'directory_context',
          });
        }
      }
    }

    // Project-type suggestions
    if (context.projectType) {
      const projKey = `project:${context.projectType}`;
      const projPrefs = this.userProfile.contextPreferences.get(projKey);

      if (projPrefs) {
        for (const [command, count] of projPrefs.entries()) {
          suggestions.push({
            command,
            confidence: this.normalizeCount(count, projPrefs.size),
            reason: 'project_context',
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  }

  /**
   * Initialize simple neural network for pattern recognition
   */
  initializeNeuralNetwork() {
    // Simple feedforward neural network
    this.neuralNetwork = {
      inputSize: 50, // Encoded command and context features
      hiddenSize: 20,
      outputSize: 10, // Top command predictions

      weightsInputHidden: this.initializeWeights(50, 20),
      weightsHiddenOutput: this.initializeWeights(20, 10),
      biasHidden: new Array(20).fill(0),
      biasOutput: new Array(10).fill(0),

      predict: function (input) {
        const hidden = this.activate(
          this.matrixMultiply(input, this.weightsInputHidden),
          this.biasHidden
        );
        const output = this.activate(
          this.matrixMultiply(hidden, this.weightsHiddenOutput),
          this.biasOutput
        );
        return output;
      },

      activate: function (layer, bias) {
        return layer.map((value, i) => this.sigmoid(value + bias[i]));
      },

      sigmoid: function (x) {
        return 1 / (1 + Math.exp(-x));
      },

      matrixMultiply: function (a, b) {
        // Simplified matrix multiplication
        return a.map((val, i) => val * (b[i] || 0));
      },
    };
  }

  /**
   * Initialize neural network weights
   */
  initializeWeights(inputSize, _outputSize) {
    const weights = [];
    for (let i = 0; i < inputSize; i++) {
      weights[i] = (Math.random() - 0.5) * 2; // Random between -1 and 1
    }
    return weights;
  }

  /**
   * Update learning metrics
   */
  updateLearningMetrics(interaction) {
    if (interaction.success) {
      this.sessionData.successfulCommands++;
      this.sessionData.consecutiveErrors = 0;
    } else {
      this.sessionData.consecutiveErrors++;
    }

    // Update average confidence with exponential moving average
    this.sessionData.averageConfidence =
      this.sessionData.averageConfidence * 0.9 + interaction.confidence * 0.1;

    // Update accuracy score
    const totalCommands = this.sessionData.successfulCommands + this.sessionData.consecutiveErrors;
    this.learningMetrics.accuracyScore =
      this.sessionData.successfulCommands / Math.max(totalCommands, 1);
  }

  /**
   * Generate learning insights for the interaction
   */
  generateLearningInsights(interaction) {
    return {
      skillLevel: this.userProfile.skillLevel,
      accuracyScore: this.learningMetrics.accuracyScore,
      suggestions: this.generatePersonalizedSuggestions(interaction),
      learningTips: this.generateLearningTips(interaction),
      efficiency: this.calculateEfficiency(),
      nextPrediction: this.predictNextCommands(interaction.context)[0],
    };
  }

  /**
   * Generate personalized suggestions
   */
  generatePersonalizedSuggestions(_interaction) {
    const suggestions = [];

    // Suggest based on skill level
    if (this.userProfile.skillLevel === 'beginner') {
      suggestions.push('Try using \'help\' commands to learn more about available options');
    } else if (this.userProfile.skillLevel === 'advanced') {
      suggestions.push('Consider creating aliases for your frequently used commands');
    }

    // Suggest based on error patterns
    if (this.sessionData.consecutiveErrors > 2) {
      suggestions.push('Consider double-checking command syntax or try using tab completion');
    }

    return suggestions;
  }

  /**
   * Calculate various similarity and normalization metrics
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  normalizeWeight(weight) {
    return Math.min(weight / 10, 1.0); // Normalize to 0-1 range
  }

  normalizeFrequency(frequency) {
    const maxFreq = Math.max(...this.userProfile.commandFrequency.values());
    return frequency / maxFreq;
  }

  normalizeCount(count, total) {
    return count / total;
  }

  /**
   * Save and load user profile data
   */
  async saveUserProfile() {
    try {
      const profileData = {
        userProfile: {
          commandFrequency: Array.from(this.userProfile.commandFrequency.entries()),
          sequencePatterns: Array.from(this.userProfile.sequencePatterns.entries()),
          timePatterns: Array.from(this.userProfile.timePatterns.entries()),
          contextPreferences: Array.from(this.userProfile.contextPreferences.entries()),
          skillLevel: this.userProfile.skillLevel,
          preferredTools: Array.from(this.userProfile.preferredTools),
          workingHours: this.userProfile.workingHours,
          timezone: this.userProfile.timezone,
        },
        learningMetrics: this.learningMetrics,
        lastUpdated: Date.now(),
      };

      localStorage.setItem('rinaTerminal_userProfile', JSON.stringify(profileData));
    } catch (error) {
      console.error('❌ Failed to save user profile:', error);
    }
  }

  async loadUserProfile() {
    try {
      const profileData = localStorage.getItem('rinaTerminal_userProfile');
      if (profileData) {
        const data = JSON.parse(profileData);

        // Restore Maps from arrays
        this.userProfile.commandFrequency = new Map(data.userProfile.commandFrequency || []);
        this.userProfile.sequencePatterns = new Map(data.userProfile.sequencePatterns || []);
        this.userProfile.timePatterns = new Map(data.userProfile.timePatterns || []);
        this.userProfile.contextPreferences = new Map(data.userProfile.contextPreferences || []);

        // Restore other properties
        this.userProfile.skillLevel = data.userProfile.skillLevel || 'intermediate';
        this.userProfile.preferredTools = new Set(data.userProfile.preferredTools || []);
        this.userProfile.workingHours = data.userProfile.workingHours || { start: 9, end: 17 };
        this.userProfile.timezone =
          data.userProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

        this.learningMetrics = { ...this.learningMetrics, ...data.learningMetrics };
      }
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
    }
  }

  async loadTrainingData() {
    // Load historical training data for better predictions
    // This would typically come from a database or API
  }

  /**
   * Periodic model optimization
   */
  async optimizeModels() {
    // Apply forgetting factor to old patterns
    this.applyForgetting();

    // Optimize neural network weights
    this.optimizeNeuralNetwork();

    // Save updated profile
    await this.saveUserProfile();

    console.log('✅ Model optimization complete');
  }

  applyForgetting() {
    // Reduce weights of old patterns to prevent overfitting to outdated behavior
    for (const [key, value] of this.userProfile.sequencePatterns.entries()) {
      this.userProfile.sequencePatterns.set(key, value * this.learningMetrics.forgettingFactor);
    }
  }

  optimizeNeuralNetwork() {
    // Simple gradient descent optimization would go here
    // For now, just a placeholder
  }

  /**
   * Get learning engine status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalInteractions: this.learningMetrics.totalInteractions,
      accuracyScore: this.learningMetrics.accuracyScore,
      skillLevel: this.userProfile.skillLevel,
      knownCommands: this.userProfile.commandFrequency.size,
      sequencePatterns: this.userProfile.sequencePatterns.size,
      currentSessionLength: this.sessionData.currentSession.length,
    };
  }
}

// Supporting classes for context analysis, pattern matching, etc.
class ContextAnalyzer {
  constructor() {
    this.currentContext = {};
  }

  async initialize() {}

  getCurrentContext() {
    return {
      currentDirectory: process.cwd(),
      timestamp: Date.now(),
      projectType: this.detectProjectType(),
      recentCommands: [],
    };
  }

  detectProjectType() {
    // Simple project type detection based on files in current directory
    try {
      const fs = require('node:fs');
      if (fs.existsSync('package.json')) return 'nodejs';
      if (fs.existsSync('requirements.txt')) return 'python';
      if (fs.existsSync('Cargo.toml')) return 'rust';
      if (fs.existsSync('go.mod')) return 'go';
      return 'general';
    } catch {
      return 'general';
    }
  }
}

class PatternMatcher {
  constructor() {
    this.patterns = new Map();
  }

  async initialize(_userProfile) {}
}

class PredictionEngine {
  constructor() {
    this.models = new Map();
  }

  async initialize(_userProfile, _trainingData) {}
}

class AdaptiveNLP {
  constructor() {
    this.vocabulary = new Set();
    this.synonyms = new Map();
  }

  async initialize() {}

  async learn(interaction) {
    // Learn new vocabulary and patterns from user interactions
    const words = interaction.command.split(' ');
    words.forEach(word => this.vocabulary.add(word));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedLearningEngine };
} else if (typeof window !== 'undefined') {
  window.AdvancedLearningEngine = AdvancedLearningEngine;
}

/**
 * RinaWarp Terminal - AI Context Engine
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
class AIContextEngine {
  constructor() {
    this.commandHistory = [];
    this.projectContext = {};
    this.errorPatterns = new Map();
    this.performanceMetrics = new Map();
    this.dangerousCommands = ['rm -rf /', 'dd if=', 'mkfs.', 'fdisk', 'format', '> /dev/sda'];
    this.init();
  }

  async init() {
    await this.loadProjectContext();
    await this.loadErrorPatterns();
    this.startPerformanceMonitoring();
    console.log('🧠 AI Context Engine initialized');
  }

  async predictNextCommands(currentCommand, workingDir) {
    const context = await this.analyzeContext(workingDir);
    const patterns = this.findCommandPatterns(currentCommand);

    const predictions = {
      immediate: await this.predictImmediateNext(currentCommand, context),
      workflow: await this.predictWorkflow(currentCommand, context),
      optimized: await this.suggestOptimizations(currentCommand),
    };

    return predictions;
  }

  async analyzeCommandSafety(command, context) {
    const safetyAnalysis = {
      dangerLevel: 'safe',
      warnings: [],
      suggestions: [],
      preventExecution: false,
    };

    // Check for dangerous patterns
    for (const dangerous of this.dangerousCommands) {
      if (command.includes(dangerous)) {
        safetyAnalysis.dangerLevel = 'critical';
        safetyAnalysis.warnings.push('⚠️ CRITICAL: This command could destroy data!');
        safetyAnalysis.preventExecution = true;
        break;
      }
    }

    // Analyze based on context
    if (context.isProduction && command.includes('rm')) {
      safetyAnalysis.dangerLevel = 'high';
      safetyAnalysis.warnings.push('🚨 Deleting files in production environment!');
    }

    // Check for common mistakes
    if (command.includes('git push') && !command.includes('origin')) {
      safetyAnalysis.suggestions.push('💡 Did you mean: git push origin main?');
    }

    return safetyAnalysis;
  }

  async generateCommandDocumentation(command) {
    const docs = {
      explanation: '',
      parameters: [],
      examples: [],
      relatedCommands: [],
      tips: [],
    };

    // Parse command and generate intelligent documentation
    const parts = command.split(' ');
    const baseCommand = parts[0];

    switch (baseCommand) {
      case 'git':
        docs.explanation = `Git version control operation: ${parts[1] || 'status'}`;
        docs.examples = this.getGitExamples(parts[1]);
        docs.relatedCommands = ['git status', 'git log', 'git diff'];
        break;
      case 'docker':
        docs.explanation = `Docker container operation: ${parts[1] || 'ps'}`;
        docs.examples = this.getDockerExamples(parts[1]);
        docs.relatedCommands = ['docker ps', 'docker images', 'docker logs'];
        break;
      default:
        docs.explanation = await this.getAIExplanation(command);
    }

    return docs;
  }

  async performCodeReview(filePath) {
    const review = {
      issues: [],
      suggestions: [],
      score: 0,
      securityIssues: [],
    };

    try {
      const content = await this.readFile(filePath);
      const extension = filePath.split('.').pop();

      // Language-specific analysis
      switch (extension) {
        case 'js':
        case 'ts':
          review.issues = await this.analyzeJavaScript(content);
          break;
        case 'py':
          review.issues = await this.analyzePython(content);
          break;
        case 'java':
          review.issues = await this.analyzeJava(content);
          break;
      }

      // Security analysis
      review.securityIssues = await this.analyzeSecurityIssues(content);
      review.score = this.calculateCodeScore(review);
    } catch (error) {
      console.error('Code review failed:', error);
    }

    return review;
  }

  async analyzePerformance(command) {
    const analysis = {
      currentPerformance: 'unknown',
      optimizations: [],
      alternativeCommands: [],
      resourceImpact: 'low',
    };

    // Analyze command for performance improvements
    if (command.includes('find') && !command.includes('-type')) {
      analysis.optimizations.push('Add -type f for faster file-only search');
    }

    if (command.includes('grep -r') && !command.includes('--exclude-dir')) {
      analysis.optimizations.push('Exclude .git directories with --exclude-dir=.git');
    }

    if (command.includes('npm install') && !command.includes('--prefer-offline')) {
      analysis.alternativeCommands.push('npm install --prefer-offline (use cache)');
    }

    return analysis;
  }

  async analyzeContext(workingDir) {
    const context = {
      projectType: 'unknown',
      gitBranch: null,
      isProduction: false,
      recentCommands: [],
      fileTypes: [],
      dependencies: [],
    };

    try {
      // Detect project type
      const packageJson = await this.fileExists(workingDir + '/package.json');
      const requirements = await this.fileExists(workingDir + '/requirements.txt');
      const pomXml = await this.fileExists(workingDir + '/pom.xml');

      if (packageJson) context.projectType = 'node';
      else if (requirements) context.projectType = 'python';
      else if (pomXml) context.projectType = 'java';

      // Check if production environment
      context.isProduction =
        workingDir.includes('prod') ||
        workingDir.includes('production') ||
        process.env.NODE_ENV === 'production';

      // Get recent commands
      context.recentCommands = this.commandHistory.slice(-10);
    } catch (error) {
      console.error('Context analysis failed:', error);
    }

    return context;
  }

  async processNaturalLanguage(input) {
    const commands = {
      'deploy to production': 'npm run build && npm run deploy:prod',
      'run tests': 'npm test',
      'check git status': 'git status',
      'create new branch': 'git checkout -b feature/',
      'install dependencies': 'npm install',
      'start development server': 'npm run dev',
      'view recent commits': 'git log --oneline -10',
      'check differences': 'git diff',
    };

    const normalized = input.toLowerCase().trim();

    for (const [phrase, command] of Object.entries(commands)) {
      if (normalized.includes(phrase)) {
        return {
          command,
          confidence: 0.9,
          explanation: `Converted "${input}" to: ${command}`,
        };
      }
    }

    return {
      command: null,
      confidence: 0,
      explanation: 'Could not understand the natural language command',
    };
  }

  // Helper methods
  async loadProjectContext() {
    // Load project-specific context
  }

  async loadErrorPatterns() {
    // Load common error patterns for prevention
  }

  startPerformanceMonitoring() {
    // Start monitoring command performance
  }

  findCommandPatterns(command) {
    return this.commandHistory.filter(cmd => cmd.startsWith(command.split(' ')[0]));
  }

  async predictImmediateNext(command, context) {
    // Predict the most likely next command
    const patterns = {
      'git add': ['git commit -m ""', 'git status'],
      'npm install': ['npm start', 'npm run dev'],
      cd: ['ls', 'pwd', 'git status'],
    };

    return patterns[command] || [];
  }

  async predictWorkflow(command, context) {
    // Predict entire workflow sequences
    return [];
  }

  async suggestOptimizations(command) {
    // Suggest command optimizations
    return [];
  }

  getGitExamples(subcommand) {
    const examples = {
      commit: ['git commit -m "Add new feature"', 'git commit -am "Fix bug"'],
      push: ['git push origin main', 'git push -u origin feature-branch'],
      pull: ['git pull origin main', 'git pull --rebase'],
    };
    return examples[subcommand] || [];
  }

  getDockerExamples(subcommand) {
    const examples = {
      run: ['docker run -it ubuntu bash', 'docker run -p 3000:3000 myapp'],
      build: ['docker build -t myapp .', 'docker build --no-cache -t myapp .'],
      ps: ['docker ps', 'docker ps -a'],
    };
    return examples[subcommand] || [];
  }

  async getAIExplanation(command) {
    // Mock AI explanation - in real implementation, call actual AI API
    return `This command performs: ${command}`;
  }

  async readFile(filePath) {
    // Mock file reading - implement actual file reading
    return '';
  }

  async fileExists(filePath) {
    // Mock file existence check
    return false;
  }

  async analyzeJavaScript(content) {
    // JavaScript code analysis
    return [];
  }

  async analyzePython(content) {
    // Python code analysis
    return [];
  }

  async analyzeJava(content) {
    // Java code analysis
    return [];
  }

  async analyzeSecurityIssues(content) {
    // Security vulnerability analysis
    return [];
  }

  calculateCodeScore(review) {
    // Calculate code quality score
    return 85;
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIContextEngine;
} else {
  window.AIContextEngine = AIContextEngine;
}

class AdvancedAIContextEngine {
  constructor() {
    this.contextHistory = new Map();
    this.projectContext = new Map();
    this.errorPatterns = new Map();
    this.securityPatterns = new Map();
    this.performanceMetrics = new Map();
    this.codeGeneration = new CodeGenerationEngine();
    this.voiceControl = new VoiceControlEngine();
    this.predictiveEngine = new PredictiveCommandEngine();
    this.initializeAIProviders();
    this.initializeSecurityEngine();
  }

  initializeAIProviders() {
    this.aiProviders = {
      openai: new OpenAIProvider(),
      anthropic: new AnthropicProvider(),
      ollama: new OllamaProvider(),
      azure: new AzureOpenAIProvider(),
    };
    this.activeProvider = 'openai'; // Default
  }

  initializeSecurityEngine() {
    this.securityAnalyzer = new SecurityAnalyzer();
    this.loadSecurityPatterns();
  }

  loadSecurityPatterns() {
    // Dangerous command patterns
    this.securityPatterns.set('destructive', [
      /rm\s+-rf\s+\/.*/,
      /del\s+\/s\s+\*/,
      /format\s+c:/,
      /dd\s+if=\/dev\/zero/,
      /:(){ :|:& };:/,
      />\s*\/dev\/sd[a-z]/,
    ]);

    this.securityPatterns.set('privilege_escalation', [
      /sudo\s+su\s+-/,
      /sudo\s+passwd/,
      /sudo\s+visudo/,
      /sudo\s+chmod\s+777/,
      /sudo\s+chown\s+root/,
    ]);

    this.securityPatterns.set('network_risky', [
      /nc\s+-l/,
      /netcat\s+-l/,
      /nmap\s+-A/,
      /wget.*\|\s*bash/,
      /curl.*\|\s*sh/,
      /python.*-c.*socket/,
    ]);
  }

  async performRealTimeCodeReview(command, context) {
    const analysis = {
      security: await this.securityAnalyzer.analyze(command),
      performance: await this.analyzePerformanceImpact(command),
      bestPractices: await this.checkBestPractices(command, context),
      optimization: await this.suggestOptimizations(command),
      documentation: await this.generateDocumentation(command),
    };

    return {
      score: this.calculateCodeScore(analysis),
      suggestions: this.generateSuggestions(analysis),
      warnings: this.generateWarnings(analysis),
      improvements: this.generateImprovements(analysis),
    };
  }

  async predictNextCommands(currentCommand, context) {
    const userPatterns = this.analyzeUserPatterns(context.userId);
    const projectContext = this.getProjectContext(context.projectPath);
    const timeContext = this.getTimeContext();

    const predictions = await this.aiProviders[this.activeProvider].predict({
      current: currentCommand,
      patterns: userPatterns,
      project: projectContext,
      time: timeContext,
      history: context.commandHistory.slice(-20),
    });

    return predictions.map(pred => ({
      command: pred.command,
      confidence: pred.confidence,
      reasoning: pred.reasoning,
      estimatedTime: pred.estimatedTime,
      riskLevel: this.assessRiskLevel(pred.command),
    }));
  }

  async preventErrors(command, context) {
    const risks = [];

    // Check for destructive patterns
    for (const [category, patterns] of this.securityPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(command)) {
          risks.push({
            level: 'CRITICAL',
            category: category,
            message: await this.generateRiskMessage(command, category),
            prevention: await this.suggestSaferAlternative(command),
          });
        }
      }
    }

    // Check for common mistakes
    const mistakes = await this.detectCommonMistakes(command, context);
    risks.push(...mistakes);

    // Check for environment-specific risks
    const envRisks = await this.checkEnvironmentRisks(command, context);
    risks.push(...envRisks);

    return risks;
  }

  async generateSmartDocumentation(command, context) {
    const analysis = await this.aiProviders[this.activeProvider].analyze({
      command: command,
      context: context,
      type: 'documentation',
    });

    return {
      purpose: analysis.purpose,
      parameters: analysis.parameters,
      examples: analysis.examples,
      relatedCommands: analysis.relatedCommands,
      bestPractices: analysis.bestPractices,
      troubleshooting: analysis.troubleshooting,
    };
  }

  async processVoiceCommand(audioData) {
    const transcript = await this.voiceControl.transcribe(audioData);
    const intent = await this.voiceControl.parseIntent(transcript);

    switch (intent.type) {
      case 'execute':
        return this.convertVoiceToCommand(intent.command);
      case 'query':
        return this.answerVoiceQuery(intent.question);
      case 'navigate':
        return this.handleVoiceNavigation(intent.target);
      default:
        return { error: 'Unknown voice command intent' };
    }
  }

  async analyzeErrorAndSuggestFix(errorOutput, command, context) {
    const errorAnalysis = await this.aiProviders[this.activeProvider].analyze({
      error: errorOutput,
      command: command,
      context: context,
      type: 'error_analysis',
    });

    return {
      errorType: errorAnalysis.classification,
      rootCause: errorAnalysis.rootCause,
      suggestedFixes: errorAnalysis.fixes.map(fix => ({
        command: fix.command,
        explanation: fix.explanation,
        confidence: fix.confidence,
        riskLevel: this.assessRiskLevel(fix.command),
      })),
      preventionTips: errorAnalysis.prevention,
      relatedResources: errorAnalysis.resources,
    };
  }

  learnFromUserBehavior(command, result, context) {
    const userId = context.userId;
    const pattern = {
      command: command,
      result: result,
      context: context,
      timestamp: Date.now(),
      success: result.exitCode === 0,
    };

    if (!this.contextHistory.has(userId)) {
      this.contextHistory.set(userId, []);
    }

    this.contextHistory.get(userId).push(pattern);

    // Keep only last 1000 patterns per user
    if (this.contextHistory.get(userId).length > 1000) {
      this.contextHistory.get(userId).shift();
    }

    // Update user patterns
    this.updateUserPatterns(userId, pattern);
  }

  async analyzeProjectContext(projectPath) {
    const context = {
      type: await this.detectProjectType(projectPath),
      dependencies: await this.analyzeDependencies(projectPath),
      structure: await this.analyzeProjectStructure(projectPath),
      gitInfo: await this.analyzeGitContext(projectPath),
      buildSystem: await this.detectBuildSystem(projectPath),
      testFramework: await this.detectTestFramework(projectPath),
    };

    this.projectContext.set(projectPath, context);
    return context;
  }

  // Helper methods
  analyzeUserPatterns(userId) {
    const history = this.contextHistory.get(userId) || [];
    return {
      commonCommands: this.extractCommonCommands(history),
      timePatterns: this.extractTimePatterns(history),
      contextPatterns: this.extractContextPatterns(history),
      errorPatterns: this.extractErrorPatterns(history),
    };
  }

  calculateCodeScore(analysis) {
    let score = 100;
    score -= analysis.security.issues.length * 20;
    score -= analysis.performance.issues.length * 10;
    score -= analysis.bestPractices.violations.length * 5;
    return Math.max(0, score);
  }

  assessRiskLevel(command) {
    // Simple risk assessment - can be enhanced
    if (this.securityPatterns.get('destructive').some(p => p.test(command))) {
      return 'CRITICAL';
    }
    if (this.securityPatterns.get('privilege_escalation').some(p => p.test(command))) {
      return 'HIGH';
    }
    if (this.securityPatterns.get('network_risky').some(p => p.test(command))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}

class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    this.model = 'gpt-4';
  }

  async analyze(data) {
    // Implementation for OpenAI API calls
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert terminal assistant. Analyze the given command and provide insights.',
            },
            {
              role: 'user',
              content: JSON.stringify(data),
            },
          ],
          temperature: 0.3,
        }),
      });

      const result = await response.json();
      return JSON.parse(result.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackAnalysis(data);
    }
  }

  getFallbackAnalysis(data) {
    // Fallback analysis when API is unavailable
    return {
      purpose: 'Command analysis',
      suggestions: ['Use --help for more information'],
      confidence: 0.3,
    };
  }
}

class AnthropicProvider {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || localStorage.getItem('anthropic_api_key');
  }

  async analyze(data) {
    // Implementation for Anthropic Claude API
    return { analysis: 'Anthropic analysis placeholder' };
  }
}

class OllamaProvider {
  constructor() {
    this.endpoint = 'http://localhost:11434';
  }

  async analyze(data) {
    // Implementation for local Ollama
    return { analysis: 'Ollama local analysis placeholder' };
  }
}

class AzureOpenAIProvider {
  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = process.env.AZURE_OPENAI_KEY;
  }

  async analyze(data) {
    // Implementation for Azure OpenAI
    return { analysis: 'Azure OpenAI analysis placeholder' };
  }
}

class CodeGenerationEngine {
  async generateCode(type, requirements) {
    const templates = {
      react: this.generateReactTemplate,
      node: this.generateNodeTemplate,
      python: this.generatePythonTemplate,
      rust: this.generateRustTemplate,
    };

    if (templates[type]) {
      return templates[type](requirements);
    }

    return { error: 'Unsupported project type' };
  }

  generateReactTemplate(requirements) {
    return {
      files: {
        'package.json': JSON.stringify(
          {
            name: requirements.name || 'react-app',
            version: '1.0.0',
            dependencies: {
              react: '^18.0.0',
              'react-dom': '^18.0.0',
            },
          },
          null,
          2
        ),
        'src/App.js': `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>${requirements.title || 'Welcome to React'}</h1>
    </div>
  );
}

export default App;`,
      },
      commands: ['npm install', 'npm start'],
    };
  }
}

class VoiceControlEngine {
  constructor() {
    this.recognition = null;
    this.initializeVoiceRecognition();
  }

  initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  async transcribe(audioData) {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = event => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.start();
    });
  }

  async parseIntent(transcript) {
    // Simple intent parsing - can be enhanced with NLP
    const lowerTranscript = transcript.toLowerCase();

    if (lowerTranscript.startsWith('run ') || lowerTranscript.startsWith('execute ')) {
      return {
        type: 'execute',
        command: lowerTranscript.replace(/^(run|execute)\s+/, ''),
      };
    }

    if (lowerTranscript.startsWith('what ') || lowerTranscript.startsWith('how ')) {
      return {
        type: 'query',
        question: transcript,
      };
    }

    if (lowerTranscript.includes('go to') || lowerTranscript.includes('navigate')) {
      return {
        type: 'navigate',
        target: lowerTranscript.replace(/.*(go to|navigate to?)\s+/, ''),
      };
    }

    return {
      type: 'unknown',
      transcript: transcript,
    };
  }
}

class PredictiveCommandEngine {
  constructor() {
    this.patterns = new Map();
    this.sequences = new Map();
  }

  learnSequence(commands) {
    for (let i = 0; i < commands.length - 1; i++) {
      const current = commands[i];
      const next = commands[i + 1];

      if (!this.sequences.has(current)) {
        this.sequences.set(current, new Map());
      }

      const nextMap = this.sequences.get(current);
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }
  }

  predictNext(currentCommand) {
    const nextMap = this.sequences.get(currentCommand);
    if (!nextMap) return [];

    return Array.from(nextMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([command, count]) => ({
        command,
        confidence: count / Array.from(nextMap.values()).reduce((a, b) => a + b, 0),
      }));
  }
}

class SecurityAnalyzer {
  analyze(command) {
    const issues = [];
    const warnings = [];

    // Check for privilege escalation
    if (/sudo|su\s/.test(command)) {
      warnings.push({
        type: 'privilege_escalation',
        message: 'Command requires elevated privileges',
        severity: 'medium',
      });
    }

    // Check for destructive operations
    if (/rm\s+-rf|del\s+\/s|format/.test(command)) {
      issues.push({
        type: 'destructive',
        message: 'Potentially destructive command detected',
        severity: 'critical',
      });
    }

    return { issues, warnings };
  }
}

export { AdvancedAIContextEngine };

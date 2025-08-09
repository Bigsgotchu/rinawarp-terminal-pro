/**
 * Browser-Compatible Fallback for Enhanced AI System
 * Provides safe fallback implementations when Node.js modules are not available
 */

// Browser environment check
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Safe process object for browser
const safeProcess = isBrowser ? {
  env: {},
  cwd: () => '~',
  platform: navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 
    navigator.platform.toLowerCase().includes('win') ? 'win32' : 'linux',
  versions: { node: 'browser' }
} : (typeof process !== 'undefined' ? process : {});

// Export fallback classes if the real modules fail to load

export class EnhancedAIIntegration {
  constructor(terminal, options = {}) {
    this.terminal = terminal;
    this.options = options;
    this.isEnhancedMode = options.enableEnhancedMode || false;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🧠 Enhanced AI Integration (Browser Fallback Mode)');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Enhanced AI fallback initialization failed:', error);
      return false;
    }
  }

  shouldUseEnhancedMode(input) {
    // Basic heuristics for when to use enhanced mode
    const enhancedKeywords = [
      'analyze', 'debug', 'explain', 'generate', 'create', 'build', 
      'review', 'optimize', 'refactor', 'architecture', 'design',
      'algorithm', 'pattern', 'structure', 'performance'
    ];
        
    return this.isEnhancedMode && enhancedKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }

  async processEnhancedRequest(input, context) {
    console.log('🧠 Processing with enhanced fallback:', input);
        
    const type = this.detectRequestType(input);
    let response = '';
        
    switch (type) {
    case 'code_analysis':
      response = this.generateAnalysisResponse(input, context);
      break;
    case 'debugging':
      response = this.generateDebuggingResponse(input, context);
      break;
    case 'program_generation':
      response = this.generateProgramResponse(input, context);
      break;
    case 'architecture':
      response = this.generateArchitectureResponse(input, context);
      break;
    case 'explanation':
      response = this.generateExplanationResponse(input, context);
      break;
    default:
      response = this.generateGeneralResponse(input, context);
    }
        
    return {
      type: type,
      response: response,
      confidence: 0.7, // Fallback confidence
      source: 'enhanced-fallback',
      suggestions: this.generateSuggestions(type, input)
    };
  }

  detectRequestType(input) {
    const lower = input.toLowerCase();
    if (lower.includes('analyze') || lower.includes('analysis')) return 'code_analysis';
    if (lower.includes('debug') || lower.includes('error') || lower.includes('fix')) return 'debugging';
    if (lower.includes('generate') || lower.includes('create') || lower.includes('build')) return 'program_generation';
    if (lower.includes('architecture') || lower.includes('design') || lower.includes('structure')) return 'architecture';
    if (lower.includes('explain') || lower.includes('how') || lower.includes('what')) return 'explanation';
    return 'general';
  }

  generateAnalysisResponse(input, context) {
    return `🔍 **Code Analysis (Fallback Mode)**

I'd help you analyze your code, but I'm running in fallback mode. Here's what I can suggest:

📁 **Current Directory:** ${context.currentDirectory}
${context.gitStatus ? `🔄 **Git Status:** ${context.gitStatus.hasChanges ? 'Has changes' : 'Clean'}` : ''}

**For better code analysis, I recommend:**
• Use \`find . -name "*.js" | head -10\` to list JavaScript files
• Use \`wc -l *.py\` to count lines in Python files  
• Use \`grep -r "TODO\\|FIXME" .\` to find code comments

*💡 Tip: Enable full Enhanced AI mode for deeper analysis capabilities.*`;
  }

  generateDebuggingResponse(input, context) {
    return `🐛 **Debugging Assistant (Fallback Mode)**

I'd love to help debug your issue! In fallback mode, here are some debugging steps:

**General Debugging Process:**
1. **Identify the Error:** What's the exact error message?
2. **Check Logs:** Look for recent error logs
3. **Isolate the Problem:** Reproduce with minimal code
4. **Verify Environment:** Check dependencies and versions

**Common Commands:**
• \`tail -f /var/log/system.log\` - Monitor system logs
• \`ps aux | grep [process]\` - Check if process is running  
• \`lsof -i :3000\` - See what's using port 3000

${context.recentCommands ? `**Recent Commands:** ${context.recentCommands.slice(-3).join(', ')}` : ''}

*🧜‍♀️ For advanced debugging with stack trace analysis, please enable full Enhanced AI mode!*`;
  }

  generateProgramResponse(input, context) {
    const language = this.detectLanguage(input);
    return `⚡ **Program Generation (Fallback Mode)**

I'd generate full code for you, but I'm in fallback mode. Here's a basic ${language} template:

\`\`\`${language}
// Basic ${language} template
// ${input}

${this.getBasicTemplate(language)}
\`\`\`

**To complete this program:**
1. Define your requirements clearly
2. Break down into smaller functions
3. Add error handling
4. Write tests

*🧜‍♀️ Enable full Enhanced AI mode for complete, working programs with documentation!*`;
  }

  generateArchitectureResponse(input, context) {
    return `🏗️ **Architecture Analysis (Fallback Mode)**

For architecture design, I recommend this approach:

**Basic Architecture Principles:**
• **Separation of Concerns** - Keep different functionalities separate
• **Modularity** - Build in reusable components
• **Scalability** - Plan for growth
• **Maintainability** - Write clean, documented code

**Common Patterns:**
• MVC (Model-View-Controller)
• Microservices for large applications
• Event-driven architecture for real-time features
• REST API with proper status codes

${context.gitStatus ? `**Current Project:** Appears to be a ${context.gitStatus.hasChanges ? 'work-in-progress' : 'stable'} codebase` : ''}

*🧜‍♀️ For detailed architecture diagrams and specific recommendations, enable Enhanced AI mode!*`;
  }

  generateExplanationResponse(input, context) {
    return `📚 **Technical Explanation (Fallback Mode)**

I'd provide a detailed explanation, but I'm in fallback mode. Here's a general overview:

**Understanding Your Question:** "${input}"

This appears to be asking about technical concepts. In general:
• Break complex topics into smaller parts
• Look up official documentation  
• Try examples hands-on
• Connect to concepts you already know

**Helpful Resources:**
• Official documentation for your technology
• Stack Overflow for specific problems
• GitHub repositories with examples
• Online tutorials and courses

*🧜‍♀️ For in-depth explanations with examples and code, please enable Enhanced AI mode!*`;
  }

  generateGeneralResponse(input, context) {
    return `🧜‍♀️ **Enhanced AI (Fallback Mode)**

I understand you want help with: "${input}"

I'm currently in fallback mode, so my responses are limited. Here's what I can suggest:

**General Approach:**
1. Break down your request into specific steps
2. Use terminal commands to gather information
3. Check documentation for your tools
4. Try small experiments to test solutions

${context.currentDirectory !== '~' ? `**Working in:** ${context.currentDirectory}` : ''}
${context.recentCommands ? `**Recent activity:** ${context.recentCommands.length} commands` : ''}

*💡 Enable Enhanced AI mode for much more detailed and specific assistance!*`;
  }

  detectLanguage(input) {
    const lower = input.toLowerCase();
    if (lower.includes('python') || lower.includes('.py')) return 'python';
    if (lower.includes('javascript') || lower.includes('js') || lower.includes('node')) return 'javascript';
    if (lower.includes('bash') || lower.includes('shell') || lower.includes('script')) return 'bash';
    if (lower.includes('java')) return 'java';
    if (lower.includes('c++') || lower.includes('cpp')) return 'cpp';
    if (lower.includes('html')) return 'html';
    if (lower.includes('css')) return 'css';
    if (lower.includes('sql')) return 'sql';
    return 'text';
  }

  getBasicTemplate(language) {
    const templates = {
      python: `def main():
    print("Hello, World!")
    # Add your code here
    
if __name__ == "__main__":
    main()`,
      javascript: `function main() {
    console.log("Hello, World!");
    // Add your code here
}

main();`,
      bash: `#!/bin/bash
echo "Hello, World!"
# Add your commands here`,
      html: `<!DOCTYPE html>
<html>
<head>
    <title>My Project</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <!-- Add your content here -->
</body>
</html>`,
      css: `/* Basic CSS Template */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

/* Add your styles here */`,
      sql: `-- Basic SQL Template
SELECT * FROM table_name
WHERE condition = 'value';

-- Add your queries here`,
      text: `// Basic template
// Add your code here`
    };
        
    return templates[language] || templates.text;
  }

  generateSuggestions(type, input) {
    const suggestions = {
      code_analysis: [
        'Run static analysis tools',
        'Check code complexity metrics',
        'Look for code duplication'
      ],
      debugging: [
        'Add console.log statements',
        'Use debugger breakpoints',
        'Check error logs'
      ],
      program_generation: [
        'Start with a simple version',
        'Add error handling',
        'Write unit tests'
      ],
      architecture: [
        'Consider scalability',
        'Plan for maintenance',
        'Document your decisions'
      ],
      explanation: [
        'Read official docs',
        'Try hands-on examples',
        'Ask specific questions'
      ]
    };
        
    return suggestions[type] || ['Try being more specific', 'Break down the problem', 'Look for examples'];
  }
}

export class WarpAgentIntegration {
  constructor(terminal, options = {}) {
    this.terminal = terminal;
    this.options = options;
    this.initialized = false;
  }

  async initialize() {
    console.log('🌊 Warp Agent Integration (Browser Fallback Mode)');
    this.initialized = true;
    return true;
  }
}

// Global error handler for missing modules
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('process is not defined')) {
    console.warn('🔄 Process reference error caught - using browser fallback');
    // Prevent the error from breaking the app
    e.preventDefault();
    return false;
  }
});

// Export safe process object
export { safeProcess as process };

console.log('🛡️ Browser-compatible fallback system loaded');

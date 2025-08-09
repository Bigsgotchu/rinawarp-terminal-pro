/*
 * 🧜‍♀️ RinaWarp Terminal - CLI AI Handler
 * Handles AI queries from the CLI rina ask command
 */

import { LLMAPIClient } from '../ai-system/llm-api-client.js';
import logger from '../utilities/logger.js';

class CLIAIHandler {
  constructor() {
    this.llmClient = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // Initialize LLM client with auto-detection
      this.llmClient = new LLMAPIClient({
        provider: 'auto',
        temperature: 0.7,
        maxTokens: 1024,
      });

      const success = await this.llmClient.initialize();
      if (success) {
        this.initialized = true;
        logger.debug('✅ CLI AI Handler initialized');
        return true;
      } else {
        logger.warn('⚠️ AI providers not available, falling back to mock responses');
        return false;
      }
    } catch (error) {
      logger.error('❌ Failed to initialize CLI AI Handler:', error);
      return false;
    }
  }

  async processQuery(query) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return {
        success: false,
        error: 'Please provide a valid question',
      };
    }

    try {
      await this.initialize();

      if (this.initialized && this.llmClient) {
        // Use real AI
        const response = await this.llmClient.generateResponse(query, {
          maxTokens: 512,
          temperature: 0.7,
        });

        return {
          success: true,
          response: this.formatResponse(response),
          provider: this.llmClient.config.provider,
        };
      } else {
        // Fallback to enhanced mock responses
        return {
          success: true,
          response: this.generateEnhancedMockResponse(query),
          provider: 'mock',
        };
      }
    } catch (error) {
      logger.error('AI query failed:', error);

      // Graceful fallback to mock
      return {
        success: true,
        response: this.generateEnhancedMockResponse(query),
        provider: 'mock',
        fallback: true,
      };
    }
  }

  formatResponse(response) {
    if (!response) return "I'm not sure how to help with that.";

    // Clean up the response
    let cleaned = response.trim();

    // Add mermaid personality if not present
    if (!cleaned.includes('🧜‍♀️') && Math.random() < 0.3) {
      cleaned = `🧜‍♀️ ${cleaned}`;
    }

    return cleaned;
  }

  generateEnhancedMockResponse(query) {
    const lowerQuery = query.toLowerCase();

    // File operations
    if (lowerQuery.includes('file') || lowerQuery.includes('list') || lowerQuery.includes('ls')) {
      return `🧜‍♀️ Here are the best commands for file operations:

📁 **List Files:**
• \`ls -la\` - List all files with details
• \`find . -name "*.txt"\` - Find files by pattern
• \`du -sh *\` - Show file sizes
• \`tree\` - Show directory structure

💡 **Pro tip:** Use \`ls -lah\` for human-readable file sizes!`;
    }

    // Git operations
    if (lowerQuery.includes('git')) {
      return `🧜‍♀️ Git commands I can help you with:

🐙 **Essential Git:**
• \`git status\` - Check repository status
• \`git log --oneline\` - View commit history
• \`git diff\` - See changes
• \`git add .\` - Stage all changes
• \`git commit -m "message"\` - Commit with message
• \`git push\` - Push to remote

🌊 **Git flows like ocean currents - master the flow, master the code!**`;
    }

    // Process management
    if (
      lowerQuery.includes('process') ||
      lowerQuery.includes('kill') ||
      lowerQuery.includes('ps')
    ) {
      return `🧜‍♀️ Process management commands:

⚡ **Monitor Processes:**
• \`ps aux\` - List all processes
• \`htop\` - Interactive process viewer
• \`top\` - Real-time process monitor
• \`pgrep -f "pattern"\` - Find processes by name

💀 **Terminate Processes:**
• \`kill PID\` - Gracefully stop process
• \`kill -9 PID\` - Force kill process
• \`killall processname\` - Kill by name

🔍 **Find Process ID:** \`ps aux | grep processname\``;
    }

    // Docker
    if (lowerQuery.includes('docker')) {
      return `🧜‍♀️ Docker commands (containers are like magical underwater bubbles!):

🐳 **Basic Docker:**
• \`docker ps\` - List running containers
• \`docker images\` - List available images
• \`docker run -it image bash\` - Run interactive container
• \`docker build -t name .\` - Build image
• \`docker logs container_id\` - View container logs

🧹 **Cleanup:**
• \`docker system prune\` - Clean up unused resources
• \`docker container prune\` - Remove stopped containers`;
    }

    // System monitoring
    if (
      lowerQuery.includes('system') ||
      lowerQuery.includes('monitor') ||
      lowerQuery.includes('memory') ||
      lowerQuery.includes('cpu')
    ) {
      return `🧜‍♀️ System monitoring like checking the ocean's vital signs:

📊 **System Resources:**
• \`htop\` - Interactive system monitor
• \`free -h\` - Memory usage
• \`df -h\` - Disk space
• \`du -sh *\` - Directory sizes
• \`uptime\` - System uptime and load

🔥 **Performance Analysis:**
• \`iotop\` - Disk I/O monitor
• \`nethogs\` - Network usage by process
• \`vmstat 1\` - Virtual memory statistics`;
    }

    // Network operations
    if (
      lowerQuery.includes('network') ||
      lowerQuery.includes('ping') ||
      lowerQuery.includes('curl') ||
      lowerQuery.includes('wget')
    ) {
      return `🧜‍♀️ Network commands (like sending messages across the digital ocean):

🌐 **Network Testing:**
• \`ping google.com\` - Test connectivity
• \`traceroute google.com\` - Trace network path
• \`netstat -tulpn\` - Show listening ports
• \`ss -tulpn\` - Modern netstat alternative

📥 **Download Files:**
• \`curl -O url\` - Download file
• \`wget url\` - Download file
• \`curl -s url | jq\` - Download and parse JSON`;
    }

    // Programming help
    if (
      lowerQuery.includes('code') ||
      lowerQuery.includes('program') ||
      lowerQuery.includes('debug')
    ) {
      return `🧜‍♀️ Programming assistance (let's make some magic happen):

💻 **Development Tools:**
• \`grep -r "pattern" .\` - Search code
• \`find . -name "*.js" -exec grep -l "pattern" {} \\;\` - Find files containing pattern
• \`wc -l *.js\` - Count lines of code
• \`diff file1 file2\` - Compare files

🐛 **Debugging:**
• Check error logs in \`/var/log/\`
• Use \`strace\` to trace system calls
• Try \`lsof\` to see open files
• Monitor with \`tail -f logfile\``;
    }

    // Error help
    if (
      lowerQuery.includes('error') ||
      lowerQuery.includes('fix') ||
      lowerQuery.includes('problem')
    ) {
      return `🧜‍♀️ Don't worry, every developer faces errors! Here's how to tackle them:

🔍 **Debugging Steps:**
1. Read the error message carefully
2. Check recent changes you made
3. Look at log files
4. Search for the error online
5. Ask for help with specific details

🛟 **Common Solutions:**
• Restart the service/application
• Check file permissions
• Verify dependencies are installed
• Clear cache/temporary files
• Check available disk space`;
    }

    // Default helpful response
    return `🧜‍♀️ I'm here to help! While my AI brain is still learning, I can assist with:

🌟 **What I can help with:**
• Terminal commands and shell operations
• File and directory management
• Git and version control
• Docker and containerization
• System monitoring and processes
• Network operations and debugging
• Programming and development tasks

💡 **Try asking me about:**
• "How do I find large files?"
• "Git commands for beginners"
• "Docker container management"
• "System performance monitoring"

🧜‍♀️ *The more specific your question, the better I can help you!*`;
  }

  // Get status of AI handler
  getStatus() {
    return {
      initialized: this.initialized,
      provider: this.llmClient?.config?.provider || 'none',
      available: Boolean(this.llmClient),
    };
  }
}

// Export singleton instance
const cliAIHandler = new CLIAIHandler();
export { cliAIHandler };

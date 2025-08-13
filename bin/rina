#!/usr/bin/env node

/**
 * Rina CLI - Command Line Interface for RinaWarp Terminal
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, exec } from 'child_process';
import http from 'http';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  pink: '\x1b[95m',
};

function rinaLog(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function rinaError(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function rinaSuccess(message) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function rinaInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function showWelcome() {
  console.log(`
${colors.pink}╭─────────────────────────────────────╮${colors.reset}
${colors.pink}│${colors.reset}  🧜‍♀️ ${colors.bright}Rina CLI - Your AI Assistant${colors.reset}   ${colors.pink}│${colors.reset}
${colors.pink}╰─────────────────────────────────────╯${colors.reset}

🧜‍♀️ Hey there! Rina here, ready to help!

${colors.dim}Type "${colors.bright}rina help${colors.reset}${colors.dim}" for available commands${colors.reset}
${colors.dim}Or just ask me anything: "${colors.bright}rina how do I list files?${colors.reset}${colors.dim}"${colors.reset}
`);
}

function showHelp() {
  console.log(`
${colors.pink}🧜‍♀️ Rina CLI Help${colors.reset}

${colors.bright}Usage:${colors.reset}
  rina [command] [options]

${colors.bright}Commands:${colors.reset}
  ${colors.green}ask <question>${colors.reset}      Ask Rina anything
  ${colors.green}chat <message>${colors.reset}     Start a conversation with Rina
  ${colors.green}cmd <command>${colors.reset}      Execute a command with Rina's help
  ${colors.green}run <command>${colors.reset}      Same as cmd
  ${colors.green}status${colors.reset}             Check RinaWarp Terminal status
  ${colors.green}start${colors.reset}              Start RinaWarp Terminal
  ${colors.green}config${colors.reset}             Show current configuration
  ${colors.green}help${colors.reset}               Show this help message
  ${colors.green}version${colors.reset}            Show version information

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}rina ask "How do I find large files?"${colors.reset}
  ${colors.cyan}rina cmd "git status"${colors.reset}
  ${colors.cyan}rina "What's the weather like?"${colors.reset}
  ${colors.cyan}rina status${colors.reset}
  ${colors.cyan}rina start${colors.reset}

${colors.dim}💡 Tip: You can ask Rina questions directly without the 'ask' command${colors.reset}
`);
}

function showVersion() {
  console.log(`
${colors.pink}🧜‍♀️ Rina CLI v1.0.0${colors.reset}
${colors.dim}Part of RinaWarp Terminal${colors.reset}
${colors.dim}Copyright (c) 2025 Rinawarp Technologies, LLC${colors.reset}
`);
}

async function showStatus() {
  rinaLog('🧜‍♀️ Checking RinaWarp Terminal status...');

  return new Promise(resolve => {
    exec('pgrep -f "RinaWarp Terminal|rinawarp-terminal"', (error, stdout) => {
      if (!error && stdout.trim()) {
        rinaSuccess('✅ RinaWarp Terminal is running');
        rinaInfo('You can interact with Rina using this CLI');
      } else {
        rinaError('❌ RinaWarp Terminal is not running');
        rinaInfo('Use "rina start" to launch RinaWarp Terminal');
      }
      resolve();
    });
  });
}

async function startRinaWarp() {
  rinaLog('🧜‍♀️ Starting RinaWarp Terminal...');

  const possiblePaths = [
    '/Users/kgilley/rinawarp-terminal/launch-creator-terminal.cjs',
    '/Applications/RinaWarp Terminal.app/Contents/MacOS/RinaWarp Terminal',
  ];

  for (const terminalPath of possiblePaths) {
    if (fs.existsSync(terminalPath)) {
      rinaInfo(`Found RinaWarp Terminal at: ${terminalPath}`);

      if (terminalPath.endsWith('.cjs')) {
        spawn('node', [terminalPath], {
          detached: true,
          stdio: 'ignore',
          cwd: path.dirname(terminalPath),
        }).unref();
      } else {
        spawn(terminalPath, [], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      }

      setTimeout(() => {
        rinaSuccess('✅ Done! Anything else?');
      }, 2000);
      return;
    }
  }

  rinaError('Could not find RinaWarp Terminal installation');
}

// Helper function to query AI API
async function queryAIAPI(question) {
  const possiblePorts = [3000, 8080, 8081, 3001];

  for (const port of possiblePorts) {
    try {
      const response = await makeAPIRequest(port, question);
      return response;
    } catch (error) {
      // Try next port
      continue;
    }
  }

  throw new Error('No API server found');
}

// Make API request to specific port
function makeAPIRequest(port, query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });

    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/ai/cli-ask',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 5000,
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.response) {
            resolve(parsed.response);
          } else {
            reject(new Error(parsed.error || 'API error'));
          }
        } catch (error) {
          reject(new Error('Invalid API response'));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function askRina(question) {
  rinaLog('🧜‍♀️ 🤔 Let me think about that...');

  try {
    // Try to connect to the local API server
    const response = await queryAIAPI(question);

    console.log(`\n${colors.cyan}🧜‍♀️ Rina says:${colors.reset}\n`);
    console.log(response);
    console.log(
      `\n${colors.dim}💡 Need more help? Try: rina ask "more details about <topic>"${colors.reset}\n`
    );
  } catch (error) {
    // Fallback to enhanced static responses if API is not available
    console.log(
      `\n${colors.yellow}⚠️ AI service unavailable, using offline responses${colors.reset}\n`
    );

    const fallbackResponse = generateFallbackResponse(question);
    console.log(`\n${colors.cyan}🧜‍♀️ Rina says:${colors.reset}\n`);
    console.log(fallbackResponse);
    console.log(
      `\n${colors.dim}💡 Start RinaWarp Terminal for full AI capabilities${colors.reset}\n`
    );
  }
}

// Enhanced fallback responses when API is not available
function generateFallbackResponse(question) {
  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes('file') ||
    lowerQuestion.includes('list') ||
    lowerQuestion.includes('ls')
  ) {
    return `🧜‍♀️ Here are the best commands for file operations:

📁 **List Files:**
• ${colors.green}ls -la${colors.reset} - List all files with details
• ${colors.green}find . -name "*.txt"${colors.reset} - Find files by pattern
• ${colors.green}du -sh *${colors.reset} - Show file sizes
• ${colors.green}tree${colors.reset} - Show directory structure

💡 **Pro tip:** Use ${colors.green}ls -lah${colors.reset} for human-readable file sizes!`;
  }

  if (lowerQuestion.includes('git')) {
    return `🧜‍♀️ Git commands I can help you with:

🐙 **Essential Git:**
• ${colors.green}git status${colors.reset} - Check repository status
• ${colors.green}git log --oneline${colors.reset} - View commit history
• ${colors.green}git diff${colors.reset} - See changes
• ${colors.green}git add .${colors.reset} - Stage all changes
• ${colors.green}git commit -m "message"${colors.reset} - Commit with message
• ${colors.green}git push${colors.reset} - Push to remote

🌊 **Git flows like ocean currents - master the flow, master the code!**`;
  }

  if (lowerQuestion.includes('docker')) {
    return `🧜‍♀️ Docker commands (containers are like magical underwater bubbles!):

🐳 **Basic Docker:**
• ${colors.green}docker ps${colors.reset} - List running containers
• ${colors.green}docker images${colors.reset} - List available images
• ${colors.green}docker run -it image bash${colors.reset} - Run interactive container
• ${colors.green}docker build -t name .${colors.reset} - Build image
• ${colors.green}docker logs container_id${colors.reset} - View container logs

🧹 **Cleanup:**
• ${colors.green}docker system prune${colors.reset} - Clean up unused resources
• ${colors.green}docker container prune${colors.reset} - Remove stopped containers`;
  }

  if (
    lowerQuestion.includes('system') ||
    lowerQuestion.includes('monitor') ||
    lowerQuestion.includes('memory') ||
    lowerQuestion.includes('cpu') ||
    lowerQuestion.includes('performance')
  ) {
    return `🧜‍♀️ System monitoring like checking the ocean's vital signs:

📊 **System Resources:**
• ${colors.green}htop${colors.reset} - Interactive system monitor
• ${colors.green}free -h${colors.reset} - Memory usage
• ${colors.green}df -h${colors.reset} - Disk space
• ${colors.green}du -sh *${colors.reset} - Directory sizes
• ${colors.green}uptime${colors.reset} - System uptime and load

🔥 **Performance Analysis:**
• ${colors.green}iotop${colors.reset} - Disk I/O monitor
• ${colors.green}nethogs${colors.reset} - Network usage by process`;
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

async function executeCommand(cmdString) {
  rinaLog(`🧜‍♀️ Executing: ${colors.bright}${cmdString}${colors.reset}`);

  return new Promise(resolve => {
    const child = exec(cmdString, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        rinaError(`Command failed: ${error.message}`);
        if (stderr) console.log(stderr);
      } else {
        if (stdout) console.log(stdout);
        rinaSuccess('✅ Command completed successfully');
      }
      resolve();
    });
  });
}

async function showConfig() {
  rinaLog('🧜‍♀️ Current Configuration:');

  const configInfo = {
    'CLI Version': '1.0.0',
    Platform: os.platform(),
    Architecture: os.arch(),
    'Node Version': process.version,
    'Home Directory': os.homedir(),
    'Current Directory': process.cwd(),
    'License Status': fs.existsSync(path.join(os.homedir(), '.rinawarp-creator'))
      ? '✅ Creator License Active'
      : 'Standard',
  };

  console.log();
  Object.entries(configInfo).forEach(([key, value]) => {
    console.log(`  ${colors.blue}${key}:${colors.reset} ${value}`);
  });
  console.log();
}

async function processCommand(args) {
  const command = args[0]?.toLowerCase();
  const input = args.slice(1).join(' ');

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      showVersion();
      break;
    case 'status':
      await showStatus();
      break;
    case 'start':
      await startRinaWarp();
      break;
    case 'ask':
    case 'chat':
      if (!input) {
        rinaError('Please provide a question or message');
        rinaInfo('Example: rina ask "How do I list files?"');
        return;
      }
      await askRina(input);
      break;
    case 'cmd':
    case 'command':
    case 'run':
      if (!input) {
        rinaError('Please provide a command to execute');
        rinaInfo('Example: rina cmd "ls -la"');
        return;
      }
      await executeCommand(input);
      break;
    case 'config':
      await showConfig();
      break;
    default:
      if (args.length === 0) {
        showWelcome();
      } else if (command) {
        await askRina(args.join(' '));
      } else {
        showHelp();
      }
      break;
  }
}

async function main() {
  const args = process.argv.slice(2);
  try {
    await processCommand(args);
  } catch (error) {
    rinaError(`An error occurred: ${error.message}`);
    process.exit(1);
  }
}

main();

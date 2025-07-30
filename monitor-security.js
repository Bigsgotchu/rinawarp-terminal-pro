#!/usr/bin/env node
/**
 * RinaWarp Terminal Security Monitoring Dashboard
 * Real-time monitoring of security events and threat detection
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

class SecurityMonitor {
  constructor() {
    this.isMonitoring = false;
    this.threatCounts = {
      blocked: 0,
      warnings: 0,
      critical: 0
    };
    this.startTime = new Date();
  }

  async startMonitoring() {
    console.log(chalk.blue.bold('🛡️ RinaWarp Security Monitor Started'));
    console.log(chalk.gray(`Started at: ${this.startTime.toISOString()}`));
    console.log(chalk.gray('Connecting to Railway logs...\n'));

    this.isMonitoring = true;
    this.displayHeader();

    try {
      // Start Railway logs monitoring
      const railwayLogs = spawn('railway', ['logs', '--follow'], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      railwayLogs.stdout.on('data', (data) => {
        this.processLogLine(data.toString());
      });

      railwayLogs.stderr.on('data', (data) => {
        console.error(chalk.red(`Railway error: ${data}`));
      });

      railwayLogs.on('close', (code) => {
        console.log(chalk.yellow(`Railway logs process exited with code ${code}`));
        this.isMonitoring = false;
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n🔄 Shutting down security monitor...'));
        railwayLogs.kill();
        this.displaySummary();
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red(`Failed to start monitoring: ${error.message}`));
      console.log(chalk.yellow('Make sure Railway CLI is installed and authenticated'));
    }
  }

  displayHeader() {
    console.log(chalk.cyan('┌─────────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan('│                 🔒 SECURITY EVENTS MONITOR                 │'));
    console.log(chalk.cyan('├─────────────────────────────────────────────────────────────┤'));
    console.log(chalk.cyan('│ Legend:                                                     │'));
    console.log(chalk.cyan('│ 🚫 Blocked IP     ⚠️  Threat Warning    🔥 Critical Alert   │'));
    console.log(chalk.cyan('│ 🛡️  Defense Active 📊 Analytics        🎯 Admin Access      │'));
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────────┘\n'));
  }

  processLogLine(line) {
    const timestamp = new Date().toLocaleTimeString();
    const cleanLine = line.trim();

    // Skip empty lines
    if (!cleanLine) return;

    // Detect security events
    if (cleanLine.includes('🚫 Blocked request')) {
      this.threatCounts.blocked++;
      const match = cleanLine.match(/🚫 Blocked request from ([\d.]+): (\w+) (.*?) \((.*?)\)/);
      if (match) {
        const [, ip, method, url, reason] = match;
        console.log(chalk.red(`[${timestamp}] 🚫 BLOCKED: ${ip} → ${method} ${url}`));
        console.log(chalk.red(`                   Reason: ${reason}\n`));
      }
    }
    else if (cleanLine.includes('⚠️ Threat detected')) {
      this.threatCounts.warnings++;
      console.log(chalk.yellow(`[${timestamp}] ⚠️  THREAT: ${cleanLine}\n`));
    }
    else if (cleanLine.includes('🔥 CRITICAL THREAT')) {
      this.threatCounts.critical++;
      console.log(chalk.red.bold(`[${timestamp}] 🔥 CRITICAL: ${cleanLine}\n`));
    }
    else if (cleanLine.includes('🛡️ Advanced Threat Detection')) {
      console.log(chalk.green(`[${timestamp}] 🛡️  System initialized successfully\n`));
    }
    else if (cleanLine.includes('JWT token generated')) {
      console.log(chalk.blue(`[${timestamp}] 🎯 Admin token generated\n`));
    }
    else if (cleanLine.includes('🚀 RinaWarp Terminal server running')) {
      console.log(chalk.green(`[${timestamp}] 🚀 Server started and ready\n`));
    }
    else if (cleanLine.includes('GET /admin') || cleanLine.includes('POST /admin')) {
      console.log(chalk.cyan(`[${timestamp}] 🎯 Admin access attempt: ${cleanLine}\n`));
    }
    else if (cleanLine.includes('Server Error')) {
      console.log(chalk.red(`[${timestamp}] 💥 Server Error: ${cleanLine}\n`));
    }
    else if (cleanLine.includes('📊') || cleanLine.includes('Analytics')) {
      console.log(chalk.magenta(`[${timestamp}] 📊 Analytics: ${cleanLine}\n`));
    }
    
    // Show periodic stats
    if (this.threatCounts.blocked + this.threatCounts.warnings + this.threatCounts.critical > 0) {
      if ((this.threatCounts.blocked + this.threatCounts.warnings + this.threatCounts.critical) % 10 === 0) {
        this.displayStats();
      }
    }
  }

  displayStats() {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    console.log(chalk.cyan('┌─────────────────────────────────────────┐'));
    console.log(chalk.cyan('│            📊 SECURITY STATS            │'));
    console.log(chalk.cyan('├─────────────────────────────────────────┤'));
    console.log(chalk.cyan(`│ Uptime: ${uptime}s                        │`));
    console.log(chalk.cyan(`│ Blocked IPs: ${this.threatCounts.blocked.toString().padStart(3)}                    │`));
    console.log(chalk.cyan(`│ Threat Warnings: ${this.threatCounts.warnings.toString().padStart(3)}               │`));
    console.log(chalk.cyan(`│ Critical Alerts: ${this.threatCounts.critical.toString().padStart(3)}               │`));
    console.log(chalk.cyan('└─────────────────────────────────────────┘\n'));
  }

  displaySummary() {
    const duration = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    console.log(chalk.blue('\n📋 Monitoring Session Summary:'));
    console.log(chalk.gray(`Duration: ${duration} seconds`));
    console.log(chalk.gray(`Blocked IPs: ${this.threatCounts.blocked}`));
    console.log(chalk.gray(`Warnings: ${this.threatCounts.warnings}`));
    console.log(chalk.gray(`Critical Alerts: ${this.threatCounts.critical}`));
    console.log(chalk.blue('Security monitoring stopped.\n'));
  }
}

// Quick Railway status check
async function checkRailwayStatus() {
  console.log(chalk.blue('🔍 Checking Railway connection...'));
  
  try {
    const statusProcess = spawn('railway', ['status'], { stdio: 'pipe' });
    
    statusProcess.stdout.on('data', (data) => {
      console.log(chalk.green('✅ Railway connection verified'));
      console.log(chalk.gray(data.toString().trim()));
    });

    statusProcess.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('🚀 Starting security monitor...\n'));
        const monitor = new SecurityMonitor();
        monitor.startMonitoring();
      } else {
        console.log(chalk.red('❌ Railway CLI not authenticated or available'));
        console.log(chalk.yellow('Please run: railway login'));
      }
    });

  } catch (error) {
    console.log(chalk.red('❌ Railway CLI not found'));
    console.log(chalk.yellow('Please install: npm install -g @railway/cli'));
  }
}

// Usage instructions
console.log(chalk.blue.bold('🛡️ RinaWarp Security Monitor'));
console.log(chalk.gray('Real-time monitoring of security events and threats\n'));

console.log(chalk.yellow('📋 Monitor Commands:'));
console.log(chalk.gray('  node monitor-security.js    - Start real-time monitoring'));
console.log(chalk.gray('  railway logs                - View raw Railway logs'));
console.log(chalk.gray('  railway status              - Check service status'));
console.log(chalk.gray('  Ctrl+C                      - Stop monitoring\n'));

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRailwayStatus();
}

export default SecurityMonitor;

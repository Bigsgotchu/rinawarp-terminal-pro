#!/usr/bin/env node
/**
 * RinaWarp Terminal Security Monitoring Dashboard
 * Real-time monitoring of security events and threat detection
 */

import logger from './utils/logger.js';
import { spawn } from 'child_process';
import chalk from 'chalk';

class SecurityMonitor {
  constructor() {
    this.isMonitoring = false;
    this.threatCounts = {
      blocked: 0,
      warnings: 0,
      critical: 0,
    };
    this.startTime = new Date();
  }

  async startMonitoring() {
    logger.info(chalk.blue.bold('🛡️ RinaWarp Security Monitor Started'));
    logger.info(chalk.gray(`Started at: ${this.startTime.toISOString()}`));
    logger.info(chalk.gray('Connecting to Railway logs...\n'));

    this.isMonitoring = true;
    this.displayHeader();

    try {
      // Start Railway logs monitoring
      const railwayLogs = spawn('railway', ['logs', '--follow'], {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      railwayLogs.stdout.on('data', data => {
        this.processLogLine(data.toString());
      });

      railwayLogs.stderr.on('data', data => {
        logger.error(chalk.red(`Railway error: ${data}`));
      });

      railwayLogs.on('close', code => {
        logger.info(chalk.yellow(`Railway logs process exited with code ${code}`));
        this.isMonitoring = false;
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info(chalk.yellow('\n🔄 Shutting down security monitor...'));
        railwayLogs.kill();
        this.displaySummary();
        process.exit(0);
      });
    } catch (error) {
      logger.error(chalk.red(`Failed to start monitoring: ${error.message}`));
      logger.info(chalk.yellow('Make sure Railway CLI is installed and authenticated'));
    }
  }

  displayHeader() {
    logger.info(chalk.cyan('┌─────────────────────────────────────────────────────────────┐'));
    logger.info(chalk.cyan('│                 🔒 SECURITY EVENTS MONITOR                 │'));
    logger.info(chalk.cyan('├─────────────────────────────────────────────────────────────┤'));
    logger.info(chalk.cyan('│ Legend:                                                     │'));
    logger.info(chalk.cyan('│ 🚫 Blocked IP     ⚠️  Threat Warning    🔥 Critical Alert   │'));
    logger.info(chalk.cyan('│ 🛡️  Defense Active 📊 Analytics        🎯 Admin Access      │'));
    logger.info(chalk.cyan('└─────────────────────────────────────────────────────────────┘\n'));
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
        logger.info(chalk.red(`[${timestamp}] 🚫 BLOCKED: ${ip} → ${method} ${url}`));
        logger.info(chalk.red(`                   Reason: ${reason}\n`));
      }
    } else if (cleanLine.includes('⚠️ Threat detected')) {
      this.threatCounts.warnings++;
      logger.info(chalk.yellow(`[${timestamp}] ⚠️  THREAT: ${cleanLine}\n`));
    } else if (cleanLine.includes('🔥 CRITICAL THREAT')) {
      this.threatCounts.critical++;
      logger.info(chalk.red.bold(`[${timestamp}] 🔥 CRITICAL: ${cleanLine}\n`));
    } else if (cleanLine.includes('🛡️ Advanced Threat Detection')) {
      logger.info(chalk.green(`[${timestamp}] 🛡️  System initialized successfully\n`));
    } else if (cleanLine.includes('JWT token generated')) {
      logger.info(chalk.blue(`[${timestamp}] 🎯 Admin token generated\n`));
    } else if (cleanLine.includes('🚀 RinaWarp Terminal server running')) {
      logger.info(chalk.green(`[${timestamp}] 🚀 Server started and ready\n`));
    } else if (cleanLine.includes('GET /admin') || cleanLine.includes('POST /admin')) {
      logger.info(chalk.cyan(`[${timestamp}] 🎯 Admin access attempt: ${cleanLine}\n`));
    } else if (cleanLine.includes('Server Error')) {
      logger.info(chalk.red(`[${timestamp}] 💥 Server Error: ${cleanLine}\n`));
    } else if (cleanLine.includes('📊') || cleanLine.includes('Analytics')) {
      logger.info(chalk.magenta(`[${timestamp}] 📊 Analytics: ${cleanLine}\n`));
    }

    // Show periodic stats
    if (this.threatCounts.blocked + this.threatCounts.warnings + this.threatCounts.critical > 0) {
      if (
        (this.threatCounts.blocked + this.threatCounts.warnings + this.threatCounts.critical) %
          10 ===
        0
      ) {
        this.displayStats();
      }
    }
  }

  displayStats() {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    logger.info(chalk.cyan('┌─────────────────────────────────────────┐'));
    logger.info(chalk.cyan('│            📊 SECURITY STATS            │'));
    logger.info(chalk.cyan('├─────────────────────────────────────────┤'));
    logger.info(chalk.cyan(`│ Uptime: ${uptime}s                        │`));
    logger.info(
      chalk.cyan(
        `│ Blocked IPs: ${this.threatCounts.blocked.toString().padStart(3)}                    │`
      )
    );
    logger.info(
      chalk.cyan(
        `│ Threat Warnings: ${this.threatCounts.warnings.toString().padStart(3)}               │`
      )
    );
    logger.info(
      chalk.cyan(
        `│ Critical Alerts: ${this.threatCounts.critical.toString().padStart(3)}               │`
      )
    );
    logger.info(chalk.cyan('└─────────────────────────────────────────┘\n'));
  }

  displaySummary() {
    const duration = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    logger.info(chalk.blue('\n📋 Monitoring Session Summary:'));
    logger.info(chalk.gray(`Duration: ${duration} seconds`));
    logger.info(chalk.gray(`Blocked IPs: ${this.threatCounts.blocked}`));
    logger.info(chalk.gray(`Warnings: ${this.threatCounts.warnings}`));
    logger.info(chalk.gray(`Critical Alerts: ${this.threatCounts.critical}`));
    logger.info(chalk.blue('Security monitoring stopped.\n'));
  }
}

// Quick Railway status check
async function checkRailwayStatus() {
  logger.info(chalk.blue('🔍 Checking Railway connection...'));

  try {
    const statusProcess = spawn('railway', ['status'], { stdio: 'pipe' });

    statusProcess.stdout.on('data', data => {
      logger.info(chalk.green('✅ Railway connection verified'));
      logger.info(chalk.gray(data.toString().trim()));
    });

    statusProcess.on('close', code => {
      if (code === 0) {
        logger.info(chalk.green('🚀 Starting security monitor...\n'));
        const monitor = new SecurityMonitor();
        monitor.startMonitoring();
      } else {
        logger.info(chalk.red('❌ Railway CLI not authenticated or available'));
        logger.info(chalk.yellow('Please run: railway login'));
      }
    });
  } catch (error) {
    logger.info(chalk.red('❌ Railway CLI not found'));
    logger.info(chalk.yellow('Please install: npm install -g @railway/cli'));
  }
}

// Usage instructions
logger.info(chalk.blue.bold('🛡️ RinaWarp Security Monitor'));
logger.info(chalk.gray('Real-time monitoring of security events and threats\n'));

logger.info(chalk.yellow('📋 Monitor Commands:'));
logger.info(chalk.gray('  node monitor-security.js    - Start real-time monitoring'));
logger.info(chalk.gray('  railway logs                - View raw Railway logs'));
logger.info(chalk.gray('  railway status              - Check service status'));
logger.info(chalk.gray('  Ctrl+C                      - Stop monitoring\n'));

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRailwayStatus();
}

export default SecurityMonitor;

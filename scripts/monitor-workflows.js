#!/usr/bin/env node

/**
 * RinaWarp Terminal - Workflow Status Monitor
 * Monitors GitHub Actions workflow status and provides consolidated reporting
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

const WORKFLOWS = [
  'Build and Release',
  '🧜‍♀️ RinaWarp Terminal CI/CD',
  '🧜‍♀️ RinaWarp Terminal CI',
  '🔍 Verify Workflow Fix',
  'Simple Test',
  'Debug Test',
];

function getWorkflowStatus() {
  try {
    const output = execSync(
      'gh run list --limit 20 --json status,name,conclusion,event,createdAt',
      { encoding: 'utf8' }
    );
    return JSON.parse(output);
  } catch (error) {
    console.error('Error fetching workflow status:', error.message);
    return [];
  }
}

function formatStatus(status, conclusion) {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return chalk.green('✅ SUCCESS');
      case 'failure':
        return chalk.red('❌ FAILED');
      case 'cancelled':
        return chalk.yellow('⚠️ CANCELLED');
      default:
        return chalk.gray(`✓ ${conclusion}`);
    }
  } else {
    return chalk.blue('🔄 RUNNING');
  }
}

function main() {
  console.log(chalk.bold.cyan('\n🧜‍♀️ RinaWarp Terminal - Workflow Status Monitor\n'));

  const runs = getWorkflowStatus();
  const workflowStatus = new Map();

  // Group latest runs by workflow
  runs.forEach(run => {
    if (!workflowStatus.has(run.name)) {
      workflowStatus.set(run.name, run);
    }
  });

  // Display status for each tracked workflow
  console.log(chalk.bold('📊 Current Workflow Status:\n'));

  WORKFLOWS.forEach(workflowName => {
    const run = workflowStatus.get(workflowName);
    if (run) {
      const status = formatStatus(run.status, run.conclusion);
      const time = new Date(run.createdAt).toLocaleString();
      console.log(`${status} ${chalk.bold(workflowName)}`);
      console.log(`   📅 ${time} | 🔗 Event: ${run.event}\n`);
    } else {
      console.log(`${chalk.gray('❓ NO DATA')} ${chalk.bold(workflowName)}\n`);
    }
  });

  // Summary
  const runningCount = Array.from(workflowStatus.values()).filter(
    r => r.status === 'in_progress'
  ).length;
  const successCount = Array.from(workflowStatus.values()).filter(
    r => r.conclusion === 'success'
  ).length;
  const failedCount = Array.from(workflowStatus.values()).filter(
    r => r.conclusion === 'failure'
  ).length;

  console.log(chalk.bold('\n📈 Summary:'));
  console.log(
    `🔄 Running: ${runningCount} | ✅ Success: ${successCount} | ❌ Failed: ${failedCount}`
  );

  if (failedCount === 0 && runningCount === 0) {
    console.log(chalk.green.bold('\n🎉 All workflows are successful! 🌊\n'));
  } else if (runningCount > 0) {
    console.log(chalk.blue.bold('\n⏳ Workflows are still running... Check back soon! 🔄\n'));
  } else if (failedCount > 0) {
    console.log(chalk.red.bold('\n🚨 Some workflows have failed. Check the logs above. 💔\n'));
  }
}

main();

/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * 🌊 RinaWarp Workflow Monitor
 * Monitors GitHub Actions performance and provides insights
 */

const { execSync: _execSync } = require('child_process');
const fs = require('node:fs');
const path = require('node:path');

class WorkflowMonitor {
  constructor() {
    this.repo = 'Bigsgotchu/rinawarp-terminal';
    this.baseUrl = `https://api.github.com/repos/${this.repo}`;
  }

  async fetchWorkflowRuns() {
    try {
      const headers = {};

      // Add GitHub token if available
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(`${this.baseUrl}/actions/runs?per_page=50`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('⚠️  GitHub API authentication required for detailed workflow data');
          console.log('💡 Set GITHUB_TOKEN environment variable for full access');
          console.log('📋 You can still check workflows manually at:');
          console.log(`   https://github.com/${this.repo}/actions`);
          return [];
        }
        throw new Error(new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      const data = await response.json();
      return data.workflow_runs || [];
    } catch (error) {
      console.error('❌ Error fetching workflow runs:', error.message);
      console.log('🔗 Check workflows manually at:');
      console.log(`   https://github.com/${this.repo}/actions`);
      return [];
    }
  }

  analyzePerformance(runs) {
    const analysis = {
      total: runs.length,
      successful: 0,
      failed: 0,
      cancelled: 0,
      in_progress: 0,
      workflows: {},
      averageRunTime: 0,
      failureRate: 0,
    };

    let totalRunTime = 0;
    let completedRuns = 0;

    runs.forEach(run => {
      // Count by conclusion
      if (run.conclusion === 'success') analysis.successful++;
      else if (run.conclusion === 'failure') analysis.failed++;
      else if (run.conclusion === 'cancelled') analysis.cancelled++;
      else if (run.status === 'in_progress') analysis.in_progress++;

      // Track by workflow
      const workflowName = run.name;
      if (!analysis.workflows[workflowName]) {
        analysis.workflows[workflowName] = {
          total: 0,
          successful: 0,
          failed: 0,
          failureRate: 0,
        };
      }
      analysis.workflows[workflowName].total++;
      if (run.conclusion === 'success') analysis.workflows[workflowName].successful++;
      if (run.conclusion === 'failure') analysis.workflows[workflowName].failed++;

      // Calculate run time
      if (run.run_started_at && run.updated_at) {
        const startTime = new Date(run.run_started_at);
        const endTime = new Date(run.updated_at);
        const runTime = (endTime - startTime) / 1000; // seconds
        totalRunTime += runTime;
        completedRuns++;
      }
    });

    // Calculate failure rates
    const completedTotal = analysis.successful + analysis.failed + analysis.cancelled;
    analysis.failureRate =
      completedTotal > 0 ? ((analysis.failed / completedTotal) * 100).toFixed(1) : 0;

    analysis.averageRunTime = completedRuns > 0 ? Math.round(totalRunTime / completedRuns) : 0;

    // Calculate per-workflow failure rates
    Object.keys(analysis.workflows).forEach(workflow => {
      const w = analysis.workflows[workflow];
      const wCompleted = w.successful + w.failed;
      w.failureRate = wCompleted > 0 ? ((w.failed / wCompleted) * 100).toFixed(1) : 0;
    });

    return analysis;
  }

  generateReport(analysis) {
    const report = `
🌊 RinaWarp Terminal - Workflow Performance Report
Generated: ${new Date().toISOString()}

📊 OVERALL PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Runs: ${analysis.total}
• Success Rate: ${(100 - analysis.failureRate).toFixed(1)}%
• Failure Rate: ${analysis.failureRate}%
• Average Run Time: ${analysis.averageRunTime}s
• Status: ${analysis.successful} ✅ | ${analysis.failed} ❌ | ${analysis.cancelled} ⏹️ | ${analysis.in_progress} 🔄

🔍 WORKFLOW BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.keys(analysis.workflows)
    .sort((a, b) => analysis.workflows[b].failureRate - analysis.workflows[a].failureRate)
    .map(name => {
      const w = analysis.workflows[name];
      const statusIcon = w.failureRate > 50 ? '🔴' : w.failureRate > 20 ? '🟡' : '🟢';
      return `${statusIcon} ${name.padEnd(35)} | ${w.failureRate}% failure | ${w.total} runs`;
    })
    .join('\n')}

🎯 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analysis.failureRate > 50 ? '🚨 CRITICAL: High failure rate detected!' : ''}
${analysis.failureRate > 20 ? '⚠️  WARNING: Moderate failure rate' : ''}
${analysis.failureRate < 20 ? '✅ GOOD: Low failure rate' : ''}

• Monitor workflows with >50% failure rate
• Check for missing secrets in deployment workflows
• Review dependency conflicts in build workflows
• Consider workflow optimization for long-running jobs

📈 TREND ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recent improvements should show:
• Reduced CodeQL failures (updated to v3 actions)
• Better dependency handling (--legacy-peer-deps)
• Improved linting resilience (non-blocking)
• Enhanced build performance
`;

    return report;
  }

  async run() {
    console.log('🔍 Fetching workflow data...');
    const runs = await this.fetchWorkflowRuns();

    if (runs.length === 0) {
      console.log('❌ No workflow runs found');
      return;
    }

    console.log('📊 Analyzing performance...');
    const analysis = this.analyzePerformance(runs);

    console.log('📋 Generating report...');
    const report = this.generateReport(analysis);

    console.log(report);

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'workflow-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);

    // Quick status check
    if (analysis.failureRate > 50) {
      console.log('🚨 HIGH FAILURE RATE DETECTED - Immediate action required!');
      process.exit(1);
    } else if (analysis.failureRate > 20) {
      console.log('⚠️  Moderate failure rate - Consider investigating');
      process.exit(1);
    } else {
      console.log('✅ Workflow performance is healthy');
      process.exit(0);
    }
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new WorkflowMonitor();
  monitor.run().catch(console.error);
}

module.exports = WorkflowMonitor;

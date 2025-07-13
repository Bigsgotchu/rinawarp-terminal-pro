#!/usr/bin/env node

/**
 * 🌊 RinaWarp Live Workflow Monitor
 * Real-time tracking of workflow improvements
 */

const { execSync } = require('child_process');

class LiveMonitor {
  constructor() {
    this.repo = 'Bigsgotchu/rinawarp-terminal';
    this.baseUrl = `https://api.github.com/repos/${this.repo}`;
    this.targetWorkflows = [
      '🧪 Minimal Test',
      '🔍 Validate Environment',
      'Lint',
      '🔬 RinaWarp Core Checks',
      'CodeQL Security Analysis',
    ];
  }

  async fetchLatestRuns() {
    try {
      const headers = {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      };

      const response = await fetch(`${this.baseUrl}/actions/runs?per_page=20`, { headers });
      const data = await response.json();

      return data.workflow_runs || [];
    } catch (error) {
      console.error('❌ Error fetching runs:', error.message);
      return [];
    }
  }

  async fetchWorkflowDetails(runId) {
    try {
      const headers = {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      };

      const response = await fetch(`${this.baseUrl}/actions/runs/${runId}`, { headers });
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching workflow details:', error.message);
      return null;
    }
  }

  formatRunStatus(run) {
    const status = run.status;
    const conclusion = run.conclusion;

    if (status === 'in_progress') return '🔄 In Progress';
    if (status === 'queued') return '⏳ Queued';
    if (conclusion === 'success') return '✅ Success';
    if (conclusion === 'failure') return '❌ Failed';
    if (conclusion === 'cancelled') return '⏹️ Cancelled';
    return '❓ Unknown';
  }

  async monitorRecentRuns() {
    console.log('🔍 Fetching latest workflow runs...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const runs = await this.fetchLatestRuns();

    if (runs.length === 0) {
      console.log('❌ No workflow runs found');
      return;
    }

    // Filter recent runs (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentRuns = runs.filter(run => new Date(run.created_at) > twoHoursAgo);

    console.log(`📊 Found ${recentRuns.length} recent runs (last 2 hours)`);
    console.log();

    // Group by workflow name
    const workflowGroups = {};
    recentRuns.forEach(run => {
      const name = run.name;
      if (!workflowGroups[name]) {
        workflowGroups[name] = [];
      }
      workflowGroups[name].push(run);
    });

    // Display results
    for (const [workflowName, workflowRuns] of Object.entries(workflowGroups)) {
      const latestRun = workflowRuns[0]; // Most recent
      const status = this.formatRunStatus(latestRun);
      const duration = latestRun.run_started_at
        ? Math.round((new Date(latestRun.updated_at) - new Date(latestRun.run_started_at)) / 1000) +
          's'
        : 'N/A';

      console.log(`${status} ${workflowName}`);
      console.log(`   📅 Started: ${new Date(latestRun.created_at).toLocaleString()}`);
      console.log(`   ⏱️ Duration: ${duration}`);
      console.log(`   🔗 URL: https://github.com/${this.repo}/actions/runs/${latestRun.id}`);

      // Show commit info
      console.log(
        `   📝 Commit: ${latestRun.head_commit?.message?.split('\\n')[0] || 'No message'}`
      );
      console.log();
    }

    // Check for improvements
    const successfulRuns = recentRuns.filter(run => run.conclusion === 'success');
    const failedRuns = recentRuns.filter(run => run.conclusion === 'failure');
    const inProgressRuns = recentRuns.filter(run => run.status === 'in_progress');

    console.log('📈 IMPROVEMENT ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successful runs: ${successfulRuns.length}`);
    console.log(`❌ Failed runs: ${failedRuns.length}`);
    console.log(`🔄 In progress: ${inProgressRuns.length}`);

    if (successfulRuns.length > 0) {
      console.log();
      console.log('🎉 SUCCESS STORIES:');
      successfulRuns.forEach(run => {
        console.log(`   ✅ ${run.name} - ${this.formatRunStatus(run)}`);
      });
    }

    if (failedRuns.length > 0) {
      console.log();
      console.log('🔧 NEEDS ATTENTION:');
      failedRuns.slice(0, 5).forEach(run => {
        console.log(
          `   ❌ ${run.name} - Check logs: https://github.com/${this.repo}/actions/runs/${run.id}`
        );
      });
    }

    if (inProgressRuns.length > 0) {
      console.log();
      console.log('⏳ CURRENTLY RUNNING:');
      inProgressRuns.forEach(run => {
        console.log(`   🔄 ${run.name} - Started ${new Date(run.created_at).toLocaleString()}`);
      });
    }

    // Success rate calculation
    const completedRuns = successfulRuns.length + failedRuns.length;
    if (completedRuns > 0) {
      const successRate = ((successfulRuns.length / completedRuns) * 100).toFixed(1);
      console.log();
      console.log(
        `📊 Recent Success Rate: ${successRate}% (${successfulRuns.length}/${completedRuns})`
      );

      if (successRate > 0) {
        console.log('🎯 IMPROVEMENT DETECTED! 🎉');
      }
    }
  }

  async run() {
    console.log('🌊 RinaWarp Live Workflow Monitor');
    console.log('⏰ Monitoring recent workflow runs...');
    console.log();

    await this.monitorRecentRuns();

    console.log();
    console.log('🔄 Run this script again to see updates:');
    console.log('   npm run monitor:live');
    console.log();
    console.log('🔗 Watch live: https://github.com/Bigsgotchu/rinawarp-terminal/actions');
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new LiveMonitor();
  monitor.run().catch(console.error);
}

module.exports = LiveMonitor;

/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const { execSync } = require('child_process');
const fs = require('node:fs');

console.log('🔍 GitHub Actions Debug Analysis');
console.log('================================');

// Check repository info
try {
  const repoInfo = execSync('gh repo view --json owner,name,visibility,permissions', {
    encoding: 'utf8',
  });
  const repo = JSON.parse(repoInfo);
  console.log('📁 Repository:', repo.owner.login + '/' + repo.name);
  console.log('👁️  Visibility:', repo.visibility);
  console.log('🔐 Permissions:', repo.permissions);
} catch (e) {
  console.error('❌ Failed to get repo info:', e.message);
}

// Check actions permissions
try {
  const actionsInfo = execSync(
    'gh api repos/$(gh repo view --json owner,name -q \'.owner.login + "/" + .name\')/actions/permissions',
    { encoding: 'utf8' }
  );
  const actions = JSON.parse(actionsInfo);
  console.log('⚙️  Actions enabled:', actions.enabled);
  console.log('📋 Allowed actions:', actions.allowed_actions);
} catch (e) {
  console.error('❌ Failed to get actions info:', e.message);
}

// List workflow files
console.log('\n📄 Workflow Files:');
const workflowDir = '.github/workflows';
if (fs.existsSync(workflowDir)) {
  const files = fs.readdirSync(workflowDir);
  files.forEach(file => {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      console.log(`  - ${file}`);
    }
  });
} else {
  console.log('  No workflows directory found');
}

// Check recent runs
try {
  const runs = execSync('gh run list --limit 5 --json status,name,event,conclusion,workflowName', {
    encoding: 'utf8',
  });
  const runData = JSON.parse(runs);
  console.log('\n🏃 Recent Workflow Runs:');
  runData.forEach((run, i) => {
    console.log(
      `  ${i + 1}. ${run.name || run.workflowName || 'Unknown'} (${run.event}) - ${run.status} ${run.conclusion || ''}`
    );
  });
} catch (e) {
  console.error('❌ Failed to get runs:', e.message);
}

console.log('\n💡 Recommendations:');
console.log('1. Check if repository has Actions enabled');
console.log('2. Verify workflow YAML syntax');
console.log('3. Check branch name matches workflow triggers');
console.log('4. Look for organization-level restrictions');
console.log('5. Verify repository permissions allow workflow execution');

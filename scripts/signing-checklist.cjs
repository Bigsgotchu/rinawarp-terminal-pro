/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const checklistFile = path.join(__dirname, '..', '.signing-progress.json');

// Load or create checklist
let checklist = {
  macOS: {
    'Apple Developer Account': false,
    'Developer ID Certificate': false,
    'Certificate exported as .p12': false,
    'Team ID obtained': false,
    'App-specific password created': false,
    'macOS values in .env.local': false,
  },
  windows: {
    'Code signing certificate purchased': false,
    'Certificate validated': false,
    'Certificate exported as .pfx': false,
    'Windows values in .env.local': false,
  },
  github: {
    'GitHub personal access token created': false,
    'Token added to .env.local': false,
  },
  testing: {
    'Test build created': false,
    'Signature verified': false,
  },
};

if (fs.existsSync(checklistFile)) {
  checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf8'));
}

function saveChecklist() {
  fs.writeFileSync(checklistFile, JSON.stringify(checklist, null, 2));
}

function displayChecklist() {
  console.clear();
  console.log('🔐 Code Signing Setup Checklist\n');

  let totalTasks = 0;
  let completedTasks = 0;

  for (const [category, tasks] of Object.entries(checklist)) {
    console.log(`\n${category.toUpperCase()}:`);
    for (const [task, completed] of Object.entries(tasks)) {
      totalTasks++;
      if (completed) completedTasks++;
      console.log(`  ${completed ? '✅' : '⬜'} ${task}`);
    }
  }

  const progress = Math.round((completedTasks / totalTasks) * 100);
  console.log(`\n📊 Progress: ${completedTasks}/${totalTasks} (${progress}%)`);
  console.log('─'.repeat(50));
}

function toggleTask(category, task) {
  if (checklist[category] && checklist[category][task] !== undefined) {
    checklist[category][task] = !checklist[category][task];
    saveChecklist();
  }
}

async function selectTask() {
  console.log('\nSelect a task to toggle (or type "check" to check .env.local, "exit" to quit):');

  const tasks = [];
  let index = 1;

  for (const [category, categoryTasks] of Object.entries(checklist)) {
    for (const task of Object.keys(categoryTasks)) {
      tasks.push({ category, task });
      console.log(`${index}. ${task} (${category})`);
      index++;
    }
  }

  return new Promise(resolve => {
    rl.question('\nYour choice: ', answer => {
      if (answer.toLowerCase() === 'exit') {
        resolve('exit');
      } else if (answer.toLowerCase() === 'check') {
        resolve('check');
      } else {
        const choice = parseInt(answer) - 1;
        if (choice >= 0 && choice < tasks.length) {
          resolve(tasks[choice]);
        } else {
          resolve(null);
        }
      }
    });
  });
}

async function checkEnvFile() {
  const envLocalPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envLocalPath)) {
    console.log('\n❌ .env.local file not found!');
    return;
  }

  const content = fs.readFileSync(envLocalPath, 'utf8');
  const lines = content.split('\n');

  const requiredVars = {
    CSC_LINK: 'macOS certificate path',
    CSC_KEY_PASSWORD: 'macOS certificate password',
    APPLE_ID: 'Apple ID email',
    APPLE_ID_PASSWORD: 'App-specific password',
    APPLE_TEAM_ID: 'Apple Team ID',
    WIN_CSC_LINK: 'Windows certificate path',
    WIN_CSC_KEY_PASSWORD: 'Windows certificate password',
    GH_TOKEN: 'GitHub token',
  };

  console.log('\n📋 Checking .env.local configuration:\n');

  for (const [varName, description] of Object.entries(requiredVars)) {
    const hasVar = lines.some(line => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith(varName + '=') &&
        !trimmed.includes('path/to/your') &&
        !trimmed.includes('your_') &&
        !trimmed.includes('YOUR_')
      );
    });

    console.log(`  ${hasVar ? '✅' : '❌'} ${varName} (${description})`);
  }
}

async function main() {
  while (true) {
    displayChecklist();
    const choice = await selectTask();

    if (choice === 'exit') {
      console.log('\n👋 Goodbye! Your progress has been saved.');
      rl.close();
      break;
    } else if (choice === 'check') {
      await checkEnvFile();
      console.log('\nPress Enter to continue...');
      await new Promise(resolve => rl.question('', resolve));
    } else if (choice) {
      toggleTask(choice.category, choice.task);
    }
  }
}

console.log('Welcome to the Code Signing Setup Checklist!');
console.log('This will help you track your progress.\n');

main();

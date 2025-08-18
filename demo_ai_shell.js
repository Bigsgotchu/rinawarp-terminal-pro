#!/usr/bin/env node

/**
 * Quick demo of the AI Testing Shell features
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

console.log('🎭 RinaWarp AI Testing Shell Demo');
console.log('='.repeat(50));

console.log('🚀 Starting the AI testing shell and running demo commands...\n');

// Create a temporary script with demo commands
const demoScript = `help
examples
status
exit
`;

const tempFile = '/tmp/ai_demo_commands.txt';
writeFileSync(tempFile, demoScript);

// Run the shell with the demo commands
const child = spawn('node', ['/Users/kgilley/rinawarp-terminal/ai_testing_shell.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Send commands from our script
const commands = demoScript.split('\n').filter(cmd => cmd.trim());
let commandIndex = 0;

child.stdout.on('data', data => {
  process.stdout.write(data);

  // Send next command when we see the prompt
  if (data.toString().includes('🤖 rina>') && commandIndex < commands.length) {
    setTimeout(() => {
      if (commandIndex < commands.length) {
        const cmd = commands[commandIndex++];
        if (cmd) {
          console.log(`\nRunning: ${cmd}\n`);
          child.stdin.write(cmd + '\n');
        }
      }
    }, 1000);
  }
});

child.stderr.on('data', data => {
  process.stderr.write(data);
});

child.on('close', code => {
  console.log(`\n✨ Demo completed with exit code: ${code}`);
  try {
    unlinkSync(tempFile);
  } catch (_e) {}

  console.log('\n🎯 Ready to use your AI Assistant!');
  console.log('Run: node ai_testing_shell.js');
  console.log('\nTry these commands:');
  console.log('• explain React hooks');
  console.log('• generate a Node.js express server');
  console.log('• create task: build user authentication');
  console.log('• analyze project performance');
});

// Send the first command after initialization
setTimeout(() => {
  if (commandIndex < commands.length) {
    const cmd = commands[commandIndex++];
    if (cmd) {
      console.log(`\nRunning: ${cmd}\n`);
      child.stdin.write(cmd + '\n');
    }
  }
}, 3000);

#!/usr/bin/env node

/**
 * RinaWarp Terminal - Enhanced Voice Control Demonstration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This script demonstrates the enhanced voice control features including:
 * - Terminal control pattern mappings
 * - Mood-aware command suggestions
 * - Voice feedback confirmation
 * - Terminal integration hooks
 * - Enhanced speech synthesis
 */

const kleur = require('kleur');

// Mock browser APIs for Node.js demonstration
global.window = {
  SpeechRecognition: class MockSpeechRecognition {
    constructor() {
      this.continuous = true;
      this.interimResults = true;
      this.maxAlternatives = 3;
      this.lang = 'en-US';
    }
    start() {
      console.log('🎤 Mock speech recognition started');
    }
    stop() {
      console.log('🔇 Mock speech recognition stopped');
    }
  },
  speechSynthesis: {
    speak: utterance => console.log(`🔊 Speaking: "${utterance.text}"`),
    cancel: () => console.log('🔇 Speech cancelled'),
    getVoices: () => [
      { name: 'Alex (English)', lang: 'en-US' },
      { name: 'Samantha (English)', lang: 'en-US' },
    ],
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
  dispatchEvent: () => {},
  addEventListener: () => {},
};

global.SpeechSynthesisUtterance = class {
  constructor(text) {
    this.text = text;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.lang = 'en-US';
    this.voice = null;
  }
};

// Mock terminal and shell manager
class MockTerminal {
  write(data) {
    console.log(kleur.green(`🖥️  Terminal Output: ${data.replace('\r', '')}`));
  }
}

class MockShellManager {
  async runCommand(command) {
    console.log(kleur.blue(`⚡ Shell Manager executing: ${command}`));
    return { success: true, output: `Executed: ${command}` };
  }
}

async function demonstrateVoiceControl() {
  console.log(kleur.bold().cyan('\n🎤 RinaWarp Terminal - Enhanced Voice Control Demo\n'));

  try {
    // Import the enhanced voice engine (using dynamic import for ES module)
    const { EnhancedVoiceEngine } = await import(
      './src/voice-enhancements/enhanced-voice-engine.js'
    );

    // Initialize the voice engine
    console.log(kleur.yellow('Initializing Enhanced Voice Engine...'));
    const voiceEngine = new EnhancedVoiceEngine();

    // Setup terminal integration
    const mockTerminal = new MockTerminal();
    const mockShellManager = new MockShellManager();
    voiceEngine.setTerminalIntegration(mockTerminal, mockShellManager);

    // Set voice for synthesis
    voiceEngine.setVoice('Alex');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(kleur.bold().green('\n✅ Voice Engine Initialized Successfully!\n'));

    // Demonstrate features
    await demonstrateFeatures(voiceEngine);
  } catch (error) {
    console.error(kleur.red('Failed to initialize voice engine:'), error.message);
  }
}

async function demonstrateFeatures(voiceEngine) {
  const demos = [
    {
      name: 'Terminal Control Pattern Mappings',
      description:
        'Complete control patterns with handlers for clear, reboot, history, and diagnostics',
      action: () => {
        console.log(kleur.magenta('\n🔧 Testing Control Patterns:'));

        // Test control patterns
        const patterns = [
          'clear screen',
          'show last command',
          'command history',
          'diagnostic check',
        ];

        patterns.forEach(pattern => {
          const result = voiceEngine.checkControlPatterns(pattern.toLowerCase());
          if (result) {
            console.log(`  ${kleur.green('✓')} "${pattern}" → ${kleur.cyan(result)}`);
          } else {
            console.log(`  ${kleur.yellow('○')} "${pattern}" → No pattern match`);
          }
        });
      },
    },

    {
      name: 'Mood-Aware Command Suggestions',
      description: 'Context-aware suggestions based on user mood detection',
      action: () => {
        console.log(kleur.magenta('\n🧠 Testing Mood Detection:'));

        const testCases = [
          { transcript: 'help me please', confidence: 0.4, retryCount: 0 },
          { transcript: 'what do i do', confidence: 0.3, retryCount: 3 },
          { transcript: 'list files', confidence: 0.95, retryCount: 0 },
          { transcript: 'unknown command', confidence: 0.2, retryCount: 1 },
        ];

        testCases.forEach(testCase => {
          const mood = voiceEngine.detectMood(
            testCase.transcript,
            testCase.confidence,
            testCase.retryCount
          );
          const suggestions = voiceEngine.provideMoodAwareSuggestions(mood);

          console.log(`  Input: "${testCase.transcript}" (confidence: ${testCase.confidence})`);
          console.log(
            `  ${kleur.blue('Mood:')} ${mood} ${kleur.gray('→')} Suggestions: [${suggestions.join(', ')}]`
          );
        });
      },
    },

    {
      name: 'Voice Feedback Confirmation',
      description: 'Enhanced speech synthesis with command confirmation',
      action: async () => {
        console.log(kleur.magenta('\n🔊 Testing Voice Feedback:'));

        const commands = ['ls -la', 'git status', 'npm start', 'clear'];

        for (const command of commands) {
          console.log(`  Executing command: ${kleur.cyan(command)}`);
          await voiceEngine.executeCommand(command);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      },
    },

    {
      name: 'Terminal Integration Hooks',
      description: 'Direct terminal and shell manager integration',
      action: () => {
        console.log(kleur.magenta('\n🖥️ Testing Terminal Integration:'));

        const status = voiceEngine.getStatus();
        console.log(
          `  Terminal Integration: ${status.hasTerminalIntegration ? kleur.green('✓ Active') : kleur.red('✗ Inactive')}`
        );
        console.log(
          `  Shell Manager: ${status.hasShellManager ? kleur.green('✓ Active') : kleur.red('✗ Inactive')}`
        );
        console.log(
          `  Last Command: ${status.lastCommand ? kleur.cyan(status.lastCommand) : kleur.gray('None')}`
        );
        console.log(`  Mood State: ${kleur.blue(status.moodState)}`);
        console.log(`  Custom Commands: ${kleur.yellow(status.customCommandsCount)}`);
      },
    },

    {
      name: 'Advanced Command Recognition',
      description: 'Fuzzy matching, context awareness, and partial matches',
      action: async () => {
        console.log(kleur.magenta('\n🎯 Testing Command Recognition:'));

        const testCommands = [
          'list all files', // Should match 'ls -la'
          'check git stat', // Should fuzzy match 'git status'
          'install packages', // Should match 'npm install'
          'show current dir', // Should match 'pwd'
        ];

        for (const testCmd of testCommands) {
          const command = await voiceEngine.processVoiceCommand(testCmd, 0.8);
          if (command) {
            console.log(`  "${testCmd}" ${kleur.green('→')} ${kleur.cyan(command)}`);
          } else {
            console.log(`  "${testCmd}" ${kleur.red('→')} ${kleur.gray('No match found')}`);
          }
        }
      },
    },

    {
      name: 'Error Handling & Recovery',
      description: 'Graceful error handling with helpful suggestions',
      action: () => {
        console.log(kleur.magenta('\n⚠️ Testing Error Handling:'));

        // Simulate unrecognized commands
        const badCommands = ['xyzabc unknown command', 'help me with this', 'what can i do here'];

        badCommands.forEach(badCmd => {
          console.log(`  Testing: "${badCmd}"`);
          voiceEngine.handleUnrecognizedCommand(badCmd);
        });
      },
    },
  ];

  // Run demonstrations
  for (let i = 0; i < demos.length; i++) {
    const demo = demos[i];

    console.log(kleur.bold().white(`\n${i + 1}. ${demo.name}`));
    console.log(kleur.gray(`   ${demo.description}\n`));

    try {
      await demo.action();
    } catch (error) {
      console.error(kleur.red(`   Error in demo: ${error.message}`));
    }

    // Pause between demos
    if (i < demos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Show final status
  console.log(kleur.bold().cyan('\n📊 Final Voice Engine Status:'));
  const finalStatus = voiceEngine.getStatus();
  Object.entries(finalStatus).forEach(([key, value]) => {
    console.log(`  ${kleur.yellow(key)}: ${kleur.white(JSON.stringify(value))}`);
  });

  console.log(kleur.bold().green('\n🎉 Voice Control Demo Completed Successfully!\n'));

  // Cleanup
  voiceEngine.destroy();
}

// Error handling
process.on('uncaughtException', error => {
  console.error(kleur.red('\n💥 Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error(kleur.red('\n💥 Unhandled Rejection:'), reason);
  process.exit(1);
});

// Run the demonstration
if (require.main === module) {
  console.log(kleur.bold().blue('Starting RinaWarp Terminal Voice Control Demo...\n'));
  demonstrateVoiceControl().catch(error => {
    console.error(kleur.red('Demo failed:'), error);
    process.exit(1);
  });
}

module.exports = { demonstrateVoiceControl };

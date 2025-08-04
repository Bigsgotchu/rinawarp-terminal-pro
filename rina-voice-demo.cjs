#!/usr/bin/env node

/**
 * RinaWarp Terminal - Rina Voice System Demo
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This script demonstrates the custom Rina voice personality system with:
 * - Audio asset management and playback
 * - Mood-aware voice responses
 * - Dashboard integration with voice mode switching
 * - Fallback to speech synthesis
 * - Glow effects integration
 */

const kleur = require('kleur');

// Mock browser APIs for Node.js demonstration
global.window = {
  AudioContext: class MockAudioContext {
    constructor() {
      this.state = 'running';
    }
    close() {
      return Promise.resolve();
    }
  },
  Audio: class MockAudio {
    constructor(src) {
      this.src = src;
      this.volume = 0.8;
      this.preload = 'none';
    }
    play() {
      console.log(kleur.cyan(`🔊 Playing audio: ${this.src}`));
      return Promise.resolve();
    }
    addEventListener(event, handler) {
      // Simulate successful audio loading
      if (event === 'canplaythrough') {
        setTimeout(() => handler(), 100);
      }
    }
  },
  speechSynthesis: {
    speak: utterance => console.log(kleur.magenta(`🎙️ Synthesis: "${utterance.text}"`)),
    cancel: () => console.log('🔇 Speech cancelled'),
    getVoices: () => [
      { name: 'Samantha (English)', lang: 'en-US' },
      { name: 'Alex (English)', lang: 'en-US' },
    ],
  },
  SpeechSynthesisUtterance: class {
    constructor(text) {
      this.text = text;
      this.rate = 1.0;
      this.pitch = 1.0;
      this.volume = 1.0;
      this.lang = 'en-US';
      this.voice = null;
    }
  },
  dispatchEvent: event => {
    console.log(kleur.gray(`📡 Event dispatched: ${event.type}`));
  },
  addEventListener: () => {},
  document: {
    createElement: () => ({ style: { cssText: '' } }),
    getElementById: () => null,
    querySelector: () => null,
    body: { appendChild: () => {} },
  },
};

// Mock DOM
global.document = global.window.document;

async function demonstrateRinaVoice() {
  console.log(kleur.bold().cyan('\n🎭 RinaWarp Terminal - Rina Voice System Demo\n'));

  try {
    // Import the Rina Voice System (using dynamic import for ES module)
    const { RinaVoiceSystem } = await import('./src/voice-enhancements/rina-voice-system.js');
    const { RinaVoiceIntegration } = await import(
      './src/voice-enhancements/rina-voice-integration.js'
    );
    const { EnhancedVoiceEngine } = await import(
      './src/voice-enhancements/enhanced-voice-engine.js'
    );

    // Initialize systems
    console.log(kleur.yellow('Initializing Rina Voice System...'));
    const rinaVoice = new RinaVoiceSystem();

    // Initialize enhanced voice engine
    const voiceEngine = new EnhancedVoiceEngine();

    // Initialize integration
    const rinaIntegration = new RinaVoiceIntegration(voiceEngine);

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(kleur.bold().green('\n✅ Rina Voice System Initialized Successfully!\n'));

    // Demonstrate features
    await demonstrateRinaFeatures(rinaVoice, rinaIntegration);
  } catch (error) {
    console.error(kleur.red('Failed to initialize Rina Voice System:'), error.message);
  }
}

async function demonstrateRinaFeatures(rinaVoice, rinaIntegration) {
  const demos = [
    {
      name: 'Voice Asset Management',
      description: 'Demonstrates audio clip organization and fallback system',
      action: async () => {
        console.log(kleur.magenta('\n🎵 Testing Voice Asset System:'));

        // Show available voice clips
        const availableClips = rinaVoice.getAvailableClips();
        console.log(kleur.cyan('📂 Available voice mappings:'));
        Object.entries(availableClips).forEach(([key, moods]) => {
          console.log(`  ${kleur.yellow(key)}: [${moods.join(', ')}]`);
        });

        // Test audio playback with fallback
        const testClips = ['bootSuccess', 'commandExecuting', 'greeting', 'thinking'];
        for (const clip of testClips) {
          console.log(`\n  Testing: ${kleur.cyan(clip)}`);
          await rinaVoice.speak(clip, { mood: 'neutral' });
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      },
    },

    {
      name: 'Mood-Aware Voice Responses',
      description: 'Demonstrates voice tone adaptation based on user mood',
      action: async () => {
        console.log(kleur.magenta('\n🧠 Testing Mood-Aware Responses:'));

        const moodTests = [
          { mood: 'confident', clip: 'commandExecuting', description: 'Confident execution' },
          { mood: 'uncertain', clip: 'thinking', description: 'Uncertain processing' },
          { mood: 'frustrated', clip: 'frustrated_help', description: 'Frustrated assistance' },
          { mood: 'professional', clip: 'greeting', description: 'Professional greeting' },
          { mood: 'warm', clip: 'greeting', description: 'Warm greeting' },
        ];

        for (const test of moodTests) {
          console.log(`\n  ${kleur.blue('Mood:')} ${test.mood} - ${test.description}`);
          rinaVoice.setMood(test.mood);
          await rinaVoice.speak(test.clip, { mood: test.mood });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
    },

    {
      name: 'Terminal Event Integration',
      description: 'Shows how Rina responds to terminal events automatically',
      action: async () => {
        console.log(kleur.magenta('\n🖥️ Testing Terminal Event Integration:'));

        const events = [
          { event: 'Boot Complete', action: () => rinaVoice.onBootComplete() },
          { event: 'Command Executing', action: () => rinaVoice.onCommandExecuting('npm start') },
          { event: 'Command Success', action: () => rinaVoice.onCommandComplete(true) },
          { event: 'Module Error', action: () => rinaVoice.onModuleError('electron') },
          { event: 'User Frustrated', action: () => rinaVoice.onUserFrustrated() },
          { event: 'User Uncertain', action: () => rinaVoice.onUserUncertain() },
        ];

        for (const eventTest of events) {
          console.log(`\n  ${kleur.green('Event:')} ${eventTest.event}`);
          await eventTest.action();
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      },
    },

    {
      name: 'Voice Mode Switching',
      description: 'Demonstrates switching between system and Rina voice modes',
      action: async () => {
        console.log(kleur.magenta('\n🎛️ Testing Voice Mode Switching:'));

        const modes = ['system', 'rina', 'hybrid'];

        for (const mode of modes) {
          console.log(`\n  Switching to: ${kleur.yellow(mode)} mode`);
          rinaIntegration.switchVoiceMode(mode);

          // Test greeting in each mode
          await new Promise(resolve => setTimeout(resolve, 500));
          if (mode === 'rina' || mode === 'hybrid') {
            await rinaVoice.speak('greeting', { mood: 'friendly' });
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
    },

    {
      name: 'Advanced Voice Synthesis Config',
      description: 'Shows mood-based synthesis parameter adjustment',
      action: () => {
        console.log(kleur.magenta('\n⚙️ Testing Synthesis Configuration:'));

        const moods = ['confident', 'uncertain', 'excited', 'calm', 'frustrated'];

        moods.forEach(mood => {
          const config = rinaVoice.getSynthesisMoodConfig(mood);
          console.log(
            `  ${kleur.blue(mood)}: rate=${config.rate}, pitch=${config.pitch}, volume=${config.volume}`
          );
        });
      },
    },

    {
      name: 'Audio Cache Management',
      description: 'Demonstrates audio caching and performance optimization',
      action: () => {
        console.log(kleur.magenta('\n💾 Testing Audio Cache System:'));

        const cacheStatus = rinaVoice.getCacheStatus();
        console.log(
          `  Cache size: ${kleur.cyan(cacheStatus.cacheSize)}/${cacheStatus.maxCacheSize}`
        );
        console.log(`  Cached clips: [${cacheStatus.cachedKeys.join(', ')}]`);

        // Clear cache demo
        console.log('\n  Clearing audio cache...');
        rinaVoice.clearCache();

        const newStatus = rinaVoice.getCacheStatus();
        console.log(`  Cache size after clear: ${kleur.cyan(newStatus.cacheSize)}`);
      },
    },

    {
      name: 'System Status & Diagnostics',
      description: 'Complete system status reporting',
      action: () => {
        console.log(kleur.magenta('\n📊 System Status Report:'));

        const rinaStatus = rinaVoice.getStatus();
        const integrationStatus = rinaIntegration.getStatus();

        console.log('\n  🎙️ Rina Voice System:');
        Object.entries(rinaStatus).forEach(([key, value]) => {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
          console.log(`    ${kleur.yellow(key)}: ${kleur.white(displayValue)}`);
        });

        console.log('\n  🎭 Integration System:');
        Object.entries(integrationStatus).forEach(([key, value]) => {
          if (key !== 'rinaVoiceStatus') {
            // Skip nested object for cleaner display
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
            console.log(`    ${kleur.yellow(key)}: ${kleur.white(displayValue)}`);
          }
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(kleur.bold().green('\n🎉 Rina Voice System Demo Completed Successfully!'));
  console.log(kleur.cyan('\n📋 Next Steps:'));
  console.log(kleur.white('  1. Record your voice using the voice-recording-script.md'));
  console.log(kleur.white('  2. Save audio files to sounds/rina/ directory'));
  console.log(kleur.white('  3. Test playback in your RinaWarp Terminal'));
  console.log(kleur.white('  4. Switch between System and Rina voice modes'));
  console.log(kleur.white('  5. Enjoy your personalized terminal experience!'));

  // Cleanup
  rinaVoice.destroy();
  rinaIntegration.destroy();
  console.log(kleur.gray('\n🧹 Demo cleanup completed'));
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
  console.log(kleur.bold().blue('Starting Rina Voice System Demo...\n'));
  demonstrateRinaVoice().catch(error => {
    console.error(kleur.red('Demo failed:'), error);
    process.exit(1);
  });
}

module.exports = { demonstrateRinaVoice };

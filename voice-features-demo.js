#!/usr/bin/env node

/**
 * RinaWarp Terminal - Voice Features Demo
 * Showcases Rina's AI voice personality and capabilities
 */

import fs from 'fs';
import path from 'path';

console.log('🎤 RinaWarp Terminal - Voice Features Demo');
console.log('='.repeat(50));

class RinaVoiceDemo {
  constructor() {
    this.soundsPath = './sounds/rina/';
    this.voiceFiles = [];
    this.personalityModes = {
      friendly: ['friendly', 'warm', 'excited'],
      professional: ['professional', 'neutral', 'confident'],
      supportive: ['supportive', 'empathetic', 'calming'],
      analytical: ['analytical', 'technical', 'processing'],
    };
    this.commandCategories = new Map();
    this.elevenlabsVoices = {
      bella: 'Warm and friendly (default)',
      antoni: 'Professional and clear',
      elli: 'Energetic and enthusiastic',
      josh: 'Calm and measured',
    };
  }

  async init() {
    console.log('\n🧠 Initializing Rina Voice System...');
    await this.discoverVoiceFiles();
    this.categorizeVoiceCommands();
    this.showCapabilities();
  }

  async discoverVoiceFiles() {
    try {
      if (fs.existsSync(this.soundsPath)) {
        this.voiceFiles = fs
          .readdirSync(this.soundsPath)
          .filter(file => file.endsWith('.wav'))
          .map(file => ({
            file,
            name: file.replace('.wav', ''),
            category: this.categorizeSound(file),
            mood: this.extractMood(file),
            path: path.join(this.soundsPath, file),
          }));

        console.log(`✅ Discovered ${this.voiceFiles.length} Rina voice files`);
      } else {
        console.log('⚠️ Voice files directory not found - using fallback mode');
        this.voiceFiles = [];
      }
    } catch (error) {
      console.error('❌ Error discovering voice files:', error.message);
    }
  }

  categorizeSound(filename) {
    const name = filename.toLowerCase();
    if (name.includes('hello') || name.includes('boot')) return '🚀 Startup';
    if (name.includes('complete') || name.includes('executing')) return '⚡ Execution';
    if (name.includes('error') || name.includes('frustrated')) return '🚨 Error Handling';
    if (name.includes('thinking') || name.includes('processing')) return '🤔 Processing';
    if (name.includes('goodbye')) return '👋 Shutdown';
    if (name.includes('suggestion') || name.includes('guidance')) return '💡 Guidance';
    if (name.includes('performance') || name.includes('system')) return '📊 System Status';
    if (name.includes('interesting')) return '🔍 Analysis';
    return '🎭 General';
  }

  extractMood(filename) {
    const name = filename.toLowerCase();
    if (name.includes('excited') || name.includes('pleased')) return '😊 Excited';
    if (name.includes('confident') || name.includes('satisfied')) return '😎 Confident';
    if (name.includes('neutral')) return '😐 Neutral';
    if (name.includes('warm') || name.includes('friendly')) return '🥰 Warm';
    if (name.includes('professional')) return '👔 Professional';
    if (name.includes('calming') || name.includes('gentle')) return '😌 Calming';
    if (name.includes('empathetic') || name.includes('supportive')) return '🤗 Supportive';
    if (name.includes('concerned') || name.includes('technical')) return '🤨 Concerned';
    if (name.includes('curious') || name.includes('intrigued')) return '🤔 Curious';
    if (name.includes('analytical')) return '🧠 Analytical';
    return '🎵 Default';
  }

  categorizeVoiceCommands() {
    // Group voice files by category
    this.voiceFiles.forEach(voice => {
      if (!this.commandCategories.has(voice.category)) {
        this.commandCategories.set(voice.category, []);
      }
      this.commandCategories.get(voice.category).push(voice);
    });
  }

  showCapabilities() {
    console.log('\n🎭 Rina Voice Personality System');
    console.log('─'.repeat(30));

    if (this.voiceFiles.length > 0) {
      console.log('📂 Available Voice Categories:');

      for (const [category, voices] of this.commandCategories.entries()) {
        console.log(`\n${category}:`);
        voices.forEach(voice => {
          console.log(`   • ${voice.name} (${voice.mood})`);
        });
      }
    }

    console.log('\n🎤 ElevenLabs Voice Integration:');
    console.log('─'.repeat(30));
    Object.entries(this.elevenlabsVoices).forEach(([voice, description]) => {
      console.log(`   🎵 ${voice}: ${description}`);
    });

    console.log('\n🗣️ Natural Language Commands:');
    console.log('─'.repeat(30));
    const naturalCommands = [
      '"Hey Rina, list files" → ls -la',
      '"Hey Rina, show processes" → ps aux',
      '"Hey Rina, git status" → git status',
      '"Hey Rina, check disk space" → df -h',
      '"Hey Rina, find JavaScript files" → find . -name "*.js"',
      '"Hey Rina, create directory projects" → mkdir projects',
      '"Hey Rina, what\'s my current location" → pwd',
    ];

    naturalCommands.forEach(cmd => {
      console.log(`   💬 ${cmd}`);
    });

    console.log('\n🧠 Voice AI Features:');
    console.log('─'.repeat(30));
    const features = [
      '🎯 Context-aware command interpretation',
      '⚠️ Risk assessment with voice warnings',
      '💡 Intelligent command suggestions',
      '🔄 Alternative command recommendations',
      '🎭 Mood-based response modulation',
      '🌊 Personality-driven interactions',
      '🔧 Customizable voice commands',
      '📚 Voice command learning system',
      '🎵 Multiple voice personality modes',
      '🗣️ Natural language processing',
    ];

    features.forEach(feature => {
      console.log(`   ${feature}`);
    });

    this.showPersonalityDemo();
    this.showVoiceSetupInstructions();
  }

  showPersonalityDemo() {
    console.log('\n🌊 Rina Personality Demo:');
    console.log('─'.repeat(30));

    const scenarios = [
      {
        situation: 'User runs dangerous command: rm -rf /',
        response:
          'Rina (Concerned): "⚠️ Whoa there! That command would delete everything. Let me suggest a safer alternative..."',
        voice: 'concerned-technical.wav',
      },
      {
        situation: 'Command executes successfully',
        response:
          'Rina (Satisfied): "✅ Perfect! Command completed efficiently. Is there anything else I can help with?"',
        voice: 'complete-satisfied.wav',
      },
      {
        situation: 'User seems frustrated with errors',
        response:
          'Rina (Supportive): "I understand this can be frustrating. Let me walk you through this step by step..."',
        voice: 'frustrated-help-empathetic.wav',
      },
      {
        situation: 'Complex command analysis',
        response:
          'Rina (Analytical): "Interesting... I\'m analyzing the system context to provide the best recommendation..."',
        voice: 'thinking-processing.wav',
      },
      {
        situation: 'System startup',
        response:
          'Rina (Excited): "🚀 RinaWarp Terminal is ready! I\'m here to make your terminal experience amazing!"',
        voice: 'boot-complete-excited.wav',
      },
    ];

    scenarios.forEach((scenario, index) => {
      console.log(`\n${index + 1}. ${scenario.situation}`);
      console.log(`   Response: ${scenario.response}`);
      console.log(`   Voice File: ${scenario.voice}`);
    });
  }

  showVoiceSetupInstructions() {
    console.log('\n🔧 Voice Setup Instructions:');
    console.log('─'.repeat(30));

    console.log('\n📋 ElevenLabs Configuration:');
    console.log('1. Get API key from https://elevenlabs.io');
    console.log('2. Add to .env file: ELEVENLABS_API_KEY=your_key_here');
    console.log('3. Select voice personality in settings');
    console.log('4. Test with "Hey Rina" wake word');

    console.log('\n⚙️ Browser Voice Recognition:');
    console.log('1. Grant microphone permissions');
    console.log('2. Use Chrome/Safari for best compatibility');
    console.log('3. Speak clearly and wait for processing');
    console.log('4. Fallback to keyboard shortcuts (Ctrl+Shift+V)');

    console.log('\n🎛️ Voice Customization:');
    console.log('1. Train custom voice commands');
    console.log('2. Adjust personality modes');
    console.log('3. Set voice response preferences');
    console.log('4. Configure wake word sensitivity');

    console.log('\n🎵 Available Commands:');
    const quickCommands = [
      'enable-voice.js - Enable voice features',
      'voice-control-demo.cjs - Test voice recognition',
      'rina-voice-demo.cjs - Full voice system demo',
      'npm run experimental:voice - Enhanced voice engine',
    ];

    quickCommands.forEach(cmd => {
      console.log(`   • ${cmd}`);
    });
  }

  showSummary() {
    console.log('\n✅ Voice Features Summary:');
    console.log('─'.repeat(30));

    const stats = {
      voiceFiles: this.voiceFiles.length,
      categories: this.commandCategories.size,
      moods: new Set(this.voiceFiles.map(v => v.mood)).size,
      elevenlabsVoices: Object.keys(this.elevenlabsVoices).length,
    };

    console.log('📊 Statistics:');
    console.log(`   • ${stats.voiceFiles} Rina voice files`);
    console.log(`   • ${stats.categories} voice categories`);
    console.log(`   • ${stats.moods} different moods`);
    console.log(`   • ${stats.elevenlabsVoices} ElevenLabs voices`);
    console.log('   • 40+ predefined voice commands');

    console.log('\n🌟 Key Features:');
    console.log('   🎤 Natural language processing');
    console.log('   🧠 AI-powered voice recognition');
    console.log('   🎭 Personality-driven responses');
    console.log('   ⚠️ Safety-aware voice warnings');
    console.log('   🔧 Customizable voice commands');
    console.log('   🌊 Contextual voice interactions');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Configure ElevenLabs API key for premium voices');
    console.log('   2. Try voice commands in the terminal interface');
    console.log('   3. Customize voice personality settings');
    console.log('   4. Train personalized voice commands');

    console.log('\n🎉 Voice Features Demo Complete!');
  }
}

// Run the demo
async function runDemo() {
  const demo = new RinaVoiceDemo();
  await demo.init();
  demo.showSummary();
}

runDemo().catch(console.error);

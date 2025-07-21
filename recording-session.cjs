#!/usr/bin/env node

/**
 * RinaWarp Terminal - Voice Recording Session Organizer
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 * 
 * This tool helps organize and track your voice recording progress,
 * provides prompts, and validates recorded files.
 */

const fs = require('fs');
const path = require('path');
const kleur = require('kleur');

// Recording session data
const RECORDING_PHRASES = [
  // Command Confirmations - Boot & System
  { id: 'boot-complete-neutral', text: 'Boot complete! RinaWarp Terminal is ready.', category: 'boot', mood: 'neutral' },
  { id: 'boot-complete-confident', text: 'Boot complete! RinaWarp Terminal is ready.', category: 'boot', mood: 'confident' },
  { id: 'boot-complete-excited', text: 'Boot complete! RinaWarp Terminal is ready.', category: 'boot', mood: 'excited' },
  
  // Command Execution
  { id: 'executing-neutral', text: 'Running that now...', category: 'execute', mood: 'neutral' },
  { id: 'executing-confident', text: 'Running that now...', category: 'execute', mood: 'confident' },
  { id: 'executing-quick', text: 'Running that now...', category: 'execute', mood: 'quick' },
  
  // Command Completion
  { id: 'complete-neutral', text: 'Command completed successfully.', category: 'complete', mood: 'neutral' },
  { id: 'complete-satisfied', text: 'Command completed successfully.', category: 'complete', mood: 'satisfied' },
  { id: 'complete-efficient', text: 'Command completed successfully.', category: 'complete', mood: 'efficient' },
  
  // Thinking & Processing
  { id: 'thinking-neutral', text: 'Let me think...', category: 'thinking', mood: 'neutral' },
  { id: 'thinking-curious', text: 'Let me think...', category: 'thinking', mood: 'curious' },
  { id: 'thinking-processing', text: 'Let me think...', category: 'thinking', mood: 'processing' },
  
  // Interest & Curiosity
  { id: 'interesting-neutral', text: 'Hmm, interesting...', category: 'interest', mood: 'neutral' },
  { id: 'interesting-intrigued', text: 'Hmm, interesting...', category: 'interest', mood: 'intrigued' },
  { id: 'interesting-analytical', text: 'Hmm, interesting...', category: 'interest', mood: 'analytical' },
  
  // Helpful Suggestions
  { id: 'suggestion-neutral', text: 'Try this instead?', category: 'suggest', mood: 'neutral' },
  { id: 'suggestion-helpful', text: 'Try this instead?', category: 'suggest', mood: 'helpful' },
  { id: 'suggestion-encouraging', text: 'Try this instead?', category: 'suggest', mood: 'encouraging' },
  
  // Error Reports
  { id: 'module-error-neutral', text: 'Module loading failed. Checking diagnostics...', category: 'error', mood: 'neutral' },
  { id: 'module-error-concerned', text: 'Module loading failed. Checking diagnostics...', category: 'error', mood: 'concerned' },
  { id: 'module-error-technical', text: 'Module loading failed. Checking diagnostics...', category: 'error', mood: 'technical' },
  
  // System Status
  { id: 'system-healthy-neutral', text: 'All systems are running smoothly.', category: 'status', mood: 'neutral' },
  { id: 'system-healthy-confident', text: 'All systems are running smoothly.', category: 'status', mood: 'confident' },
  { id: 'system-healthy-satisfied', text: 'All systems are running smoothly.', category: 'status', mood: 'satisfied' },
  
  // Greetings
  { id: 'hello-rina-neutral', text: 'Hello! I\'m Rina, your terminal assistant.', category: 'greeting', mood: 'neutral' },
  { id: 'hello-rina-warm', text: 'Hello! I\'m Rina, your terminal assistant.', category: 'greeting', mood: 'warm' },
  { id: 'hello-rina-professional', text: 'Hello! I\'m Rina, your terminal assistant.', category: 'greeting', mood: 'professional' },
  { id: 'hello-rina-friendly', text: 'Hello! I\'m Rina, your terminal assistant.', category: 'greeting', mood: 'friendly' },
  
  // Farewells
  { id: 'goodbye-neutral', text: 'Goodbye! Terminal session ending.', category: 'farewell', mood: 'neutral' },
  { id: 'goodbye-warm', text: 'Goodbye! Terminal session ending.', category: 'farewell', mood: 'warm' },
  { id: 'goodbye-professional', text: 'Goodbye! Terminal session ending.', category: 'farewell', mood: 'professional' },
  
  // Mood-Specific Responses
  { id: 'frustrated-help-empathetic', text: 'I understand this can be frustrating. Let me help simplify things.', category: 'mood', mood: 'empathetic' },
  { id: 'frustrated-help-calming', text: 'I understand this can be frustrating. Let me help simplify things.', category: 'mood', mood: 'calming' },
  { id: 'frustrated-help-supportive', text: 'I understand this can be frustrating. Let me help simplify things.', category: 'mood', mood: 'supportive' },
  
  { id: 'uncertain-guidance-reassuring', text: 'No worries! Let\'s take this step by step.', category: 'mood', mood: 'reassuring' },
  { id: 'uncertain-guidance-patient', text: 'No worries! Let\'s take this step by step.', category: 'mood', mood: 'patient' },
  { id: 'uncertain-guidance-gentle', text: 'No worries! Let\'s take this step by step.', category: 'mood', mood: 'gentle' },
  
  // Performance & Health
  { id: 'performance-good-neutral', text: 'Performance metrics look excellent!', category: 'performance', mood: 'neutral' },
  { id: 'performance-good-pleased', text: 'Performance metrics look excellent!', category: 'performance', mood: 'pleased' },
  { id: 'performance-good-efficient', text: 'Performance metrics look excellent!', category: 'performance', mood: 'efficient' }
];

const SOUNDS_DIR = '/Users/kgilley/rinawarp-terminal/sounds/rina';

class RecordingSessionOrganizer {
  constructor() {
    this.currentSession = 0;
    this.completedRecordings = new Set();
    this.sessionProgress = {};
    
    // Ensure sounds directory exists
    this.ensureDirectoryExists();
    
    // Load existing recordings
    this.loadExistingRecordings();
  }
  
  ensureDirectoryExists() {
    if (!fs.existsSync(SOUNDS_DIR)) {
      fs.mkdirSync(SOUNDS_DIR, { recursive: true });
      console.log(kleur.green(`📁 Created sounds directory: ${SOUNDS_DIR}`));
    }
  }
  
  loadExistingRecordings() {
    try {
      const files = fs.readdirSync(SOUNDS_DIR);
      files.forEach(file => {
        if (file.endsWith('.wav') || file.endsWith('.mp3')) {
          const baseName = path.basename(file, path.extname(file));
          this.completedRecordings.add(baseName);
        }
      });
      
      console.log(kleur.cyan(`📊 Found ${this.completedRecordings.size} existing recordings`));
    } catch (error) {
      console.warn(kleur.yellow('⚠️ Could not scan existing recordings:', error.message));
    }
  }
  
  showWelcome() {
    console.log(kleur.bold().cyan('\n🎙️ RinaWarp Terminal - Voice Recording Session\n'));
    console.log(kleur.white('Welcome to your personalized voice recording session!'));
    console.log(kleur.gray('You\'ll be recording 36 core phrases with mood variations.'));
    console.log(kleur.gray('Each phrase should be 2-8 seconds long with clear articulation.\n'));
    
    this.showProgress();
  }
  
  showProgress() {
    const totalPhrases = RECORDING_PHRASES.length;
    const completed = this.completedRecordings.size;
    const remaining = totalPhrases - completed;
    const percentage = Math.round((completed / totalPhrases) * 100);
    
    console.log(kleur.bold().white('📊 Recording Progress:'));
    console.log(`  ${kleur.green('Completed:')} ${completed}/${totalPhrases} (${percentage}%)`);
    console.log(`  ${kleur.yellow('Remaining:')} ${remaining}`);
    
    // Progress bar
    const barLength = 30;
    const filled = Math.round((completed / totalPhrases) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`  [${kleur.green(bar)}]\n`);
  }
  
  organizeByCategory() {
    const categories = {};
    
    RECORDING_PHRASES.forEach(phrase => {
      if (!categories[phrase.category]) {
        categories[phrase.category] = [];
      }
      categories[phrase.category].push(phrase);
    });
    
    return categories;
  }
  
  showRecordingMenu() {
    console.log(kleur.bold().white('🎚️ Recording Options:'));
    console.log(kleur.white('  1. Record by category (recommended)'));
    console.log(kleur.white('  2. Record specific phrases'));
    console.log(kleur.white('  3. View remaining phrases'));
    console.log(kleur.white('  4. Test recorded phrases'));
    console.log(kleur.white('  5. Validate all recordings'));
    console.log(kleur.white('  6. Export recording checklist'));
    console.log(kleur.white('  q. Quit session\n'));
  }
  
  showCategoryMenu() {
    const categories = this.organizeByCategory();
    
    console.log(kleur.bold().white('📂 Recording Categories:\n'));
    
    Object.keys(categories).forEach((category, index) => {
      const phrases = categories[category];
      const completed = phrases.filter(p => this.completedRecordings.has(p.id)).length;
      const total = phrases.length;
      const status = completed === total ? kleur.green('✅ Complete') : 
        completed === 0 ? kleur.red('❌ Not started') : 
          kleur.yellow(`📝 ${completed}/${total} done`);
      
      console.log(`  ${index + 1}. ${kleur.cyan(category.toUpperCase())} (${total} phrases) ${status}`);
    });
    
    console.log();
  }
  
  showCategoryPhrases(categoryName) {
    const categories = this.organizeByCategory();
    const phrases = categories[categoryName];
    
    if (!phrases) {
      console.log(kleur.red(`❌ Category '${categoryName}' not found`));
      return;
    }
    
    console.log(kleur.bold().white(`\n🎵 ${categoryName.toUpperCase()} - Recording Phrases:\n`));
    
    phrases.forEach((phrase, index) => {
      const status = this.completedRecordings.has(phrase.id) ? 
        kleur.green('✅') : kleur.red('❌');
      const moodColor = this.getMoodColor(phrase.mood);
      
      console.log(`${status} ${index + 1}. [${moodColor(phrase.mood)}] "${phrase.text}"`);
      console.log(`    File: ${kleur.gray(phrase.id + '.wav')}\n`);
    });
  }
  
  getMoodColor(mood) {
    const colors = {
      neutral: kleur.white,
      confident: kleur.blue,
      excited: kleur.magenta,
      quick: kleur.cyan,
      satisfied: kleur.green,
      efficient: kleur.blue,
      curious: kleur.yellow,
      processing: kleur.gray,
      intrigued: kleur.magenta,
      analytical: kleur.blue,
      helpful: kleur.green,
      encouraging: kleur.yellow,
      concerned: kleur.red,
      technical: kleur.blue,
      warm: kleur.yellow,
      professional: kleur.blue,
      friendly: kleur.green,
      empathetic: kleur.magenta,
      calming: kleur.cyan,
      supportive: kleur.green,
      reassuring: kleur.blue,
      patient: kleur.gray,
      gentle: kleur.cyan,
      pleased: kleur.green
    };
    
    return colors[mood] || kleur.white;
  }
  
  showRemainingPhrases() {
    const remaining = RECORDING_PHRASES.filter(p => !this.completedRecordings.has(p.id));
    
    console.log(kleur.bold().white(`\n📋 Remaining Phrases (${remaining.length}):\n`));
    
    remaining.forEach((phrase, index) => {
      const moodColor = this.getMoodColor(phrase.mood);
      console.log(`${index + 1}. [${kleur.cyan(phrase.category)}] [${moodColor(phrase.mood)}] "${phrase.text}"`);
      console.log(`   ${kleur.gray('File: ' + phrase.id + '.wav')}\n`);
    });
  }
  
  validateRecordings() {
    console.log(kleur.bold().white('\n🔍 Validating Recordings:\n'));
    
    let validCount = 0;
    let invalidCount = 0;
    
    RECORDING_PHRASES.forEach(phrase => {
      const filePath = path.join(SOUNDS_DIR, phrase.id + '.wav');
      const mp3Path = path.join(SOUNDS_DIR, phrase.id + '.mp3');
      
      if (fs.existsSync(filePath) || fs.existsSync(mp3Path)) {
        const existingPath = fs.existsSync(filePath) ? filePath : mp3Path;
        const stats = fs.statSync(existingPath);
        const sizeKB = Math.round(stats.size / 1024);
        
        console.log(`${kleur.green('✅')} ${phrase.id} (${sizeKB}KB)`);
        validCount++;
      } else {
        console.log(`${kleur.red('❌')} ${phrase.id} - Missing`);
        invalidCount++;
      }
    });
    
    console.log(`\n📊 Summary: ${kleur.green(validCount + ' valid')}, ${kleur.red(invalidCount + ' missing')}`);
    
    if (invalidCount === 0) {
      console.log(kleur.bold().green('\n🎉 All recordings complete! Ready to test your Rina voice system!'));
    }
  }
  
  exportChecklist() {
    const checklistPath = path.join('/Users/kgilley/rinawarp-terminal', 'recording-checklist.md');
    
    let checklist = '# 🎙️ Rina Voice Recording Checklist\n\n';
    checklist += 'Track your recording progress:\n\n';
    
    const categories = this.organizeByCategory();
    
    Object.keys(categories).forEach(categoryName => {
      checklist += `## ${categoryName.toUpperCase()}\n\n`;
      
      categories[categoryName].forEach(phrase => {
        const status = this.completedRecordings.has(phrase.id) ? '[x]' : '[ ]';
        checklist += `${status} **${phrase.id}.wav** - [${phrase.mood}] "${phrase.text}"\n`;
      });
      
      checklist += '\n';
    });
    
    checklist += '---\n\n';
    checklist += '**Recording Tips:**\n';
    checklist += '- Use consistent volume and tone\n';
    checklist += '- Record in a quiet environment\n';
    checklist += '- Each clip should be 2-8 seconds\n';
    checklist += '- Save as WAV or high-quality MP3\n';
    checklist += '- Test playback after each recording\n';
    
    fs.writeFileSync(checklistPath, checklist);
    console.log(kleur.green(`📋 Checklist exported to: ${checklistPath}`));
  }
  
  run() {
    this.showWelcome();
    console.log(kleur.bold().cyan('🎯 Ready to start recording your Rina voice!'));
    console.log(kleur.white('Your voice clips will be saved to: ' + SOUNDS_DIR));
    console.log(kleur.gray('Use any audio recording software (QuickTime, Audacity, etc.)\n'));
    
    this.showRecordingMenu();
    this.showCategoryMenu();
    this.validateRecordings();
    
    console.log(kleur.bold().green('\n🚀 Recording Session Ready!'));
    console.log(kleur.white('Choose a category above and start recording your Rina personality!'));
    console.log(kleur.gray('Remember: Confident yet approachable, professional with warmth ✨'));
  }
}

// Run the recording session organizer
if (require.main === module) {
  const organizer = new RecordingSessionOrganizer();
  organizer.run();
}

module.exports = RecordingSessionOrganizer;

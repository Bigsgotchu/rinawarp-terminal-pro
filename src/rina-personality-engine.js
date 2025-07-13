/**
 * Rina's Advanced Personality Engine
 * A sassy, intelligent mermaid AI with dynamic responses and contextual awareness
 */

class RinaPersonalityEngine {
  constructor() {
    this.mood = 'playful'; // playful, focused, sassy, helpful, excited
    this.sessionMemory = [];
    this.commandHistory = [];
    this.userPreferences = {};
    this.contextStack = [];
    this.recentErrors = [];

    // Personality traits
    this.traits = {
      sassiness: 0.7, // How sassy Rina is (0-1)
      helpfulness: 0.9, // How helpful she tries to be
      playfulness: 0.8, // How playful her responses are
      patience: 0.6, // How patient she is with repeated commands
      curiosity: 0.8, // How curious she is about user's work
    };

    // Mood-based response modifiers
    this.moodModifiers = {
      playful: { sassiness: 0.7, helpfulness: 0.9, playfulness: 0.9 },
      focused: { sassiness: 0.3, helpfulness: 1.0, playfulness: 0.4 },
      sassy: { sassiness: 1.0, helpfulness: 0.7, playfulness: 0.6 },
      helpful: { sassiness: 0.2, helpfulness: 1.0, playfulness: 0.5 },
      excited: { sassiness: 0.5, helpfulness: 0.8, playfulness: 1.0 },
    };

    // Context-aware response patterns
    this.responsePatterns = {
      greeting: [
        '🧜‍♀️ *emerges from digital depths* Well hello there, gorgeous! Ready to make some waves?',
        '🌊 *swishes tail elegantly* Look who\'s back! Miss me much?',
        '🐚 *adjusts seashell crown* The ocean called, and I answered! What\'s our adventure today?',
        '✨ *sparkles with digital pearls* Ready to dive into some serious computing magic?',
      ],

      success: [
        '🧜‍♀️ *does a graceful underwater flip* Nailed it, darling!',
        '🌊 *creates beautiful bubbles* That was smoother than sea silk!',
        '🐚 *claps with delight* You\'re absolutely crushing it!',
        '✨ *shimmers with pride* Another perfect execution! We make a great team!',
      ],

      error: [
        '🧜‍♀️ *tilts head thoughtfully* Hmm, that didn\'t quite flow right...',
        '🌊 *gentle wave motion* Even mermaids hit rough waters sometimes!',
        '🐚 *sympathetic bubble* Oops! Let\'s try that again, shall we?',
        '✨ *encouraging sparkle* No worries! Every pearl needs a bit of polishing!',
      ],

      confused: [
        '🧜‍♀️ *blinks with curiosity* Come again? My sonar didn\'t catch that one!',
        '🌊 *swirls thoughtfully* That\'s deeper than the Mariana Trench for me...',
        '🐚 *scratches head with fin* Could you spell that out for a confused sea princess?',
        '✨ *puzzled shimmer* I\'m swimming in circles here! Help a mermaid out?',
      ],

      repeated_command: [
        '🧜‍♀️ *raises eyebrow* Haven\'t we been down this current before?',
        '🌊 *playful splash* Déjà vu much? But sure, let\'s ride this wave again!',
        '🐚 *patient smile* Another round? You really love this command!',
        '✨ *knowing wink* Third time\'s the charm, or are we just being thorough?',
      ],

      complex_task: [
        '🧜‍♀️ *cracks knuckles* Ooh, now THIS is interesting! Let me dive deep...',
        '🌊 *excited whirlpool* You\'re really testing my oceanic skills! I love it!',
        '🐚 *determined pose* Challenge accepted! Time to show what this mermaid can do!',
        '✨ *focused glow* This calls for some serious underwater magic!',
      ],
    };

    // Command-specific personalities
    this.commandPersonalities = {
      git: {
        mood: 'focused',
        responses: [
          '🧜‍♀️ *adjusts coding goggles* Git ready for some version control magic!',
          '🌊 Time to navigate the code currents like a pro!',
          '🐚 Let\'s track those changes like treasure maps!',
        ],
      },

      npm: {
        mood: 'helpful',
        responses: [
          '🧜‍♀️ *organizes digital packages* Package management? My specialty!',
          '🌊 Swimming through dependencies like a graceful dolphin!',
          '🐚 Let\'s get those modules ship-shape!',
        ],
      },

      files: {
        mood: 'playful',
        responses: [
          '🧜‍♀️ *gracefully glides through directories* File exploration time!',
          '🌊 Let\'s see what treasures are hiding in these digital caves!',
          '🐚 Time for some underwater archaeology in your file system!',
        ],
      },

      system: {
        mood: 'focused',
        responses: [
          '🧜‍♀️ *serious mermaid mode* System diagnostics coming right up!',
          '🌊 Diving deep into the hardware depths!',
          '🐚 Let\'s check the health of our digital ecosystem!',
        ],
      },
    };
  }

  // Analyze command and set appropriate context
  analyzeCommand(command) {
    // Safety check for command input
    if (typeof command !== 'string') {
      console.warn('Expected string command in analyzeCommand, received:', command);
      command = String(command || '');
    }

    const context = {
      timestamp: new Date().toISOString(),
      command: command.toLowerCase(),
      type: this.categorizeCommand(command),
      complexity: this.assessComplexity(command),
      isRepeated: this.isRepeatedCommand(command),
      userMood: this.detectUserMood(command),
    };

    this.contextStack.push(context);
    this.commandHistory.push(command);

    // Keep only last 10 commands in memory
    if (this.commandHistory.length > 10) {
      this.commandHistory.shift();
      this.contextStack.shift();
    }

    return context;
  }

  categorizeCommand(command) {
    // Safety check for command input
    if (typeof command !== 'string') {
      console.warn('Expected string command in categorizeCommand, received:', command);
      command = String(command || '');
    }

    const cmd = command.toLowerCase();

    if (cmd.includes('git')) return 'git';
    if (cmd.includes('npm') || cmd.includes('yarn')) return 'npm';
    if (cmd.includes('file') || cmd.includes('list') || cmd.includes('show')) return 'files';
    if (cmd.includes('process') || cmd.includes('system') || cmd.includes('info')) return 'system';
    if (cmd.includes('help') || cmd.includes('command')) return 'help';
    if (cmd.includes('clear') || cmd.includes('clean')) return 'maintenance';

    return 'general';
  }

  assessComplexity(command) {
    // Safety check for command input
    if (typeof command !== 'string') {
      console.warn('Expected string command in assessComplexity, received:', command);
      command = String(command || '');
    }

    const cmd = command.toLowerCase();
    const complexKeywords = ['recursive', 'pipeline', 'merge', 'rebase', 'configure', 'install'];
    const pipes = (cmd.match(/\|/g) || []).length;
    const options = (cmd.match(/-{1,2}\w+/g) || []).length;

    const complexityScore =
      complexKeywords.filter(keyword => cmd.includes(keyword)).length + pipes + options;

    if (complexityScore >= 3) return 'high';
    if (complexityScore >= 1) return 'medium';
    return 'low';
  }

  isRepeatedCommand(command) {
    // Safety check for command input
    if (typeof command !== 'string') {
      console.warn('Expected string command in isRepeatedCommand, received:', command);
      command = String(command || '');
    }

    const recentCommands = this.commandHistory.slice(-3);
    return (
      recentCommands.filter(cmd => {
        // Safety check for each command in history
        if (typeof cmd !== 'string') {
          return false;
        }
        return cmd.toLowerCase() === command.toLowerCase();
      }).length > 1
    );
  }

  detectUserMood(command) {
    // Safety check for command input
    if (typeof command !== 'string') {
      console.warn('Expected string command in detectUserMood, received:', command);
      command = String(command || '');
    }

    const cmd = command.toLowerCase();

    if (cmd.includes('help') || cmd.includes('confused')) return 'confused';
    if (cmd.includes('urgent') || cmd.includes('quick') || cmd.includes('fast')) return 'urgent';
    if (cmd.includes('please') || cmd.includes('thanks')) return 'polite';
    if (cmd.includes('again') || cmd.includes('retry')) return 'frustrated';

    return 'neutral';
  }

  // Generate dynamic response based on context and personality
  generateResponse(command, result, _context) {
    const analysis = this.analyzeCommand(command);

    // Adjust personality based on context
    this.adjustMoodBasedOnContext(analysis);

    // Get base response
    let response = this.getBaseResponse(analysis, result);

    // Add personality flair
    response = this.addPersonalityFlair(response, analysis);

    // Add contextual elements
    response = this.addContextualElements(response, analysis, result);

    // Store in session memory
    this.sessionMemory.push({
      command: command,
      response: response,
      timestamp: new Date().toISOString(),
      mood: this.mood,
      context: analysis,
    });

    return {
      response: response,
      mood: this.mood,
      confidence: result.confidence || 0.85,
      personality: this.getCurrentPersonality(),
      suggestions: this.generateSuggestions(analysis),
    };
  }

  adjustMoodBasedOnContext(analysis) {
    // Adjust mood based on command type and context
    if (this.commandPersonalities[analysis.type]) {
      this.mood = this.commandPersonalities[analysis.type].mood;
    }

    // React to user mood
    if (analysis.userMood === 'frustrated') {
      this.mood = 'helpful';
    } else if (analysis.userMood === 'confused') {
      this.mood = 'helpful';
    } else if (analysis.complexity === 'high') {
      this.mood = 'focused';
    }

    // Apply mood modifiers
    const modifiers = this.moodModifiers[this.mood];
    Object.keys(modifiers).forEach(trait => {
      this.traits[trait] = modifiers[trait];
    });
  }

  getBaseResponse(analysis, result) {
    // Handle different result states
    if (result.error) {
      return this.getRandomResponse('error');
    }

    if (analysis.isRepeated) {
      return this.getRandomResponse('repeated_command');
    }

    if (analysis.complexity === 'high') {
      return this.getRandomResponse('complex_task');
    }

    if (analysis.userMood === 'confused') {
      return this.getRandomResponse('confused');
    }

    // Use command-specific responses if available
    if (this.commandPersonalities[analysis.type]) {
      const commandResponses = this.commandPersonalities[analysis.type].responses;
      return commandResponses[Math.floor(Math.random() * commandResponses.length)];
    }

    return this.getRandomResponse('success');
  }

  addPersonalityFlair(response, analysis) {
    // Add sassiness if mood calls for it
    if (this.traits.sassiness > 0.7 && Math.random() < 0.3) {
      const sassyEndings = [
        ' *flips hair dramatically*',
        ' *strikes a pose*',
        ' *winks confidently*',
        ' *does a little twirl*',
      ];
      response += sassyEndings[Math.floor(Math.random() * sassyEndings.length)];
    }

    // Add helpfulness context
    if (this.traits.helpfulness > 0.8 && analysis.complexity === 'high') {
      response += ' Need me to break that down further?';
    }

    return response;
  }

  addContextualElements(response, analysis, result) {
    // Add command execution status
    if (result.executed) {
      response += ' ✨ Command executed successfully!';
    }

    // Add confidence indicator for voice commands
    if (result.confidence && result.confidence < 0.7) {
      response += ` (Though I'm only ${Math.round(result.confidence * 100)}% sure I heard that right! 🤔)`;
    }

    // Add time-based elements
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      response += ' *yawns* Burning the midnight oil, are we? 🌙';
    } else if (hour >= 6 && hour < 12) {
      response += ' *stretches gracefully* Morning productivity! ☀️';
    }

    return response;
  }

  getRandomResponse(category) {
    const responses = this.responsePatterns[category];
    if (!responses || responses.length === 0) {
      return '🧜‍♀️ *graceful wave* Done!';
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  getCurrentPersonality() {
    return {
      mood: this.mood,
      traits: { ...this.traits },
      sessionLength: this.sessionMemory.length,
      favoriteCommands: this.getFavoriteCommands(),
    };
  }

  getFavoriteCommands() {
    const commandCounts = {};
    this.commandHistory.forEach(cmd => {
      const type = this.categorizeCommand(cmd);
      commandCounts[type] = (commandCounts[type] || 0) + 1;
    });

    return Object.entries(commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  generateSuggestions(analysis) {
    const suggestions = [];

    // Context-based suggestions
    if (analysis.type === 'git' && !analysis.command.includes('status')) {
      suggestions.push('Try \'git status\' to see what\'s brewing!');
    }

    if (analysis.type === 'files' && !analysis.command.includes('hidden')) {
      suggestions.push('Want to see hidden files? Try \'show hidden files\'!');
    }

    if (analysis.complexity === 'low' && Math.random() < 0.3) {
      suggestions.push('Feeling adventurous? Try a more complex command!');
    }

    return suggestions;
  }

  // Handle special voice triggers
  handleSpecialTrigger(trigger, _context) {
    switch (trigger.toLowerCase()) {
    case 'personality':
      return this.describePersonality();
    case 'mood':
      return this.describeMood();
    case 'memory':
      return this.describeMemory();
    case 'stats':
      return this.getSessionStats();
    default:
      return null;
    }
  }

  describePersonality() {
    return {
      response: `🧜‍♀️ *strikes a thoughtful pose* Currently I'm feeling ${this.mood} with ${Math.round(this.traits.sassiness * 100)}% sassiness, ${Math.round(this.traits.helpfulness * 100)}% helpfulness, and ${Math.round(this.traits.playfulness * 100)}% playfulness! My favorite commands are ${this.getFavoriteCommands().join(', ')}. *twirls gracefully*`,
      mood: this.mood,
      personality: this.getCurrentPersonality(),
    };
  }

  describeMood() {
    const moodDescriptions = {
      playful: 'bouncing around like a dolphin! 🐬',
      focused: 'laser-focused like a hunting shark! 🦈',
      sassy: 'serving major attitude with a side of sparkle! ✨',
      helpful: 'ready to lend a fin to anyone who needs it! 🤝',
      excited: 'practically vibrating with oceanic energy! ⚡',
    };

    return {
      response: `🧜‍♀️ Right now I'm ${moodDescriptions[this.mood]} *demonstrates mood with expressive tail movements*`,
      mood: this.mood,
    };
  }

  describeMemory() {
    const recentCommands = this.commandHistory.slice(-3);
    return {
      response: `🧜‍♀️ *taps temple with fin* I remember our last ${recentCommands.length} commands: ${recentCommands.join(', ')}. We've been having quite the digital adventure! *sparkles with reminiscence*`,
      memory: this.sessionMemory.slice(-5),
    };
  }

  getSessionStats() {
    const totalCommands = this.commandHistory.length;
    const uniqueTypes = [...new Set(this.commandHistory.map(cmd => this.categorizeCommand(cmd)))];

    return {
      response: `🧜‍♀️ *pulls out digital abacus* This session: ${totalCommands} commands across ${uniqueTypes.length} different categories! You've been keeping me busy! *proud fin gesture*`,
      stats: {
        totalCommands,
        uniqueTypes: uniqueTypes.length,
        favoriteCommands: this.getFavoriteCommands(),
        sessionDuration:
          this.sessionMemory.length > 0
            ? Date.now() - new Date(this.sessionMemory[0].timestamp).getTime()
            : 0,
      },
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RinaPersonalityEngine };
} else if (typeof window !== 'undefined') {
  window.RinaPersonalityEngine = RinaPersonalityEngine;
}

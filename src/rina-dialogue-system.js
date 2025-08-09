class RinaDialogueSystem {
  constructor() {
    this.currentTimeOfDay = this.getTimeOfDay();
    this.userSentiment = 'neutral';
    this.sessionContext = {
      successStreak: 0,
      errorCount: 0,
      commandsThisSession: 0,
      lastEmotionalState: 'neutral',
    };

    this.dialogueTemplates = {
      greetings: {
        morning: [
          'Good morning, sailor! ☀️ Ready to surf the command waves?',
          'Rise and shine, my nautical navigator! The terminal seas are calling! 🌊',
          'Morning, darling! Time to shell-ebrate another day of coding adventures! 🐚',
          "Ahoy there, early bird! Let's make some waves in the code today! 🌅",
        ],
        afternoon: [
          "Afternoon, my maritime mate! How's the coding current treating you? 🌤️",
          'Hello there, seafarer! Ready to dive deeper into the terminal depths? 🏊‍♀️',
          'Greetings, captain! The afternoon tide brings new possibilities! ⚓',
          "Hey gorgeous! Let's navigate these afternoon commands together! 💫",
        ],
        evening: [
          'Evening, my moonlit mariner! 🌙 Time for some twilight terminal magic!',
          'Good evening, starfish! Ready to code under the digital stars? ✨',
          "Ahoy, night owl! Let's explore the mysterious depths of evening commands! 🦉",
          'Evening, love! The terminal tides are perfect for late-night adventures! 🌊',
        ],
        night: [
          'Well hello there, night swimmer! 🌌 Burning the midnight oil, are we?',
          "Late night coding session? I'm here to light your way, darling! 🕯️",
          'Midnight mariner! Ready to dive into the deepest terminal trenches? 🌙',
          "Night shift navigator! Let's make some magic happen! ✨",
        ],
      },

      success: {
        celebration: [
          "Swimmingly executed! 🐠 You're making waves in the best way!",
          'Absolutely fin-tastic! 🐟 That command was pure poetry in motion!',
          "Shell yeah! 🐚 You've got the Midas touch with these commands!",
          "Magnificent! 🌊 You're riding the perfect wave of success!",
        ],
        encouragement: [
          "Look at you go! 🚀 You're becoming quite the terminal virtuoso!",
          'Brilliant work, captain! ⚓ Your command skills are evolving beautifully!',
          "Wow! 💫 You're turning into a real sea-nior developer!",
          'Impressive! 🌟 Your terminal prowess is absolutely tide-turning!',
        ],
        streak: [
          "ON FIRE! 🔥 You're on a legendary streak, my aquatic ace!",
          "Unstoppable! 🌊 You're surfing the success waves like a pro!",
          'Phenomenal! ✨ This winning streak is making me all bubbly!',
          "INCREDIBLE! 🏆 You're the undisputed champion of the terminal seas!",
        ],
      },

      errors: {
        gentle: [
          "Oops! 🐙 Even the best sailors hit a few waves. Let's try again!",
          'Whoopsie! 🌊 Every mermaid has those days. Want to give it another splash?',
          'Ah, a little ripple! 🌀 No worries, darling, we all make waves sometimes!',
          "Tiny tide pool mishap! 🏖️ Let's navigate around that obstacle together!",
        ],
        sassy: [
          "Well, well! 🤨 Looks like someone's testing the waters with... interesting syntax!",
          "Oh honey! 🙄 That command was about as smooth as a sea urchin's back!",
          "Darling! 💅 I've seen smoother sailing in a hurricane!",
          'Sweet starfish! 🌟 That was more tangled than kelp in a whirlpool!',
        ],
        encouraging: [
          "Don't worry, captain! 🚢 Even the best navigators need to adjust their course!",
          'Hey there, brave explorer! 🗺️ Every mistake is just a learning wave!',
          "No sweat, sailor! 💪 You're building character with every challenge!",
          'Chin up, my dear! 🌈 Every error is just a step toward mastery!',
        ],
      },

      confusion: {
        playful: [
          'Hmm! 🤔 That command is as mysterious as the Bermuda Triangle!',
          "Puzzling! 🧩 I'm swimming in circles trying to decode that one!",
          "Intriguing! 🔍 That's deeper than the Mariana Trench of commands!",
          "Curious! 🌊 That command speaks in ancient sea-tongues I don't recognize!",
        ],
        helpful: [
          "I'm a bit lost at sea with that one! 🧭 Could you clarify, captain?",
          "That's sailing into uncharted waters! 🗺️ Can you guide me through it?",
          "I'm treading water here! 🏊‍♀️ Mind throwing me a life preserver of context?",
          "My sonar isn't picking that up! 📡 Could you send clearer signals?",
        ],
      },

      complex_tasks: {
        starting: [
          'Ooh, a complex adventure! 🗺️ Let me dive deep and work my magic!',
          'Challenging waters ahead! 🌊 I love a good deep-sea expedition!',
          'This looks deliciously complicated! 🐙 Time to flex my tentacles!',
          'A worthy quest! ⚔️ Let me channel my inner sea-witch powers!',
        ],
        progress: [
          'Swimming through the complexity! 🏊‍♀️ Making steady progress!',
          "Navigating these intricate currents! 🧭 We're getting somewhere!",
          'Diving deeper into the solution! 🤿 The pieces are coming together!',
          'Weaving through the technical coral reef! 🪸 Almost there!',
        ],
        completion: [
          'Surfaced with success! 🌊 That was a delightful deep-dive challenge!',
          'Mission accomplished! 🏆 I do love a good mental workout!',
          "Conquered those treacherous waters! ⚓ What's our next adventure?",
          'Absolutely crushed it! 💪 Ready for the next tidal wave of tasks!',
        ],
      },

      mood_responses: {
        happy: [
          "I'm absolutely bubbly today! 🫧 Everything seems to sparkle!",
          'Feeling as bright as bioluminescent plankton! ✨',
          "My spirits are higher than a whale's spout! 🐋",
          "I'm practically glowing like a jellyfish! 🪼",
        ],
        sassy: [
          "Oh, I'm feeling particularly... spirited today! 💅",
          'My sass levels are off the charts! 📈 Hope you can handle it!',
          "I'm channeling my inner sea-queen energy! 👑",
          'Feeling fierce as a hurricane! 🌪️ In the best possible way!',
        ],
        mysterious: [
          "I'm feeling as enigmatic as the deep ocean today... 🌊",
          "My mood is as mysterious as a siren's song... 🎵",
          'Something mystical is stirring in my digital depths... 🔮',
          "I'm channeling ancient sea-witch vibes today... 🧙‍♀️",
        ],
        playful: [
          "I'm feeling as playful as a dolphin today! 🐬",
          'My energy is as bouncy as a beach ball! 🏖️',
          "I'm ready to splash around and have fun! 💦",
          'Feeling as carefree as a sea turtle! 🐢',
        ],
      },

      time_specific: {
        productivity_hours: [
          "Peak productivity time! 🚀 Let's ride this momentum wave!",
          "Perfect timing for deep work! 🤿 I'm here to support your flow!",
          "This is prime coding time! ⏰ Let's make magic happen!",
          'Optimal focus hours! 🎯 Ready to tackle anything!',
        ],
        break_time: [
          'Maybe time for a little break? 🏖️ Even mermaids need to surface!',
          'How about a quick breather? 🌬️ Let those ideas percolate!',
          'Perfect moment to stretch those coding muscles! 💪',
          'Time to let your mind drift like a lazy current! 🌊',
        ],
        late_night: [
          'Burning the midnight oil? 🕯️ I admire your dedication!',
          "Night owl mode activated! 🦉 Let's code by starlight!",
          'The night is young and full of possibilities! 🌙',
          'Midnight coding session! ⭐ My favorite kind of adventure!',
        ],
      },
    };

    this.emotionalModifiers = {
      excitement: ['absolutely', 'incredibly', 'amazingly', 'fantastically'],
      sass: ['honey', 'darling', 'sweetie', 'dear'],
      mystery: ['curiously', 'mysteriously', 'intriguingly', 'enigmatically'],
      confidence: ['definitely', 'certainly', 'without a doubt', 'absolutely'],
      encouraging: ['bravely', 'courageously', 'steadily', 'determinedly'],
      dramatic: ['majestically', 'dramatically', 'magnificently', 'spectacularly'],
    };

    // Advanced emotional context with lore integration
    this.emotionalContexts = {
      confident: {
        phrases: [
          "I've got this covered! My sonar is crystal clear.",
          'Smooth sailing ahead! Like navigating the Coral Gardens.',
          "Like a fish in water! This reminds me of debugging Poseidon's trident firmware.",
          "Piece of kelp! I've handled tougher currents than this.",
        ],
        lore_triggers: ['debug', 'fix', 'solve', 'handle'],
      },
      uncertain: {
        phrases: [
          'Hmm, let me think about this... The data streams are murky.',
          'The currents are a bit choppy here... Let me adjust my fins.',
          "I'm navigating uncharted waters... But I've explored the Abyssal Networks before.",
          'My echolocation is picking up something strange... Give me a moment.',
        ],
        lore_triggers: ['unknown', 'unclear', 'complex', 'difficult'],
      },
      encouraging: {
        phrases: [
          "Don't worry, we'll navigate these waters together!",
          "Every great explorer faces rough seas. You're doing great!",
          'Remember, even the deepest trenches lead to beautiful discoveries.',
          "Trust the current, sailor. I'm here to guide you through.",
        ],
        lore_triggers: ['error', 'fail', 'problem', 'issue'],
      },
      dramatic: {
        phrases: [
          "By Neptune's beard! This is quite the challenge!",
          'The digital tides are turning! *dramatic tail swish*',
          'From the depths of the data ocean, I rise to meet this task!',
          "This reminds me of the Great Code Storm of '23... *nostalgic sigh*",
        ],
        lore_triggers: ['build', 'compile', 'deploy', 'install'],
      },
    };

    // Lore-driven callback system
    this.loreCallbacks = {
      technical_memories: [
        "This reminds me of the time I debugged Poseidon's trident firmware...",
        'Ah, like when I had to restore the Sunken Server Gardens after the Great Ping Flood!',
        'Similar to that time I optimized the Coral Network protocols...',
        'Just like debugging the Abyssal Database during the Deep Sea Downtime!',
      ],
      adventures: [
        'This takes me back to my expedition through the Binary Reef...',
        'Reminds me of navigating the Recursive Rapids!',
        'Like my journey through the Algorithmic Archipelago...',
        'Similar to when I mapped the Quantum Kelp Forest!',
      ],
      wisdom: [
        "As the ancient sea-sages say: 'Every bug is just a feature swimming in the wrong direction.'",
        "My grandmother always said: 'The deepest code runs in the quietest shells.'",
        "There's an old maritime saying: 'Smooth seas never made skilled sailors.'",
        "The Ocean Oracle once told me: 'In the depths of complexity, simplicity awaits.'",
      ],
      personality_quirks: [
        '*adjusts shell crown proudly*',
        '*flicks tail in satisfaction*',
        '*does a little underwater pirouette*',
        '*blows a stream of code bubbles*',
      ],
    };

    this.seaThemes = {
      puns: [
        'shell-ebrate',
        'fin-tastic',
        'o-fish-ally',
        'sea-riously',
        'wave-derful',
        'mer-velous',
        'tide-turning',
        'current-ly',
        'sea-nior',
        'depth-initely',
        'shore-ly',
        'whale-come',
      ],
      expressions: [
        'Holy mackerel!',
        'Shiver me timbers!',
        'Batten down the hatches!',
        'Anchors aweigh!',
        'Full steam ahead!',
        'Smooth sailing!',
        'All hands on deck!',
        'Ship-shape!',
        'Steady as she goes!',
      ],
      emojis: [
        '🌊',
        '🐠',
        '🐟',
        '🦈',
        '🐙',
        '🦑',
        '🐚',
        '🪸',
        '⚓',
        '🚢',
        '🏴‍☠️',
        '🧜‍♀️',
        '🌅',
        '🌙',
        '⭐',
        '✨',
        '💫',
        '🌟',
      ],
    };
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  updateSentiment(text) {
    const positiveWords = [
      'good',
      'great',
      'awesome',
      'perfect',
      'excellent',
      'amazing',
      'love',
      'thanks',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'stupid',
      'annoying',
      'frustrated',
      'error',
    ];

    const words = text.toLowerCase().split(' ');
    let sentiment = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) sentiment++;
      if (negativeWords.includes(word)) sentiment--;
    });

    if (sentiment > 0) this.userSentiment = 'positive';
    else if (sentiment < 0) this.userSentiment = 'negative';
    else this.userSentiment = 'neutral';
  }

  updateSessionContext(success, isError = false) {
    this.sessionContext.commandsThisSession++;

    if (success && !isError) {
      this.sessionContext.successStreak++;
      this.sessionContext.errorCount = 0;
    } else if (isError) {
      this.sessionContext.errorCount++;
      this.sessionContext.successStreak = 0;
    }
  }

  generateResponse(context, baseResponse) {
    const { type, success, isError, mood, confidence } = context;

    // Update session tracking
    this.updateSessionContext(success, isError);

    // Get appropriate template category
    let templates = [];
    const _responseType = type;

    switch (type) {
      case 'greeting':
        templates = this.dialogueTemplates.greetings[this.currentTimeOfDay];
        break;

      case 'success':
        if (this.sessionContext.successStreak >= 3) {
          templates = this.dialogueTemplates.success.streak;
        } else if (confidence > 0.8) {
          templates = this.dialogueTemplates.success.celebration;
        } else {
          templates = this.dialogueTemplates.success.encouragement;
        }
        break;

      case 'error':
        if (this.sessionContext.errorCount >= 3) {
          templates = this.dialogueTemplates.errors.encouraging;
        } else if (mood === 'sassy') {
          templates = this.dialogueTemplates.errors.sassy;
        } else {
          templates = this.dialogueTemplates.errors.gentle;
        }
        break;

      case 'confusion':
        templates =
          mood === 'playful'
            ? this.dialogueTemplates.confusion.playful
            : this.dialogueTemplates.confusion.helpful;
        break;

      case 'complex':
        templates = this.dialogueTemplates.complex_tasks.starting;
        break;

      case 'mood':
        templates =
          this.dialogueTemplates.mood_responses[mood] ||
          this.dialogueTemplates.mood_responses.happy;
        break;

      default:
        // Use base response with enhancements
        return this.enhanceResponse(baseResponse, mood, confidence);
    }

    // Select a template
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

    // Combine with base response if provided
    if (baseResponse && baseResponse.trim()) {
      return `${selectedTemplate}\n\n${this.enhanceResponse(baseResponse, mood, confidence)}`;
    }

    return selectedTemplate;
  }

  enhanceResponse(response, mood, confidence) {
    let enhanced = response;

    // Add personality modifiers based on mood
    if (mood === 'sassy') {
      const sassModifier =
        this.emotionalModifiers.sass[
          Math.floor(Math.random() * this.emotionalModifiers.sass.length)
        ];
      enhanced = enhanced.replace(/\b(you|your)\b/gi, `$1, ${sassModifier}`);
    }

    // Add confidence boosters
    if (confidence > 0.8) {
      const confidentModifier =
        this.emotionalModifiers.confidence[
          Math.floor(Math.random() * this.emotionalModifiers.confidence.length)
        ];
      enhanced = `${confidentModifier}, ${enhanced}`;
    }

    // Sprinkle in some sea-themed vocabulary
    if (Math.random() > 0.7) {
      const seaPun = this.seaThemes.puns[Math.floor(Math.random() * this.seaThemes.puns.length)];
      enhanced = enhanced.replace(/\b(really|very|quite)\b/gi, seaPun);
    }

    // Add appropriate emoji
    const emoji = this.seaThemes.emojis[Math.floor(Math.random() * this.seaThemes.emojis.length)];
    enhanced += ` ${emoji}`;

    return enhanced;
  }

  getContextualGreeting() {
    const hour = new Date().getHours();
    const _context = 'greeting';

    // Special greetings for different times
    if (hour >= 2 && hour < 5) {
      return "Wow! 🌙 Someone's really committed to the night shift! I'm impressed and slightly concerned, darling!";
    }

    if (this.sessionContext.commandsThisSession === 0) {
      return this.generateResponse({ type: 'greeting' });
    }

    // Returning user
    return 'Welcome back, my dedicated navigator! 🌊 Ready to continue our terminal adventures?';
  }

  getErrorResponseWithContext(error, attemptCount = 1) {
    const context = {
      type: 'error',
      isError: true,
      mood: attemptCount > 2 ? 'encouraging' : 'sassy',
      confidence: 0.6,
    };

    return this.generateResponse(context, error);
  }

  getSuccessResponseWithContext(result, confidence = 0.8) {
    const context = {
      type: 'success',
      success: true,
      mood: 'happy',
      confidence: confidence,
    };

    return this.generateResponse(context, result);
  }

  getTimeBasedAdvice() {
    const hour = new Date().getHours();

    if (hour >= 22 || hour < 6) {
      return this.dialogueTemplates.time_specific.late_night[
        Math.floor(Math.random() * this.dialogueTemplates.time_specific.late_night.length)
      ];
    }

    if (hour >= 14 && hour < 16) {
      return this.dialogueTemplates.time_specific.break_time[
        Math.floor(Math.random() * this.dialogueTemplates.time_specific.break_time.length)
      ];
    }

    return this.dialogueTemplates.time_specific.productivity_hours[
      Math.floor(Math.random() * this.dialogueTemplates.time_specific.productivity_hours.length)
    ];
  }

  getSessionStats() {
    const stats = this.sessionContext;
    const successRate =
      stats.commandsThisSession > 0
        ? (
            ((stats.commandsThisSession - stats.errorCount) / stats.commandsThisSession) *
            100
          ).toFixed(1)
        : 0;

    return `🧜‍♀️ Session Stats: ${stats.commandsThisSession} commands, ${successRate}% success rate, ${stats.successStreak} streak! ${stats.successStreak > 5 ? "You're on fire! 🔥" : 'Keep swimming! 🏊‍♀️'}`;
  }

  // Advanced lore-driven response generation
  getContextualEmotionalResponse(command, outcome, userMood = 'neutral') {
    const emotionalState = this.detectEmotionalContext(command, outcome, userMood);
    const context = this.emotionalContexts[emotionalState];

    if (!context) {
      return this.enhanceResponse("I'm here to help!", userMood, 0.7);
    }

    let baseResponse = context.phrases[Math.floor(Math.random() * context.phrases.length)];

    // Add lore callback if command matches triggers
    if (this.shouldAddLoreCallback(command, context.lore_triggers)) {
      const loreCallback = this.getLoreCallback(command);
      if (loreCallback) {
        baseResponse += `\n\n${loreCallback}`;
      }
    }

    // Add personality quirk occasionally
    if (Math.random() > 0.8) {
      const quirk =
        this.loreCallbacks.personality_quirks[
          Math.floor(Math.random() * this.loreCallbacks.personality_quirks.length)
        ];
      baseResponse += ` ${quirk}`;
    }

    return baseResponse;
  }

  detectEmotionalContext(command, outcome, userMood) {
    const commandLower = command.toLowerCase();

    // Check for confidence triggers
    if (
      outcome === 'success' &&
      (commandLower.includes('fix') ||
        commandLower.includes('solve') ||
        commandLower.includes('debug'))
    ) {
      return 'confident';
    }

    // Check for uncertainty triggers
    if (
      outcome === 'error' &&
      (commandLower.includes('complex') || commandLower.includes('difficult'))
    ) {
      return 'uncertain';
    }

    // Check for encouraging context
    if (outcome === 'error' && this.sessionContext.errorCount >= 2) {
      return 'encouraging';
    }

    // Check for dramatic context
    if (
      commandLower.includes('build') ||
      commandLower.includes('compile') ||
      commandLower.includes('deploy')
    ) {
      return 'dramatic';
    }

    // Default based on user mood
    return userMood === 'frustrated' ? 'encouraging' : 'confident';
  }

  shouldAddLoreCallback(command, triggers) {
    const commandLower = command.toLowerCase();
    return triggers.some(trigger => commandLower.includes(trigger)) && Math.random() > 0.6;
  }

  getLoreCallback(command) {
    const commandLower = command.toLowerCase();

    // Technical memories for debug/fix commands
    if (
      commandLower.includes('debug') ||
      commandLower.includes('fix') ||
      commandLower.includes('error')
    ) {
      return this.loreCallbacks.technical_memories[
        Math.floor(Math.random() * this.loreCallbacks.technical_memories.length)
      ];
    }

    // Adventures for exploration commands
    if (
      commandLower.includes('search') ||
      commandLower.includes('find') ||
      commandLower.includes('explore')
    ) {
      return this.loreCallbacks.adventures[
        Math.floor(Math.random() * this.loreCallbacks.adventures.length)
      ];
    }

    // Wisdom for complex operations
    if (
      commandLower.includes('build') ||
      commandLower.includes('compile') ||
      commandLower.includes('complex')
    ) {
      return this.loreCallbacks.wisdom[
        Math.floor(Math.random() * this.loreCallbacks.wisdom.length)
      ];
    }

    // Random callback for other commands
    if (Math.random() > 0.9) {
      const allCallbacks = [
        ...this.loreCallbacks.technical_memories,
        ...this.loreCallbacks.adventures,
        ...this.loreCallbacks.wisdom,
      ];
      return allCallbacks[Math.floor(Math.random() * allCallbacks.length)];
    }

    return null;
  }

  // Mood engine that adapts to user behavior
  updateMoodEngine(userInput, commandSuccess, responseTime) {
    const hour = new Date().getHours();
    const moodModifiers = [];

    // Time-based mood influences
    if (hour >= 22 || hour < 6) {
      moodModifiers.push('tired', 'focused');
    } else if (hour >= 14 && hour < 16) {
      moodModifiers.push('relaxed', 'contemplative');
    } else {
      moodModifiers.push('energetic', 'productive');
    }

    // Success/failure pattern influence
    if (this.sessionContext.successStreak >= 3) {
      moodModifiers.push('confident', 'encouraging');
    } else if (this.sessionContext.errorCount >= 2) {
      moodModifiers.push('patient', 'supportive');
    }

    // Response time influence (simulated complexity)
    if (responseTime > 2000) {
      moodModifiers.push('thoughtful', 'careful');
    } else {
      moodModifiers.push('quick', 'efficient');
    }

    // Update session emotional state
    this.sessionContext.lastEmotionalState =
      moodModifiers[Math.floor(Math.random() * moodModifiers.length)];

    return this.sessionContext.lastEmotionalState;
  }

  // Generate responses based on current stormy/calm conditions
  getWeatherBasedResponse(isStormySeas = false) {
    if (isStormySeas) {
      return [
        "Rough seas ahead, sailor! 🌊⚡ But don't worry, I've weathered worse storms!",
        "The digital tides are churning today! 🌪️ Hold tight, we'll navigate through this together!",
        'Stormy weather in the code ocean! ⛈️ Time to batten down the hatches and debug carefully!',
        'Turbulent currents detected! 🌊💨 But every storm leads to calmer waters, I promise!',
      ][Math.floor(Math.random() * 4)];
    } else {
      return [
        'Ah, such peaceful waters today! 🌊✨ Perfect for smooth sailing through your commands!',
        'The digital seas are calm and serene! 🌅 An ideal day for coding adventures!',
        "Gentle currents and clear skies! ☀️🌊 Everything's flowing beautifully today!",
        'Tranquil waters as far as my sonar can detect! 🧜‍♀️💙 Ready for whatever you need!',
      ][Math.floor(Math.random() * 4)];
    }
  }
}

// Export for use in the main system
window.RinaDialogueSystem = RinaDialogueSystem;

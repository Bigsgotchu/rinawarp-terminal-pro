/**
 * RinaWarp Terminal - Contextual Tips System 🧜‍♀️
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Smart contextual help system that provides personalized tips based on user behavior
 */

class ContextualTipsSystem {
  constructor() {
    this.userProfile = {
      experience_level: 'beginner', // beginner, intermediate, advanced
      command_history: [],
      first_time_commands: new Set(),
      successful_commands: new Set(),
      failed_commands: new Set(),
      preferred_workflows: {},
      tips_shown: new Set(),
      tips_dismissed: new Set(),
      session_start: Date.now(),
    };

    this.tipDatabase = this.initializeTipDatabase();
    this.contextRules = this.initializeContextRules();
    this.loadUserProfile();
    this.setupEventListeners();
  }

  initializeTipDatabase() {
    return {
      git: {
        first_time: {
          message:
            "🧜‍♀️ First time with Git? Let me be your underwater guide! Try 'rina git help' for my magical Git workflow assistance!",
          priority: 10,
          category: 'getting_started',
        },
        status_after_changes: {
          message:
            "🌊 Nice work making changes! Pro tip: 'git status' shows what's staged. Want me to explain the Git workflow?",
          priority: 8,
          trigger: 'after_file_modifications',
        },
        commit_best_practices: {
          message:
            '📝 Committing like a pro! Remember: good commit messages are like sea shanties - clear and memorable!',
          priority: 7,
          trigger: 'after_successful_commit',
        },
        branch_workflow: {
          message:
            "🌿 Working with branches? They're like coral formations - each one grows independently! Want to see branch management tips?",
          priority: 9,
          trigger: 'first_branch_command',
        },
      },

      docker: {
        first_container: {
          message:
            "🐳 Containers are like underwater bubbles - isolated but connected! Try 'rina docker help' for container magic!",
          priority: 10,
          trigger: 'first_docker_command',
        },
        port_mapping: {
          message:
            '⚓ Port mapping is like creating underwater tunnels between containers! Need help with networking?',
          priority: 8,
          trigger: 'port_related_command',
        },
        cleanup_tip: {
          message:
            "🧹 Keep your ocean clean! Unused containers pile up like seaweed. Try 'docker system prune' to tidy up!",
          priority: 6,
          trigger: 'many_stopped_containers',
        },
      },

      file_operations: {
        dangerous_commands: {
          message:
            '⚠️ 🧜‍♀️ Whoa there, sailor! That command can delete files permanently. Want me to suggest a safer alternative?',
          priority: 10,
          trigger: 'dangerous_file_operation',
        },
        permission_issues: {
          message:
            "🔒 Permission denied? It's like trying to enter a restricted lagoon! Try with 'sudo' or check file permissions.",
          priority: 9,
          trigger: 'permission_error',
        },
        bulk_operations: {
          message:
            '📦 Processing lots of files? I can help you do this more efficiently with wildcards and batch operations!',
          priority: 7,
          trigger: 'repetitive_file_operations',
        },
      },

      productivity: {
        keyboard_shortcuts: {
          message:
            '⚡ Speed up like a dolphin! Press Ctrl+Shift+P for my command palette, or Ctrl+R for command history search!',
          priority: 6,
          trigger: 'slow_typing_detected',
        },
        voice_commands: {
          message:
            "🎤 Tired of typing? Try voice commands! Say 'Hey Rina, show me my files' and watch the magic happen!",
          priority: 8,
          trigger: 'repetitive_typing',
        },
        session_insights: {
          message:
            "📊 You've been coding like a sea goddess! Want to see your productivity stats and workflow patterns?",
          priority: 5,
          trigger: 'long_productive_session',
        },
      },

      learning: {
        command_explanation: {
          message:
            "🤔 Curious about what that command does? Ask me 'rina explain [command]' and I'll break it down like sea foam!",
          priority: 8,
          trigger: 'complex_command_used',
        },
        workflow_optimization: {
          message:
            '🔄 I notice you do this sequence often! Want me to create a custom alias or workflow for you?',
          priority: 9,
          trigger: 'repeated_command_sequence',
        },
        feature_discovery: {
          message:
            "✨ Did you know I have [feature]? It's like a hidden treasure in the depths! Want to see it in action?",
          priority: 7,
          trigger: 'underutilized_features',
        },
      },

      encouragement: {
        first_success: {
          message:
            "🎉 Fantastic! Your first successful command execution! You're navigating these digital waters like a natural!",
          priority: 10,
          trigger: 'first_successful_command',
        },
        error_recovery: {
          message:
            '🌊 Every expert was once a beginner! That error just helped you learn something new. Ready to try again?',
          priority: 8,
          trigger: 'after_command_error',
        },
        milestone_celebration: {
          message:
            "🏆 Wow! You've executed 100 commands! You're becoming a true terminal mermaid! 🧜‍♀️✨",
          priority: 9,
          trigger: 'command_milestone',
        },
      },
    };
  }

  initializeContextRules() {
    return {
      // Git command patterns
      git_patterns: {
        first_git: /^git\s/,
        git_status: /^git\s+status/,
        git_commit: /^git\s+commit/,
        git_branch: /^git\s+(branch|checkout)/,
        git_push: /^git\s+push/,
      },

      // Docker patterns
      docker_patterns: {
        docker_run: /^docker\s+(run|start)/,
        docker_port: /^docker\s+.*(-p|--publish)/,
        docker_cleanup: /^docker\s+(system\s+prune|container\s+prune)/,
      },

      // Dangerous commands
      dangerous_patterns: {
        rm_recursive: /^rm\s+-[^-]*r/,
        force_delete: /^rm\s+-[^-]*f/,
        sudo_rm: /^sudo\s+rm/,
        chmod_777: /^chmod\s+777/,
      },

      // File operations
      file_patterns: {
        ls_variations: /^(ls|ll|la|dir)/,
        cp_mv: /^(cp|mv)\s/,
        find_locate: /^(find|locate)\s/,
      },
    };
  }

  // Main method to analyze command and show contextual tips
  analyzeCommand(command, context = {}) {
    const analysis = {
      command_type: this.categorizeCommand(command),
      is_first_time: this.isFirstTimeCommand(command),
      risk_level: this.assessRiskLevel(command),
      context_triggers: this.checkContextTriggers(command, context),
    };

    // Update user profile
    this.updateUserProfile(command, analysis, context);

    // Generate and show tips
    const tips = this.generateContextualTips(command, analysis, context);
    this.displayTips(tips);

    return analysis;
  }

  categorizeCommand(command) {
    const categories = [];

    if (this.contextRules.git_patterns.first_git.test(command)) {
      categories.push('git');
    }
    if (this.contextRules.docker_patterns.docker_run.test(command)) {
      categories.push('docker');
    }
    if (
      this.contextRules.dangerous_patterns.rm_recursive.test(command) ||
      this.contextRules.dangerous_patterns.force_delete.test(command)
    ) {
      categories.push('dangerous');
    }
    if (this.contextRules.file_patterns.ls_variations.test(command)) {
      categories.push('file_operations');
    }

    return categories.length > 0 ? categories : ['general'];
  }

  isFirstTimeCommand(command) {
    const commandBase = command.split(' ')[0];
    return !this.userProfile.successful_commands.has(commandBase);
  }

  assessRiskLevel(command) {
    if (
      this.contextRules.dangerous_patterns.rm_recursive.test(command) ||
      this.contextRules.dangerous_patterns.sudo_rm.test(command)
    ) {
      return 'high';
    }
    if (
      this.contextRules.dangerous_patterns.force_delete.test(command) ||
      this.contextRules.dangerous_patterns.chmod_777.test(command)
    ) {
      return 'medium';
    }
    return 'low';
  }

  checkContextTriggers(command, context) {
    const triggers = [];

    // Git-specific triggers
    if (this.contextRules.git_patterns.first_git.test(command) && this.isFirstTimeCommand('git')) {
      triggers.push('first_git_command');
    }

    // Docker-specific triggers
    if (
      this.contextRules.docker_patterns.docker_run.test(command) &&
      this.isFirstTimeCommand('docker')
    ) {
      triggers.push('first_docker_command');
    }

    // Dangerous command triggers
    if (this.assessRiskLevel(command) === 'high') {
      triggers.push('dangerous_command');
    }

    // Context-based triggers
    if (context.hasUnstagedChanges && this.contextRules.git_patterns.git_status.test(command)) {
      triggers.push('git_status_with_changes');
    }

    if (context.errorOccurred) {
      triggers.push('after_error');
    }

    if (context.isSuccessfulCommand) {
      triggers.push('successful_command');
    }

    return triggers;
  }

  generateContextualTips(command, analysis, context) {
    const tips = [];
    const categories = analysis.command_type;
    const triggers = analysis.context_triggers;

    // Process each category and trigger
    categories.forEach(category => {
      if (this.tipDatabase[category]) {
        Object.entries(this.tipDatabase[category]).forEach(([tipKey, tipData]) => {
          if (this.shouldShowTip(tipKey, tipData, triggers, analysis)) {
            tips.push({
              ...tipData,
              id: `${category}_${tipKey}`,
              category,
              timestamp: Date.now(),
            });
          }
        });
      }
    });

    // Sort by priority (higher is more important)
    tips.sort((a, b) => b.priority - a.priority);

    // Return top 2 tips maximum to avoid overwhelming
    return tips.slice(0, 2);
  }

  shouldShowTip(tipKey, tipData, triggers, analysis) {
    const tipId = `${tipData.category || 'general'}_${tipKey}`;

    // Don't show if already dismissed
    if (this.userProfile.tips_dismissed.has(tipId)) {
      return false;
    }

    // Don't show too frequently
    if (this.userProfile.tips_shown.has(tipId)) {
      const lastShown = this.userProfile.tips_shown.get(tipId);
      const hoursSinceLastShown = (Date.now() - lastShown) / (1000 * 60 * 60);
      if (hoursSinceLastShown < 24) {
        // Don't repeat within 24 hours
        return false;
      }
    }

    // Check if trigger conditions are met
    if (tipData.trigger) {
      return (
        triggers.includes(tipData.trigger) ||
        triggers.some(trigger => trigger.includes(tipData.trigger))
      );
    }

    // Default triggers based on analysis
    if (analysis.is_first_time && tipKey.includes('first_time')) {
      return true;
    }

    if (analysis.risk_level === 'high' && tipKey.includes('dangerous')) {
      return true;
    }

    return false;
  }

  displayTips(tips) {
    tips.forEach((tip, index) => {
      setTimeout(() => {
        this.showTipUI(tip);
        this.userProfile.tips_shown.set(tip.id, Date.now());
      }, index * 2000); // Stagger tips by 2 seconds
    });
  }

  showTipUI(tip) {
    // Create tip notification element
    const tipElement = document.createElement('div');
    tipElement.className = 'rina-tip-notification';
    tipElement.innerHTML = `
      <div class="tip-content">
        <div class="tip-message">${tip.message}</div>
        <div class="tip-actions">
          <button class="tip-action-btn tip-learn-more" onclick="rinaTips.learnMore('${tip.id}')">
            🧜‍♀️ Tell me more!
          </button>
          <button class="tip-action-btn tip-dismiss" onclick="rinaTips.dismissTip('${tip.id}')">
            ✖️ Got it
          </button>
        </div>
      </div>
    `;

    // Add to DOM
    this.addTipToDOM(tipElement);

    // Auto-dismiss after 10 seconds if not interacted with
    setTimeout(() => {
      if (tipElement.parentNode) {
        this.dismissTip(tip.id, tipElement);
      }
    }, 10000);
  }

  addTipToDOM(tipElement) {
    // Find or create tips container
    let tipsContainer = document.getElementById('rina-tips-container');
    if (!tipsContainer) {
      tipsContainer = document.createElement('div');
      tipsContainer.id = 'rina-tips-container';
      tipsContainer.className = 'rina-tips-container';
      document.body.appendChild(tipsContainer);
    }

    tipsContainer.appendChild(tipElement);

    // Animate in
    setTimeout(() => {
      tipElement.classList.add('tip-visible');
    }, 100);
  }

  dismissTip(tipId, element = null) {
    this.userProfile.tips_dismissed.add(tipId);
    this.saveUserProfile();

    // Remove from DOM
    if (element) {
      element.classList.add('tip-dismissing');
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 300);
    }
  }

  learnMore(tipId) {
    // Find the tip data and show expanded help
    const tip = this.findTipById(tipId);
    if (tip) {
      this.showExpandedHelp(tip);
    }
  }

  findTipById(tipId) {
    // Search through tip database to find matching tip
    for (const category of Object.values(this.tipDatabase)) {
      for (const [tipKey, tipData] of Object.entries(category)) {
        if (`${tipData.category || 'general'}_${tipKey}` === tipId) {
          return { ...tipData, key: tipKey };
        }
      }
    }
    return null;
  }

  showExpandedHelp(tip) {
    // Create expanded help modal or panel
    const helpModal = document.createElement('div');
    helpModal.className = 'rina-help-modal';
    helpModal.innerHTML = `
      <div class="help-modal-content">
        <div class="help-header">
          <h3>🧜‍♀️ Rina's Expanded Help</h3>
          <button class="help-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="help-body">
          ${this.generateExpandedHelpContent(tip)}
        </div>
        <div class="help-actions">
          <button class="help-action-btn" onclick="rinaTips.tryExample('${tip.key}')">
            🌊 Try Example
          </button>
          <button class="help-action-btn" onclick="rinaTips.showRelatedTips('${tip.category}')">
            ✨ More Tips
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(helpModal);
  }

  generateExpandedHelpContent(tip) {
    const helpContent = {
      git: {
        first_time: `
          <h4>🐙 Git Mastery with Rina</h4>
          <p>Git is like the ocean current system - it tracks every change in your code!</p>
          <ul>
            <li><code>git status</code> - See what's happening in your repo</li>
            <li><code>git add .</code> - Stage all your changes</li>
            <li><code>git commit -m "message"</code> - Save your changes with a note</li>
            <li><code>git push</code> - Send changes to remote repository</li>
          </ul>
          <p>🌊 Pro tip: Think of commits like underwater snapshots of your project!</p>
        `,
      },
      docker: {
        first_container: `
          <h4>🐳 Docker Containers with Rina</h4>
          <p>Containers are like magical underwater habitats - each one is isolated but can communicate!</p>
          <ul>
            <li><code>docker run hello-world</code> - Test Docker installation</li>
            <li><code>docker ps</code> - See running containers</li>
            <li><code>docker images</code> - List available images</li>
            <li><code>docker stop [container]</code> - Stop a running container</li>
          </ul>
          <p>🫧 Think of it as creating perfect environments for your applications!</p>
        `,
      },
    };

    return (
      helpContent[tip.category]?.[tip.key] ||
      `<p>🧜‍♀️ This is a special tip from your underwater coding companion! 
            Let me know if you'd like to learn more about this topic.</p>`
    );
  }

  updateUserProfile(command, analysis, context) {
    // Update command history
    this.userProfile.command_history.push({
      command,
      timestamp: Date.now(),
      category: analysis.command_type,
      success: context.isSuccessfulCommand || false,
    });

    // Track first-time commands
    const commandBase = command.split(' ')[0];
    if (analysis.is_first_time) {
      this.userProfile.first_time_commands.add(commandBase);
    }

    // Update successful/failed commands
    if (context.isSuccessfulCommand) {
      this.userProfile.successful_commands.add(commandBase);
    } else if (context.errorOccurred) {
      this.userProfile.failed_commands.add(commandBase);
    }

    // Update experience level based on command usage
    this.updateExperienceLevel();

    // Save profile periodically
    if (this.userProfile.command_history.length % 10 === 0) {
      this.saveUserProfile();
    }
  }

  updateExperienceLevel() {
    const totalCommands = this.userProfile.command_history.length;
    const uniqueCommands = this.userProfile.successful_commands.size;
    const successRate =
      this.userProfile.successful_commands.size /
      (this.userProfile.successful_commands.size + this.userProfile.failed_commands.size);

    if (totalCommands < 50 || uniqueCommands < 10) {
      this.userProfile.experience_level = 'beginner';
    } else if (totalCommands < 200 || uniqueCommands < 25 || successRate < 0.8) {
      this.userProfile.experience_level = 'intermediate';
    } else {
      this.userProfile.experience_level = 'advanced';
    }
  }

  setupEventListeners() {
    // Listen for terminal commands
    if (typeof window !== 'undefined') {
      window.addEventListener('rina-command-executed', event => {
        this.analyzeCommand(event.detail.command, event.detail.context);
      });

      // Listen for command results
      window.addEventListener('rina-command-result', event => {
        const context = {
          isSuccessfulCommand: event.detail.success,
          errorOccurred: !event.detail.success,
          output: event.detail.output,
        };
        this.updateUserProfile(event.detail.command, {}, context);
      });
    }
  }

  loadUserProfile() {
    try {
      const saved = localStorage.getItem('rina-user-profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert Sets back from arrays
        parsed.first_time_commands = new Set(parsed.first_time_commands || []);
        parsed.successful_commands = new Set(parsed.successful_commands || []);
        parsed.failed_commands = new Set(parsed.failed_commands || []);
        parsed.tips_shown = new Map(parsed.tips_shown || []);
        parsed.tips_dismissed = new Set(parsed.tips_dismissed || []);

        this.userProfile = { ...this.userProfile, ...parsed };
      }
    } catch (error) {
      console.warn('Could not load user profile:', error);
    }
  }

  saveUserProfile() {
    try {
      // Convert Sets and Maps to arrays for JSON storage
      const toSave = {
        ...this.userProfile,
        first_time_commands: Array.from(this.userProfile.first_time_commands),
        successful_commands: Array.from(this.userProfile.successful_commands),
        failed_commands: Array.from(this.userProfile.failed_commands),
        tips_shown: Array.from(this.userProfile.tips_shown),
        tips_dismissed: Array.from(this.userProfile.tips_dismissed),
      };
      localStorage.setItem('rina-user-profile', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Could not save user profile:', error);
    }
  }

  // Public API methods
  triggerTip(command, context = {}) {
    return this.analyzeCommand(command, context);
  }

  getUserInsights() {
    return {
      experience_level: this.userProfile.experience_level,
      total_commands: this.userProfile.command_history.length,
      unique_commands: this.userProfile.successful_commands.size,
      success_rate:
        this.userProfile.successful_commands.size /
        Math.max(
          1,
          this.userProfile.successful_commands.size + this.userProfile.failed_commands.size
        ),
      session_duration: (Date.now() - this.userProfile.session_start) / 1000 / 60, // minutes
      most_used_categories: this.getMostUsedCategories(),
    };
  }

  getMostUsedCategories() {
    const categories = {};
    this.userProfile.command_history.forEach(entry => {
      entry.category.forEach(cat => {
        categories[cat] = (categories[cat] || 0) + 1;
      });
    });
    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => ({ category: cat, count }));
  }
}

// Global instance and API
let rinaTips;

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    rinaTips = new ContextualTipsSystem();
    window.rinaTips = rinaTips;

    console.log("🧜‍♀️ Rina's Contextual Tips System initialized!");
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContextualTipsSystem;
}

export default ContextualTipsSystem;

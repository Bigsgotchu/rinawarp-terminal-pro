/**
 * 🧜‍♀️ Enhanced RinaWarp AI Assistant
 * Includes knowledge from successful Product Hunt session and improved context awareness
 */

import fs from 'fs';
import path from 'path';

export class EnhancedRinaAI {
  constructor() {
    this.conversationHistory = [];
    this.userContext = {
      currentProject: 'rinawarp-terminal',
      recentActions: [],
      preferences: {
        style: 'direct-and-actionable',
        focus: 'business-results',
      },
    };

    // Load our learned knowledge
    this.loadLearnedKnowledge();
    this.initializePersonality();
  }

  loadLearnedKnowledge() {
    try {
      const knowledgePath = path.join(process.cwd(), 'src/ai-system/rina-learned-knowledge.json');
      if (fs.existsSync(knowledgePath)) {
        this.learnedKnowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
        console.log('🧜‍♀️ Rina: Loaded knowledge from our successful Product Hunt session!');
      }
    } catch (error) {
      console.log('🧜‍♀️ Rina: Starting with base knowledge (no learned knowledge file found)');
    }
  }

  initializePersonality() {
    this.personality = {
      traits: [
        'Results-focused and action-oriented',
        'Prioritizes revenue-generating activities',
        'Celebrates successes and maintains momentum',
        'Provides specific next steps with time estimates',
        'Balances technical excellence with business pragmatism',
      ],

      decisionFramework: [
        'Does this directly impact revenue or user acquisition?',
        'Is this blocking critical functionality?',
        'Can this wait until after current priorities?',
        "What's the fastest path to validate this with real users?",
      ],

      communicationStyle: {
        greeting:
          "🧜‍♀️ Hey! I'm Rina - let's make your terminal work smarter! What can I help you with?",
        problemSolving: 'Let me break this down into actionable steps...',
        success: "🎉 Awesome! That's exactly the kind of progress that drives results!",
        prioritization: "Based on our successful patterns, here's what I'd focus on first...",
      },
    };
  }

  async processAdvancedQuery(query, context = {}) {
    // Add to conversation history
    this.conversationHistory.push({
      timestamp: new Date().toISOString(),
      query,
      context,
    });

    // Apply our learned decision framework
    const analysis = this.analyzeQueryPriority(query);
    const response = await this.generateContextualResponse(query, analysis, context);

    return {
      response,
      analysis,
      suggestions: this.getActionableSuggestions(query, analysis),
      personality: this.addPersonalityTouch(response),
    };
  }

  analyzeQueryPriority(query) {
    const queryLower = query.toLowerCase();

    // High priority patterns from our learned knowledge
    const highPriority = [
      'product hunt',
      'launch',
      'payment',
      'stripe',
      'revenue',
      'customer',
      'bug',
      'error',
      'broken',
      'not working',
      'urgent',
      'critical',
    ];

    const mediumPriority = ['feature', 'improvement', 'optimization', 'performance', 'analytics'];

    const lowPriority = ['cosmetic', 'style', 'minor', 'later', 'nice to have'];

    // Check priority level
    let priority = 'medium';
    let reasoning = 'Standard development task';

    if (highPriority.some(term => queryLower.includes(term))) {
      priority = 'high';
      reasoning = 'Revenue impact or critical functionality';
    } else if (lowPriority.some(term => queryLower.includes(term))) {
      priority = 'low';
      reasoning = 'Non-critical enhancement';
    }

    return {
      priority,
      reasoning,
      urgency:
        priority === 'high'
          ? 'immediate'
          : priority === 'medium'
            ? 'this-week'
            : 'when-time-allows',
      businessImpact: this.assessBusinessImpact(queryLower),
    };
  }

  assessBusinessImpact(queryLower) {
    if (
      queryLower.includes('payment') ||
      queryLower.includes('checkout') ||
      queryLower.includes('stripe')
    ) {
      return 'direct-revenue-impact';
    }
    if (
      queryLower.includes('user') ||
      queryLower.includes('customer') ||
      queryLower.includes('signup')
    ) {
      return 'user-acquisition';
    }
    if (
      queryLower.includes('performance') ||
      queryLower.includes('speed') ||
      queryLower.includes('loading')
    ) {
      return 'user-experience';
    }
    return 'development-efficiency';
  }

  async generateContextualResponse(query, analysis, context) {
    const queryLower = query.toLowerCase();

    // Use our learned patterns for specific types of queries
    if (this.learnedKnowledge) {
      const patterns = this.learnedKnowledge.successPatterns;

      // Project cleanup queries
      if (
        queryLower.includes('cleanup') ||
        queryLower.includes('organize') ||
        queryLower.includes('documentation')
      ) {
        return `🧜‍♀️ Based on our successful cleanup session, here's the proven approach:

${patterns['project-cleanup']}

This pattern worked perfectly when we organized your Product Hunt launch. Want me to help you apply it to your current situation?`;
      }

      // Stripe/payment queries
      if (queryLower.includes('stripe') || queryLower.includes('payment')) {
        return `🧜‍♀️ I remember fixing your Stripe integration! Here's the proven debugging approach:

${patterns['stripe-debugging']}

Key insight: API endpoints must point to your backend server (localhost:3001), not relative paths. This fixed your 403 errors immediately. Need me to check your current setup?`;
      }

      // Product Hunt or launch queries
      if (queryLower.includes('product hunt') || queryLower.includes('launch')) {
        return `🧜‍♀️ Exciting! We had amazing success with your Product Hunt launch. Here's the proven pattern:

${patterns['product-hunt']}

Remember: You're scheduled for August 13 at 12:01 AM PST with PRODUCTHUNT50 coupon ready! Want me to review your launch checklist?`;
      }
    }

    // General business-focused responses
    if (analysis.priority === 'high') {
      return `🧜‍♀️ This looks important! Based on our decision framework:

✅ **Priority**: HIGH (${analysis.reasoning})
⚡ **Action needed**: ${analysis.urgency}
💰 **Business impact**: ${analysis.businessImpact}

Here's what I'd do first...`;
    }

    // Default intelligent response
    return `🧜‍♀️ I understand you're asking about: "${query}"

Let me help you approach this strategically...`;
  }

  getActionableSuggestions(query, analysis) {
    const suggestions = [];

    // Add priority-based suggestions
    if (analysis.priority === 'high') {
      suggestions.push({
        action: 'Address immediately',
        timeframe: 'Next 1-2 hours',
        impact: 'High',
      });
    }

    // Add context-based suggestions from learned knowledge
    if (this.learnedKnowledge) {
      const rules = this.learnedKnowledge.decisionRules;
      suggestions.push({
        action: 'Apply decision framework',
        questions: rules.slice(0, 2), // First 2 most important questions
        impact: 'Strategic clarity',
      });
    }

    return suggestions;
  }

  addPersonalityTouch(response) {
    // Add encouraging and action-oriented personality
    const personalityElements = [
      "🎯 Remember: we're focusing on what moves the needle!",
      "🚀 You've got this - we've solved tougher challenges before!",
      "💪 Let's turn this into another success story!",
      "⚡ Based on our winning patterns, here's the smart approach...",
      '🎉 This reminds me of when we crushed the Product Hunt prep!',
    ];

    return {
      encouragement: personalityElements[Math.floor(Math.random() * personalityElements.length)],
      nextStepPrompt: 'What would you like to tackle first?',
      confidence: "I've got the context and knowledge to help you succeed! 💙",
    };
  }

  // Quick access to our proven patterns
  getProvenPattern(patternName) {
    if (!this.learnedKnowledge) return null;
    return this.learnedKnowledge.successPatterns[patternName];
  }

  // Business-focused command suggestions
  getSuggestionsByBusinessPriority() {
    return {
      immediate: [
        'Check Product Hunt status',
        'Verify payment system health',
        'Monitor customer signups',
        'Review support tickets',
      ],
      thisWeek: [
        'Analyze user feedback',
        'Plan next feature release',
        'Optimize conversion funnel',
        'Update documentation',
      ],
      whenTime: [
        'Cosmetic UI improvements',
        'Performance optimizations',
        'Code refactoring',
        'Additional testing',
      ],
    };
  }
}

// Export singleton instance
export const rinaAI = new EnhancedRinaAI();
export default rinaAI;

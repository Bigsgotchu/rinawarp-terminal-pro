/**
 * RinaWarp Terminal AI Predictive Completion Plugin
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Provides predictive command completion using AI context-aware insights.
 * Now enhanced with OpenAI integration for better predictions.
 */

import { Plugin } from './plugin-loader.js';
import AdvancedAIContextEngine from '../ai/advanced-context-engine.js';
import { getCommandPrediction, explainCommand } from '../ai/openaiClient.js';

export class PredictiveCompletionPlugin extends Plugin {
  constructor() {
    super({
      name: 'PredictiveCompletion',
      version: '2.0.0',
      description: 'AI-based predictive command completion with OpenAI integration',
    });

    this.contextEngine = new AdvancedAIContextEngine();
    this.useOpenAI = true; // Flag to enable/disable OpenAI
    this.fallbackToLocal = true; // Use local AI as fallback
  }

  async initialize(_context) {
    console.log('🔮 Initializing Enhanced Predictive Completion Plugin...');
    
    // Test OpenAI connectivity
    try {
      await getCommandPrediction('test', 'initialization test');
      console.log('✅ OpenAI integration ready');
    } catch (error) {
      console.warn('⚠️ OpenAI unavailable, using local AI fallback:', error.message);
      this.useOpenAI = false;
    }
  }

  async execute(context) {
    const { terminal } = context;
    
    terminal.onInput(async input => {
      try {
        let suggestion = null;
        
        // Try OpenAI first if available
        if (this.useOpenAI && input.trim().length > 2) {
          try {
            const workingDir = context.workingDirectory || process.cwd();
            const contextInfo = `Working directory: ${workingDir}`;
            suggestion = await getCommandPrediction(input, contextInfo);
            
            if (suggestion && suggestion.trim()) {
              terminal.showSuggestion(suggestion.trim());
              return;
            }
          } catch (error) {
            console.warn('OpenAI prediction failed, falling back to local AI:', error.message);
            this.useOpenAI = false; // Temporarily disable for this session
          }
        }
        
        // Fallback to local AI context engine
        if (this.fallbackToLocal) {
          const analysis = await this.contextEngine.analyzeCommand(input, context);
          if (analysis.suggestions && analysis.suggestions.length > 0) {
            terminal.showSuggestion(analysis.suggestions[0].command);
          }
        }
      } catch (error) {
        console.error('Prediction error:', error.message);
      }
    });
    
    console.log('🔮 Enhanced Predictive Completion Plugin activated');
  }

  // Method to explain commands using OpenAI
  async explainCommand(command) {
    if (this.useOpenAI) {
      try {
        return await explainCommand(command);
      } catch (error) {
        console.warn('OpenAI explanation failed:', error.message);
      }
    }
    
    // Fallback explanation
    return `Command: ${command} - Use 'man ${command.split(' ')[0]}' for detailed information.`;
  }
}

export default PredictiveCompletionPlugin;

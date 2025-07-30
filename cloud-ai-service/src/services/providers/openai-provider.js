/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import OpenAI from 'openai';
import { logger } from '../../utils/logger.js';

export class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.name = 'OpenAI';
  }

  async initialize() {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-key') {
      logger.warn('OpenAI API key not configured');
      return false;
    }
    
    try {
      // Test the connection
      await this.client.models.list();
      logger.info('OpenAI provider initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize OpenAI provider', error);
      return false;
    }
  }

  async getCompletion(prompt, options = {}) {
    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a helpful AI assistant.',
    } = options;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI completion error', error);
      throw new Error(error);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a helpful AI assistant.',
    } = options;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('OpenAI streaming error', error);
      throw new Error(error);
    }
  }

  isAvailable() {
    return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-key';
  }
}

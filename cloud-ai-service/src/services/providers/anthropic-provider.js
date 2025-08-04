/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

export class AnthropicProvider {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.name = 'Anthropic';
  }

  async initialize() {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-key') {
      logger.warn('Anthropic API key not configured');
      return false;
    }

    logger.info('Anthropic provider initialized');
    return true;
  }

  async getCompletion(prompt, options = {}) {
    const {
      model = 'claude-3-sonnet-20240229',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a helpful AI assistant.',
    } = options;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      return response.content[0].text;
    } catch (error) {
      logger.error('Anthropic completion error', error);
      throw new Error(new Error(error));
    }
  }

  async *streamCompletion(prompt, options = {}) {
    const {
      model = 'claude-3-sonnet-20240229',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a helpful AI assistant.',
    } = options;

    try {
      const stream = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      logger.error('Anthropic streaming error', error);
      throw new Error(new Error(error));
    }
  }

  isAvailable() {
    return process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-key';
  }
}

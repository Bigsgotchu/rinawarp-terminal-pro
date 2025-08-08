import express from 'express';
import { logger } from '../../../src/utilities/logger.js';

const router = express.Router();

// This will be set by the main app
let aiOrchestrator = null;

export function setAIOrchestrator(orchestrator) {
  aiOrchestrator = orchestrator;
}

router.get('/providers', async (req, res) => {
  try {
    const providers = aiOrchestrator.getAvailableProviders();
    res.json({ providers });
  } catch (error) {
    logger.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.post('/completion', async (req, res) => {
  try {
    const { prompt, provider, model, temperature, maxTokens, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await aiOrchestrator.getCompletion(prompt, {
      provider,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      userId: req.user?.id || 'anonymous',
    });

    res.json({
      response,
      provider: aiOrchestrator.selectProvider(provider),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Completion error:', error);
    res.status(500).json({ error: 'Failed to generate completion' });
  }
});

router.post('/stream', async (req, res) => {
  try {
    const { prompt, provider, model, temperature, maxTokens, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = aiOrchestrator.streamCompletion(prompt, {
      provider,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      userId: req.user?.id || 'anonymous',
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    logger.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to stream response' })}\n\n`);
    res.end();
  }
});

export default router;

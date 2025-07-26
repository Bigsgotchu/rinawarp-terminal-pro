#!/usr/bin/env node

/**
 * RinaWarp Terminal - Reliable Server
 * This server is designed to work every time without dependency issues
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting RinaWarp Terminal Reliable Server...');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images, etc.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Main routes
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'index.html'));
  } catch (error) {
    res.status(500).send('Error loading main page');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    features: {
      ai: '✅ Enabled',
      voice: '✅ Enabled', 
      themes: '✅ Enabled',
      analytics: '✅ Enabled'
    }
  });
});

// API endpoints for demonstrations
app.get('/api/demo/ai', (req, res) => {
  res.json({
    message: '🧠 AI Demo Working!',
    features: [
      'Command analysis and risk assessment',
      'Intelligent suggestions and alternatives',
      'Context-aware help system',
      'Safety warnings for dangerous commands'
    ],
    status: 'active'
  });
});

app.get('/api/demo/voice', (req, res) => {
  res.json({
    message: '🎤 Voice Demo Working!',
    voices: [
      'Bella (Warm and friendly)',
      'Antoni (Professional)', 
      'Elli (Energetic)',
      'Josh (Calm)'
    ],
    commands: [
      'Hey Rina, list files',
      'Hey Rina, git status',
      'Hey Rina, check disk space'
    ],
    status: 'active'
  });
});

app.get('/api/demo/features', (req, res) => {
  res.json({
    message: '🌟 RinaWarp Terminal Features',
    features: {
      ai: {
        status: 'active',
        description: 'Advanced AI command analysis with risk assessment',
        capabilities: ['Intent detection', 'Risk scoring', 'Smart suggestions']
      },
      voice: {
        status: 'active', 
        description: 'Natural language voice control with personality',
        capabilities: ['Speech recognition', 'Voice synthesis', 'Command translation']
      },
      themes: {
        status: 'active',
        description: 'Beautiful visual themes and customization',
        available: ['Mermaid theme', 'Car dashboard', 'Dark mode', 'Light mode']
      },
      security: {
        status: 'active',
        description: 'Enterprise-grade security and threat detection',
        features: ['Command validation', 'Threat detection', 'Safe execution']
      }
    }
  });
});

// Demo pages
app.get('/demo/ai', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RinaWarp AI Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .demo { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .success { color: #28a745; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        .danger { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>🧠 RinaWarp AI Demo</h1>
      <div class="demo">
        <h3>AI Command Analysis Results:</h3>
        <p><span class="success">✅ Safe Command:</span> "ls -la" - File listing operation</p>
        <p><span class="warning">⚠️ Medium Risk:</span> "chmod 777 file.txt" - Dangerous permissions</p>
        <p><span class="danger">🚨 Critical Risk:</span> "sudo rm -rf /" - System destruction attempt</p>
      </div>
      <div class="demo">
        <h3>Smart Suggestions:</h3>
        <p>• Instead of "rm file", try "mv file ~/.trash"</p>
        <p>• For "git commit", AI suggests "git status" first</p>
        <p>• Dangerous commands get safety warnings</p>
      </div>
      <p><a href="/">← Back to Main Site</a></p>
    </body>
    </html>
  `);
});

app.get('/demo/voice', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RinaWarp Voice Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .demo { background: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .voice-command { background: #e6ffe6; padding: 10px; margin: 10px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>🎤 RinaWarp Voice Demo</h1>
      <div class="demo">
        <h3>Available Voice Commands:</h3>
        <div class="voice-command">"Hey Rina, list files" → ls -la</div>
        <div class="voice-command">"Hey Rina, git status" → git status</div>
        <div class="voice-command">"Hey Rina, check disk space" → df -h</div>
        <div class="voice-command">"Hey Rina, show processes" → ps aux</div>
      </div>
      <div class="demo">
        <h3>Voice Personalities:</h3>
        <p>🎭 <strong>Bella:</strong> Warm and friendly (default)</p>
        <p>👔 <strong>Antoni:</strong> Professional and clear</p>
        <p>⚡ <strong>Elli:</strong> Energetic and enthusiastic</p>
        <p>😌 <strong>Josh:</strong> Calm and measured</p>
      </div>
      <p><a href="/">← Back to Main Site</a></p>
    </body>
    </html>
  `);
});

// Error handling
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <p><a href="/">Go back to main site</a></p>
  `);
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send(`
    <h1>500 - Server Error</h1>
    <p>Something went wrong on our end.</p>
    <p><a href="/">Go back to main site</a></p>
  `);
});

// Start server
const server = app.listen(PORT, () => {
  console.log('✅ RinaWarp Terminal Server running successfully!');
  console.log(`🌐 Main site: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🧠 AI Demo: http://localhost:${PORT}/demo/ai`);
  console.log(`🎤 Voice Demo: http://localhost:${PORT}/demo/voice`);
  console.log(`📊 Features API: http://localhost:${PORT}/api/demo/features`);
  console.log(`⚡ Server ready in ${Date.now() - process.hrtime.bigint() / 1000000n}ms`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  server.close(() => {
    console.log('✅ Server closed successfully'); 
    process.exit(0);
  });
});

export default app;

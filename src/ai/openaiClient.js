/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if API key is available
const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';

// Initialize OpenAI client with newer API (only if API key is available)
const openai = hasApiKey
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  : null;

// Fallback responses for when OpenAI is not available
const fallbackResponses = {
  commandPredictions: {
    'list files': 'ls -la',
    'show files': 'ls',
    'current directory': 'pwd',
    'change directory': 'cd',
    git: 'git status',
    npm: 'npm --help',
    node: 'node --version',
    test: 'npm test',
  },
  explanations: {
    'ls -la':
      'Lists all files and directories in the current directory with detailed information including hidden files.',
    'git status':
      'Shows the current state of your Git repository, including staged, unstaged, and untracked files.',
    'npm test': 'Runs the test script defined in package.json to execute your project tests.',
    pwd: 'Prints the current working directory path.',
  },
};

function findBestMatch(input, dictionary) {
  const lowerInput = input.toLowerCase();
  for (const [key, value] of Object.entries(dictionary)) {
    if (lowerInput.includes(key)) {
      return value;
    }
  }
  return null;
}

/**
 * Generate command predictions using OpenAI GPT
 * @param {string} prompt - The command or natural language input
 * @param {string} context - Optional context about the current directory/environment
 * @returns {Promise<string>} - Predicted command or suggestion
 */
export async function getCommandPrediction(prompt, context = '') {
  // If OpenAI is not available, use fallback
  if (!openai) {
    const fallback = findBestMatch(prompt, fallbackResponses.commandPredictions);
    if (fallback) {
      return fallback;
    }
    return `# AI not available - try: ${prompt.includes('git') ? 'git status' : 'ls'}`;
  }

  try {
    const fullPrompt = `${context ? `Context: ${context}\n` : ''}Command prediction for: "${prompt}"\n\nSuggest the most appropriate terminal command:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a terminal command assistant. Provide accurate, safe terminal commands based on user input. Only return the command, no explanations unless asked.',
        },
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error fetching command prediction:', error.message);
    // Fallback to local suggestions on error
    const fallback = findBestMatch(prompt, fallbackResponses.commandPredictions);
    if (fallback) {
      return fallback;
    }
    throw new Error(new Error(`Failed to fetch prediction: ${error.message}`));
  }
}

/**
 * Get workflow automation suggestions based on command history
 * @param {Array<string>} commandHistory - Recent command history
 * @returns {Promise<object>} - Automation suggestions
 */
export async function getWorkflowAutomation(commandHistory) {
  // If OpenAI is not available, provide basic suggestions
  if (!openai) {
    const suggestions = [];
    if (commandHistory.includes('npm install') && commandHistory.includes('npm test')) {
      suggestions.push({
        type: 'script',
        description: 'Create a deployment script',
        command: 'npm run deploy',
        automation: 'npm install && npm test && npm run build',
      });
    }
    return { suggestions, fallback: true };
  }

  try {
    const historyText = commandHistory.join('\n');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a workflow automation assistant. Analyze command patterns and suggest automation opportunities. Return JSON format with suggestions.',
        },
        {
          role: 'user',
          content: `Analyze this command history and suggest automation opportunities:\n${historyText}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error fetching workflow automation:', error.message);
    return { suggestions: [], error: error.message };
  }
}

/**
 * Explain what a command does in natural language
 * @param {string} command - The command to explain
 * @returns {Promise<string>} - Natural language explanation
 */
export async function explainCommand(command) {
  // If OpenAI is not available, use fallback explanations
  if (!openai) {
    const fallback = findBestMatch(command, fallbackResponses.explanations);
    if (fallback) {
      return fallback;
    }
    return `Command: ${command} - Use 'man ${command.split(' ')[0]}' for detailed information. (AI assistant not available)`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a terminal command explainer. Provide clear, concise explanations of what commands do, including potential risks if applicable.',
        },
        {
          role: 'user',
          content: `Explain this command: ${command}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error explaining command:', error.message);
    // Fallback to local explanations on error
    const fallback = findBestMatch(command, fallbackResponses.explanations);
    if (fallback) {
      return fallback;
    }
    throw new Error(new Error(`Failed to explain command: ${error.message}`));
  }
}

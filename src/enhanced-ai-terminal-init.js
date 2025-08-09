/**
 * Enhanced AI Terminal Initialization Script
 * Integrates the Enhanced Development Assistant with the main terminal
 */

(async function () {
  try {
    console.log('🚀 Starting Enhanced AI Terminal initialization...');

    // Wait for required dependencies
    await waitForDependencies(['terminal', 'shellHarness', 'terminalWrapper']);

    // Check if user has access to enhanced AI features
    const userTier = getUserTier();
    const { hasFeature } = await import('./config/pricing-tiers.js');

    if (!hasFeature(userTier, 'ai_advanced')) {
      console.log('🧜‍♀️ Enhanced AI requires Professional tier - using basic mode');
      updateStatus('💎 Upgrade to Professional for Enhanced AI features');
      return;
    }

    // Initialize Enhanced AI Integration with fallback support
    let EnhancedAIIntegration, WarpAgentIntegration;

    try {
      // Try to load the full enhanced AI system
      const aiModule = await import('./ai-system/enhanced-ai-integration.js');
      EnhancedAIIntegration = aiModule.EnhancedAIIntegration;
    } catch (error) {
      console.warn('⚠️ Full Enhanced AI not available, using fallback:', error.message);
      // Use browser-compatible fallback
      const fallbackModule = await import('./ai-system/browser-compatible-fallback.js');
      EnhancedAIIntegration = fallbackModule.EnhancedAIIntegration;
    }

    try {
      // Try to load Warp Agent Integration
      const warpModule = await import('./ai-system/warp-agent-integration.js');
      WarpAgentIntegration = warpModule.WarpAgentIntegration;
    } catch (error) {
      console.warn('⚠️ Warp Agent not available, using fallback:', error.message);
      const fallbackModule = await import('./ai-system/browser-compatible-fallback.js');
      WarpAgentIntegration = fallbackModule.WarpAgentIntegration;
    }

    const enhancedAI = new EnhancedAIIntegration(window.terminalState.terminal, {
      enableEnhancedMode: true,
      fallbackToBasic: true,
      autoContextGathering: true,
      contextMemory: 15,
    });

    const warpAgent = new WarpAgentIntegration(window.terminalState.terminal, {
      preserveRinaUI: true,
      agentPersonality: 'rina-friendly',
      enableTools: true,
      contextMemory: 50,
    });

    const initialized = await enhancedAI.initialize();

    // Initialize Warp Agent (runs alongside enhanced AI)
    let warpAgentReady = false;
    try {
      warpAgentReady = await warpAgent.initialize();
      if (warpAgentReady) {
        window.rinaWarpAgent = warpAgent;
        console.log('✅ Warp Agent integration active - same AI capabilities as Warp!');
      }
    } catch (error) {
      console.warn('⚠️ Warp Agent initialization failed:', error);
    }

    if (initialized) {
      // Store references globally
      window.enhancedAI = enhancedAI;
      window.warpAgent = warpAgent;

      // Integrate with existing AI system
      const originalProcessAICommand = window.processAICommand;

      window.processAICommand = async function () {
        const input = document.getElementById('aiInput').value.trim();
        const responseDiv = document.getElementById('aiResponse');

        if (!input) {
          responseDiv.innerHTML =
            '🧜‍♀️ <em>*flips tail impatiently*</em> Come on darling, give me something to work with!';
          return;
        }

        // Show processing
        responseDiv.innerHTML = '🌊 <em>Swimming through the enhanced data currents...</em>';

        try {
          // Check if this should use enhanced AI
          const shouldUseEnhanced = enhancedAI.shouldUseEnhancedMode(input);

          if (shouldUseEnhanced) {
            console.log('🧠 Using Enhanced Development Assistant for:', input);

            const context = await gatherTerminalContext();
            const result = await enhancedAI.processEnhancedRequest(input, context);

            // Display enhanced response
            displayEnhancedResponse(result, responseDiv);

            // Execute commands if applicable
            if (result.type === 'program_generation' && result.response.includes('```')) {
              await offerCodeExecution(result);
            }
          } else {
            // Fall back to original implementation
            if (originalProcessAICommand) {
              await originalProcessAICommand.call(this);
            } else {
              // Basic fallback
              const match = findBestMatch(input);
              if (match) {
                responseDiv.innerHTML = `
                                    <div>🧜‍♀️ Mermaid AI: "${match.phrase}" → <code>${match.command}</code></div>
                                    <div style="margin-top: 5px; color: #74c0fc;">✨ Making waves with this command...</div>
                                `;

                if (window.terminalState.shellHarness) {
                  await window.terminalState.shellHarness.execute(match.command);
                  window.terminalState.terminal.write(
                    `\r\n🧜‍♀️ Mermaid AI Command: ${match.command}\r\n`
                  );
                }
              } else {
                responseDiv.innerHTML = `
                                    <div style="color: #FF1493;">🧜‍♀️ <em>*adjusts seashell crown*</em> Sorry sweetie, "${input}" isn't in my underwater vocabulary!</div>
                                    <div style="color: #ffd93d; margin-top: 10px;">🐚 Try asking about: git, docker, npm, files, or system info</div>
                                `;
              }
            }
          }
        } catch (error) {
          console.error('Enhanced AI processing error:', error);
          responseDiv.innerHTML = `
                        <div style="color: #FF6B6B;">🧜‍♀️ <em>*bubbles of confusion*</em> Even enhanced mermaids have off days!</div>
                        <div style="color: #FFD93D; margin-top: 5px;">Error: ${error.message}</div>
                    `;
        }

        // Clear input
        document.getElementById('aiInput').value = '';
      };

      // Add enhanced commands to UI
      addEnhancedUIControls();

      console.log('✅ Enhanced AI Terminal integration complete!');
      updateStatus('🧠 Enhanced AI Development Assistant ready!');
    } else {
      console.warn('⚠️ Enhanced AI initialization failed, using fallback mode');
      updateStatus('⚠️ Enhanced AI unavailable - using basic mode');
    }
  } catch (error) {
    console.error('❌ Enhanced AI Terminal initialization failed:', error);
    updateStatus('❌ Enhanced AI failed to initialize');
  }
})();

function getUserTier() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userTier') || 'free';
  }
  return process.env.USER_TIER || 'free';
}

// Helper Functions

async function waitForDependencies(deps) {
  const maxWait = 10000; // 10 seconds
  const interval = 100;
  let elapsed = 0;

  while (elapsed < maxWait) {
    const allReady = deps.every(dep => {
      switch (dep) {
        case 'terminal':
          return window.terminalState && window.terminalState.terminal;
        case 'shellHarness':
          return window.terminalState && window.terminalState.shellHarness;
        case 'terminalWrapper':
          return window.terminalState && window.terminalState.terminalWrapper;
        default:
          return window[dep];
      }
    });

    if (allReady) {
      console.log(`✅ All dependencies ready: ${deps.join(', ')}`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
    elapsed += interval;
  }

  console.warn(`⚠️ Some dependencies not ready after ${maxWait}ms: ${deps.join(', ')}`);
}

async function gatherTerminalContext() {
  const context = {
    timestamp: new Date().toISOString(),
  };

  // Get current directory
  try {
    if (window.terminalState.shellHarness) {
      const dirResult = await window.terminalState.shellHarness.execute('pwd', { silent: true });
      context.currentDirectory = dirResult.stdout || '~';
    }
  } catch (error) {
    // Fallback to home directory in browser context
    context.currentDirectory = '~';
  }

  // Get terminal history if available
  if (window.commandHistory && window.commandHistory.getHistory) {
    context.recentCommands = window.commandHistory.getHistory().slice(-5);
  }

  // Get git status if available
  try {
    if (window.terminalState.shellHarness) {
      const gitResult = await window.terminalState.shellHarness.execute('git status --porcelain', {
        silent: true,
      });
      context.gitStatus = {
        hasChanges: gitResult.stdout && gitResult.stdout.trim().length > 0,
        status: gitResult.stdout,
      };
    }
  } catch (error) {
    // Not a git repository or git not available
    context.gitStatus = null;
  }

  return context;
}

function displayEnhancedResponse(result, responseDiv) {
  let html = `<div style="color: #FF1493; font-weight: bold;">${result.response}</div>`;

  // Add confidence indicator
  if (result.confidence) {
    const confidenceColor =
      result.confidence > 0.8 ? '#00FF88' : result.confidence > 0.5 ? '#FFD93D' : '#FF6B6B';
    html += `<div style="color: ${confidenceColor}; font-size: 12px; margin-top: 5px;">
                    🎯 Confidence: ${Math.round(result.confidence * 100)}%
                 </div>`;
  }

  // Add source information
  if (result.source) {
    html += `<div style="color: #00AAFF; font-size: 12px; margin-top: 5px;">
                    🧠 Source: ${result.source}
                 </div>`;
  }

  // Add type information
  if (result.type) {
    const typeEmojis = {
      code_analysis: '🔍',
      debugging: '🐛',
      program_generation: '⚡',
      architecture: '🏗️',
      explanation: '📚',
    };
    const emoji = typeEmojis[result.type] || '🤖';
    html += `<div style="color: #8A2BE2; font-size: 11px; margin-top: 5px;">
                    ${emoji} Type: ${result.type.replace('_', ' ')}
                 </div>`;
  }

  // Add suggestions
  if (result.suggestions && result.suggestions.length > 0) {
    html += `<div style="color: #00FF88; margin-top: 10px;">
                    <strong>💡 Suggestions:</strong><br>
                    ${result.suggestions
                      .slice(0, 3)
                      .map(s => `• ${s}`)
                      .join('<br>')}
                 </div>`;
  }

  responseDiv.innerHTML = html;

  // Add visual feedback
  responseDiv.style.border = '2px solid #00FF88';
  setTimeout(() => {
    responseDiv.style.border = '1px solid rgba(255,20,147,0.3)';
  }, 2000);
}

async function offerCodeExecution(result) {
  if (!result.response.includes('```')) return;

  // Extract code blocks
  const codeBlocks = result.response.match(/```[\s\S]*?```/g);
  if (!codeBlocks) return;

  const shouldExecute = confirm(
    '🧜‍♀️ I generated some code! Would you like me to save it to a file or execute it?'
  );

  if (shouldExecute) {
    const action = prompt(
      'Choose action:\n1. Save to file\n2. Execute (if script)\n3. Copy to clipboard\n\nEnter 1, 2, or 3:'
    );

    const code = codeBlocks[0]
      .replace(/```\w*\n?/, '')
      .replace(/```$/, '')
      .trim();

    switch (action) {
      case '1':
        await saveGeneratedCode(code, result);
        break;
      case '2':
        await executeGeneratedCode(code, result);
        break;
      case '3':
        await copyToClipboard(code);
        break;
    }
  }
}

async function saveGeneratedCode(code, result) {
  const filename = prompt('Enter filename (with extension):') || 'generated_code.txt';

  try {
    // Use the file system API if available
    if (window.terminalState.shellHarness) {
      const command = `echo "${code.replace(/"/g, '\\"')}" > "${filename}"`;
      await window.terminalState.shellHarness.execute(command);
      window.terminalState.terminal.write(`\r\n✅ Code saved to ${filename}\r\n`);
    } else {
      // Fallback: offer download
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    updateStatus(`💾 Code saved as ${filename}`);
  } catch (error) {
    console.error('Failed to save code:', error);
    alert('Failed to save code: ' + error.message);
  }
}

async function executeGeneratedCode(code, result) {
  try {
    // Determine execution method based on code type
    let command;

    if (code.includes('#!/bin/bash') || result.type === 'bash') {
      command = `bash -c "${code.replace(/"/g, '\\"')}"`;
    } else if (code.includes('#!/usr/bin/env python') || result.type === 'python') {
      command = `python -c "${code.replace(/"/g, '\\"')}"`;
    } else if (code.includes('#!/usr/bin/env node') || result.type === 'javascript') {
      command = `node -e "${code.replace(/"/g, '\\"')}"`;
    } else {
      // Save as temporary file and execute
      const tempFile = 'temp_generated_script.ps1';
      await window.terminalState.shellHarness.execute(
        `echo "${code.replace(/"/g, '\\"')}" > ${tempFile}`
      );
      command = `./${tempFile}`;
    }

    if (window.terminalState.shellHarness) {
      await window.terminalState.shellHarness.execute(command);
      window.terminalState.terminal.write('\r\n⚡ Executed generated code\r\n');
    }

    updateStatus('⚡ Generated code executed');
  } catch (error) {
    console.error('Failed to execute code:', error);
    alert('Failed to execute code: ' + error.message);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    updateStatus('📋 Code copied to clipboard');
    alert('✅ Code copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback: select text in a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('✅ Code copied to clipboard (fallback method)');
  }
}

function addEnhancedUIControls() {
  // Add enhanced mode toggle button
  const controls = document.querySelector('.controls');
  if (controls) {
    const enhancedModeBtn = document.createElement('button');
    enhancedModeBtn.innerHTML = '🧠 Enhanced Mode';
    enhancedModeBtn.onclick = function () {
      if (window.enhancedAI) {
        const isActive = window.enhancedAI.isEnhancedMode;
        if (isActive) {
          window.enhancedAI.isEnhancedMode = false;
          this.innerHTML = '🧠 Enhanced Mode: OFF';
          this.style.opacity = '0.7';
          updateStatus('🧜‍♀️ Enhanced mode disabled - using basic AI');
        } else {
          window.enhancedAI.isEnhancedMode = true;
          this.innerHTML = '🧠 Enhanced Mode: ON';
          this.style.opacity = '1';
          updateStatus('🧠 Enhanced Development Assistant activated!');
        }
      }
    };

    // Style the button
    enhancedModeBtn.style.background = 'linear-gradient(45deg, #8A2BE2, #FF1493, #00AAFF)';
    controls.appendChild(enhancedModeBtn);

    // Add quick analysis button
    const quickAnalysisBtn = document.createElement('button');
    quickAnalysisBtn.innerHTML = '🔍 Quick Analysis';
    quickAnalysisBtn.onclick = function () {
      if (window.enhancedAI && window.enhancedAI.isEnhancedMode) {
        const input = prompt(
          '🧜‍♀️ What would you like me to analyze?\n\nExamples:\n• Analyze the current project structure\n• Debug this error: [paste error]\n• Review the code in main.js\n• Explain how this algorithm works'
        );
        if (input) {
          document.getElementById('aiInput').value = input;
          window.processAICommand();
        }
      } else {
        alert('🧠 Please enable Enhanced Mode first!');
      }
    };
    controls.appendChild(quickAnalysisBtn);

    // Add program generator button
    const generateBtn = document.createElement('button');
    generateBtn.innerHTML = '⚡ Generate';
    generateBtn.onclick = function () {
      if (window.enhancedAI && window.enhancedAI.isEnhancedMode) {
        const input = prompt(
          '🧜‍♀️ What would you like me to generate?\n\nExamples:\n• Create a Python web scraper\n• Write a React component for user login\n• Generate a bash script to backup files\n• Build a simple REST API in Node.js'
        );
        if (input) {
          document.getElementById('aiInput').value = `generate ${input}`;
          window.processAICommand();
        }
      } else {
        alert('🧠 Please enable Enhanced Mode first!');
      }
    };
    controls.appendChild(generateBtn);
  }
}

function updateStatus(message) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
  }
  console.log('[Enhanced AI Status]', message);
}

// Basic AI command matching function
function findBestMatch(input) {
  const basicCommands = [
    { phrase: ['list files', 'show files', 'ls'], command: 'ls -la' },
    { phrase: ['current directory', 'where am i', 'pwd'], command: 'pwd' },
    { phrase: ['git status', 'git info'], command: 'git status' },
    { phrase: ['git log', 'commit history'], command: 'git log --oneline' },
    { phrase: ['npm install', 'install packages'], command: 'npm install' },
    { phrase: ['npm start', 'run npm'], command: 'npm start' },
    { phrase: ['docker ps', 'running containers'], command: 'docker ps' },
    { phrase: ['system info', 'system status'], command: 'uname -a' },
    { phrase: ['disk space', 'disk usage'], command: 'df -h' },
    { phrase: ['memory usage', 'ram usage'], command: 'free -h' },
  ];

  const inputLower = input.toLowerCase();

  for (const cmd of basicCommands) {
    for (const phrase of cmd.phrase) {
      if (inputLower.includes(phrase)) {
        return { phrase, command: cmd.command };
      }
    }
  }

  return null;
}

// Global processAICommand function (fallback version)
window.processAICommand =
  window.processAICommand ||
  function () {
    const input = document.getElementById('aiInput')?.value?.trim();
    const responseDiv = document.getElementById('aiResponse');

    if (!input) {
      if (responseDiv) {
        responseDiv.innerHTML =
          '🧜‍♀️ <em>*flips tail impatiently*</em> Come on darling, give me something to work with!';
      }
      return;
    }

    const match = findBestMatch(input);
    if (match && responseDiv) {
      responseDiv.innerHTML = `
            <div>🧜‍♀️ Mermaid AI: "${match.phrase}" → <code>${match.command}</code></div>
            <div style="margin-top: 5px; color: #74c0fc;">✨ Making waves with this command...</div>
        `;

      if (window.terminalState?.shellHarness) {
        window.terminalState.shellHarness.execute(match.command);
        window.terminalState.terminal.write(`\r\n🧜‍♀️ Mermaid AI Command: ${match.command}\r\n`);
      }
    } else if (responseDiv) {
      responseDiv.innerHTML = `
            <div style="color: #FF1493;">🧜‍♀️ <em>*adjusts seashell crown*</em> Sorry sweetie, "${input}" isn't in my underwater vocabulary!</div>
            <div style="color: #ffd93d; margin-top: 10px;">🐚 Try asking about: git, docker, npm, files, or system info</div>
        `;
    }

    // Clear input
    const inputEl = document.getElementById('aiInput');
    if (inputEl) inputEl.value = '';
  };

import logger from './utilities/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Terminal Functions Fix - Expose all required functions globally

// Store references to important objects
window.terminalState = {
  terminal: null,
  shellHarness: null,
  voiceEngine: null,
  advancedVoiceRecognition: null,
  isVoiceOutputEnabled: false,
};

// Voice Output Toggle
window.toggleVoiceOutput = function () {
  window.terminalState.isVoiceOutputEnabled = !window.terminalState.isVoiceOutputEnabled;
  const btn = document.getElementById('voiceOutputBtn');
  if (btn) {
    btn.textContent = window.terminalState.isVoiceOutputEnabled
      ? '🔊 Voice Output: ON'
      : '🔊 Voice Output: OFF';
  }
};

// Start Voice Control
window.startVoiceControl = async function () {
  console.log(
    'advancedVoiceRecognition from terminalState:',
    window.terminalState.advancedVoiceRecognition
  );
  const statusEl = document.getElementById('status');

  // Try to find advancedVoiceRecognition from multiple sources
  const voiceRecognition =
    window.terminalState.advancedVoiceRecognition || window.advancedVoiceRecognition;

  if (!voiceRecognition) {
    if (statusEl)
      statusEl.textContent = '❌ Voice systems not initialized. Please refresh the page.';
    console.error('No voice recognition found in terminalState or window');
    return;
  }

  try {
    // Check available methods
    console.log(
      'Voice recognition methods:',
      Object.getOwnPropertyNames(Object.getPrototypeOf(voiceRecognition))
    );

    // The AdvancedVoiceRecognition uses start() not startListening()
    if (typeof voiceRecognition.start === 'function') {
      await voiceRecognition.start();
      if (statusEl) statusEl.textContent = '🎤 Voice control starting...';
    } else if (typeof voiceRecognition.startListening === 'function') {
      await voiceRecognition.startListening();
      if (statusEl) statusEl.textContent = '🎤 Listening for voice commands...';
    } else {
      throw new Error('Voice recognition object has no start method');
    }
  } catch (error) {
    console.error('Failed to start voice control:', error);
    if (statusEl) statusEl.textContent = '❌ Voice control failed: ' + error.message;
  }
};

// Show AI Help
window.showAIHelp = function () {
  const responseDiv = document.getElementById('aiResponse');
  if (responseDiv) {
    responseDiv.innerHTML = `
            <div style="color: #00ff88; font-weight: bold;">🧜‍♀️ Mermaid AI Commands:</div>
            <div style="margin-top: 10px; color: #74c0fc;">
                <strong>Git Commands:</strong><br>
                • "show git status" → git status<br>
                • "what changes did I make" → git diff<br>
                • "show commit history" → git log --oneline<br><br>
                
                <strong>File Operations:</strong><br>
                • "list files" → ls -la<br>
                • "show current directory" → pwd<br>
                • "create new folder" → mkdir<br><br>
                
                <strong>System Info:</strong><br>
                • "system info" → uname -a<br>
                • "disk usage" → df -h<br>
                • "memory usage" → free -m<br><br>
                
                <strong>Development:</strong><br>
                • "start npm project" → npm init<br>
                • "install dependencies" → npm install<br>
                • "docker containers" → docker ps
            </div>
        `;
  }
};

// Run Command
window.runCommand = async function () {
  const cmd = await new Promise(resolve => {
    const inputModal = document.createElement('div');
    inputModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;
    inputModal.innerHTML = `
            <div style="background: #2d2d2d; padding: 30px; border-radius: 10px; max-width: 400px; width: 100%; text-align: center;">
                <h4 style="color: #00ff88; margin-top: 0;">Enter Command</h4>
                <input type="text" id="commandInput" style="width: 80%; padding: 10px; margin-bottom: 10px; background: #444; color: white; border: 1px solid #666; border-radius: 5px;">
                <button id="runCmdButton" style="padding: 10px 20px; background: #007acc; color: white; border: none; border-radius: 5px; cursor: pointer;">Run</button>
                <button id="closeCmdButton" style="padding: 10px 20px; background: #999; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
        `;
    document.body.appendChild(inputModal);

    document.getElementById('commandInput').focus();

    document.getElementById('runCmdButton').onclick = () => {
      const command = document.getElementById('commandInput').value;
      document.body.removeChild(inputModal);
      resolve(command);
    };

    document.getElementById('closeCmdButton').onclick = () => {
      document.body.removeChild(inputModal);
      resolve(null);
    };

    // Handle enter key
    document.getElementById('commandInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const command = document.getElementById('commandInput').value;
        document.body.removeChild(inputModal);
        resolve(command);
      }
    });
  });

  if (cmd && window.terminalState.shellHarness && window.terminalState.terminal) {
    try {
      await window.terminalState.shellHarness.execute(cmd);
      window.terminalState.terminal.write(`\r\n⚡ Quick Command: ${cmd}\r\n`);
    } catch (execError) {
      console.error('Quick command execution failed:', execError);
      if (window.terminalState.terminal) {
        window.terminalState.terminal.write(
          `\r\n❌ Command execution failed: ${execError.message}\r\n`
        );
      }
    }
  }
};

// Clear Terminal
window.clearTerminal = function () {
  if (window.terminalState.terminal) {
    window.terminalState.terminal.clear();
    window.terminalState.terminal.write('🧹 Terminal cleared\r\n\r\n');
  }
};

// Show Features
window.showFeatures = function () {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

  modal.innerHTML = `
        <div style="
            background: #2d2d2d; padding: 30px; border-radius: 10px;
            max-width: 600px; max-height: 80%; overflow-y: auto;
            border: 2px solid #555;
        ">
            <h2 style="color: #00ff88; margin-top: 0;">✨ RinaWarp Terminal Features</h2>
            
            <div class="feature-grid">
                <div class="feature-card">
                    <h4>🤖 AI Assistant</h4>
                    <p>Natural language commands</p>
                </div>
                <div class="feature-card">
                    <h4>🎤 Voice Control</h4>
                    <p>Talk to your terminal</p>
                </div>
                <div class="feature-card">
                    <h4>⚡ Multi-Platform</h4>
                    <p>Works on Windows, Mac, Linux</p>
                </div>
                <div class="feature-card">
                    <h4>🎨 Modern UI</h4>
                    <p>Beautiful interface</p>
                </div>
            </div>
            
            <h3 style="color: #74c0fc;">🚀 Coming Soon:</h3>
            <ul style="color: #ffd93d;">
                <li>Cloud sync across devices</li>
                <li>Team collaboration features</li>
                <li>Advanced AI workflows</li>
                <li>Custom themes and plugins</li>
            </ul>
            
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: #007acc; 
                           color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;

  document.body.appendChild(modal);

  // Close on click outside
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.remove();
    }
  });
};

// Configure ElevenLabs
window.configureElevenLabs = async function () {
  try {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      alert('ElevenLabs configuration is not available in this context');
      return;
    }

    // Load the ElevenLabs configuration via IPC
    const currentConfig = await window.electronAPI.loadElevenLabsConfig();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;

    modal.innerHTML = `
            <div style="
                background: #2d2d2d; padding: 30px; border-radius: 10px;
                max-width: 500px; width: 90%; border: 2px solid #555;
            ">
                <h2 style="color: #00ff88; margin-top: 0;">🎤 ElevenLabs Configuration</h2>
                
                <div style="margin: 20px 0;">
                    <label style="color: #fff; display: block; margin-bottom: 10px;">API Key:</label>
                    <input type="password" id="elevenLabsApiKey" 
                           placeholder="Enter your ElevenLabs API key" 
                           value="${currentConfig.apiKey || ''}" 
                           style="width: 100%; padding: 10px; background: #444; color: white; 
                                  border: 1px solid #666; border-radius: 5px;">
                </div>
                
                <div style="margin: 20px 0;">
                    <label style="color: #fff; display: block; margin-bottom: 10px;">Voice ID (optional):</label>
                    <select id="elevenLabsVoiceId" 
                            style="width: 100%; padding: 10px; background: #444; color: white; 
                                   border: 1px solid #666; border-radius: 5px;">
                        <option value="">Default Voice</option>
                        <option value="EXAVITQu4vr4xnSDxMaL" ${currentConfig.voiceId === 'EXAVITQu4vr4xnSDxMaL' ? 'selected' : ''}>Bella</option>
                        <option value="ErXwobaYiN019PkySvjV" ${currentConfig.voiceId === 'ErXwobaYiN019PkySvjV' ? 'selected' : ''}>Antoni</option>
                        <option value="MF3mGyEYCl7XYWbV9V6O" ${currentConfig.voiceId === 'MF3mGyEYCl7XYWbV9V6O' ? 'selected' : ''}>Elli</option>
                        <option value="TxGEqnHWrfWFTfGW9XjX" ${currentConfig.voiceId === 'TxGEqnHWrfWFTfGW9XjX' ? 'selected' : ''}>Josh</option>
                    </select>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.saveElevenLabsConfig()" 
                            style="padding: 10px 20px; background: #007acc; color: white; 
                                   border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Save Configuration</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="padding: 10px 20px; background: #999; color: white; 
                                   border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  } catch (error) {
    console.error('Error loading ElevenLabs configuration:', error);
    alert('Failed to load ElevenLabs configuration: ' + error.message);
  }
};

// Save ElevenLabs Config
window.saveElevenLabsConfig = async function () {
  try {
    const apiKey = document.getElementById('elevenLabsApiKey').value.trim();
    const voiceId = document.getElementById('elevenLabsVoiceId').value;

    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      alert('Cannot save configuration - electronAPI not available');
      return;
    }

    // Save configuration via IPC
    const result = await window.electronAPI.saveElevenLabsConfig({ apiKey, voiceId });

    if (result.success) {
      alert('✅ ElevenLabs configuration saved successfully!');
      // Close the modal
      document.querySelector('.modal-overlay')?.remove();
      // Update status
      const statusEl = document.getElementById('status');
      if (statusEl) statusEl.textContent = '✅ ElevenLabs configured and ready';
    } else {
      alert('❌ Failed to save configuration: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error saving ElevenLabs configuration:', error);
    alert('Failed to save configuration: ' + error.message);
  }
};

// Process AI Command
window.processAICommand = async function () {
  const input = document.getElementById('aiInput').value.trim();
  const responseDiv = document.getElementById('aiResponse');

  if (!input) {
    responseDiv.innerHTML =
      '🧜‍♀️ <em>*flips tail impatiently*</em> Come on darling, give me something to work with!';
    return;
  }

  // Show processing
  responseDiv.innerHTML = '🌊 <em>Swimming through the data currents...</em>';

  try {
    // For now, just show the command was received
    responseDiv.innerHTML = `🧜‍♀️ Processing: "${input}"<br><span style="color: #74c0fc;">✨ AI features are being initialized...</span>`;

    // Clear input
    document.getElementById('aiInput').value = '';
  } catch (error) {
    console.error('AI processing error:', error);
    responseDiv.innerHTML = `
            <div style="color: #FF6B6B;">🧜‍♀️ <em>*bubbles of confusion*</em> Even mermaids have off days!</div>
            <div style="color: #FFD93D; margin-top: 5px;">Error: ${error.message}</div>
        `;
  }
};

// Start Conversational AI
window.startConversationalAI = async function () {
  try {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      alert('ElevenLabs conversational AI is not available in this context');
      return;
    }

    // Since the actual implementation is in the main script, we'll call a method that should exist
    if (typeof window._startConversationalAI === 'function') {
      await window._startConversationalAI();
    } else {
      // Fallback - show configuration
      alert('Conversational AI feature is being initialized. Please configure ElevenLabs first.');
      window.configureElevenLabs();
    }
  } catch (error) {
    console.error('Failed to start conversational AI:', error);
    alert(`Failed to start conversational AI: ${error.message}`);
  }
};

// Show AI Config
window.showAIConfig = function () {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;

  const aiStatus = window.rinaWarpAI ? window.rinaWarpAI.getSystemStatus() : null;

  modal.innerHTML = `
        <div style="
            background: #2d2d2d; padding: 30px; border-radius: 10px;
            max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;
            border: 2px solid #555;
        ">
            <h2 style="color: #00ff88; margin-top: 0;">🤖 AI Configuration</h2>
            
            ${
              aiStatus
                ? `
                <div style="color: #74c0fc; margin: 20px 0;">
                    <h3>System Status:</h3>
                    <p>Initialized: ${aiStatus.initialized ? '✅' : '❌'}</p>
                    <p>Current Mode: ${aiStatus.currentMode}</p>
                    <p>Total Requests: ${aiStatus.performanceMetrics?.totalRequests || 0}</p>
                    <p>Avg Response Time: ${aiStatus.performanceMetrics?.avgResponseTime || 0}ms</p>
                </div>
            `
                : '<p style="color: #ff6b6b;">AI System not initialized</p>'
            }
            
            <div style="color: #ffd93d; margin: 20px 0;">
                <h3>Available Providers:</h3>
                <ul>
                    <li>OpenAI (GPT-3.5/4)</li>
                    <li>Anthropic (Claude)</li>
                    <li>Local AI (Built-in)</li>
                </ul>
            </div>
            
            <div style="color: #00ff88; margin: 20px 0;">
                <h3>Voice Integration:</h3>
                <p>ElevenLabs: ${window.terminalState.voiceEngine?.isInitialized ? '✅ Connected' : '❌ Not configured'}</p>
                <p>Speech Recognition: ${window.terminalState.advancedVoiceRecognition ? '✅ Available' : '❌ Not available'}</p>
            </div>
            
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: #007acc; 
                           color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;

  document.body.appendChild(modal);

  // Close on click outside
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.remove();
    }
  });
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    logger.debug('✅ Terminal functions fix loaded and ready');
    // Double-check that all functions are available
    const requiredFunctions = [
      'startVoiceControl',
      'showAIHelp',
      'runCommand',
      'clearTerminal',
      'showFeatures',
      'configureElevenLabs',
      'toggleVoiceOutput',
      'showAIConfig',
      'processAICommand',
      'startConversationalAI',
    ];

    requiredFunctions.forEach(funcName => {
      if (typeof window[funcName] === 'function') {
      } else {
        console.error(`❌ ${funcName} is NOT available`);
      }
    });
  });
} else {
}

import React, { useContext, useEffect, useState } from 'react';
import { TerminalContext } from '../context/TerminalContext';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose }) => {
  const { 
    currentCommand, 
    aiSuggestions, 
    getContextualHelp, 
    currentTheme,
    sessionStats,
    isVoiceEnabled 
  } = useContext(TerminalContext);

  const [activeTab, setActiveTab] = useState('contextual');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const helpContent = getContextualHelp();

  useEffect(() => {
    if (isOpen) {
      // Auto-focus on search input when modal opens
      setTimeout(() => {
        const searchInput = document.getElementById('help-search');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const filterSuggestions = (suggestions) => {
    if (!searchTerm) return suggestions;
    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  const formatSessionTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className={`help-modal-overlay ${currentTheme}`} onClick={onClose}>
      <div className="help-modal-content" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="help-modal-header">
          <h2>🧜‍♀️ Rina's Help System</h2>
          <button 
            onClick={onClose} 
            className="help-modal-close"
            aria-label="Close help modal"
          >
            ✖
          </button>
        </div>

        <div className="help-modal-tabs">
          <button 
            className={activeTab === 'contextual' ? 'active' : ''}
            onClick={() => handleTabChange('contextual')}
          >
            🎯 Contextual Help
          </button>
          <button 
            className={activeTab === 'voice' ? 'active' : ''}
            onClick={() => handleTabChange('voice')}
          >
            🎙️ Voice Commands
          </button>
          <button 
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => handleTabChange('stats')}
          >
            📊 Session Stats
          </button>
          <button 
            className={activeTab === 'ai' ? 'active' : ''}
            onClick={() => handleTabChange('ai')}
          >
            🤖 AI Suggestions
          </button>
        </div>

        <div className="help-modal-search">
          <input
            id="help-search"
            type="text"
            placeholder="Search help topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="help-search-input"
          />
          <span className="help-search-icon">🔍</span>
        </div>

        <div className="help-modal-body">
          {activeTab === 'contextual' && (
            <div className="help-contextual">
              <div className="help-current-context">
                <h3>{helpContent.title}</h3>
                {currentCommand && (
                  <p className="current-command">
                    Current command: <code>{currentCommand}</code>
                  </p>
                )}
              </div>

              <div className="help-suggestions">
                <h4>💡 Suggestions:</h4>
                <ul>
                  {filterSuggestions(helpContent.suggestions).map((suggestion, index) => (
                    <li key={index} className="help-suggestion-item">
                      <span dangerouslySetInnerHTML={{ __html: suggestion }} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="help-keyboard-shortcuts">
                <h4>⌨️ Keyboard Shortcuts:</h4>
                <div className="shortcuts-grid">
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>C</kbd> - Cancel current command
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>L</kbd> - Clear screen
                  </div>
                  <div className="shortcut-item">
                    <kbd>Tab</kbd> - Auto-complete
                  </div>
                  <div className="shortcut-item">
                    <kbd>↑</kbd> / <kbd>↓</kbd> - Command history
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>R</kbd> - Search history
                  </div>
                  <div className="shortcut-item">
                    <kbd>?</kbd> - Show help
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="help-voice">
              <div className="voice-status">
                <h3>🎙️ Voice Control</h3>
                <p className={`voice-indicator ${isVoiceEnabled ? 'enabled' : 'disabled'}`}>
                  Status: {isVoiceEnabled ? '✅ Enabled' : '❌ Disabled'}
                </p>
              </div>

              <div className="voice-commands">
                <h4>🗣️ Voice Commands:</h4>
                <ul>
                  {helpContent.voiceCommands?.map((command, index) => (
                    <li key={index} className="voice-command-item">
                      <span className="voice-command">"{command}"</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="voice-tips">
                <h4>💬 Voice Tips:</h4>
                <ul>
                  <li>Speak clearly and at a normal pace</li>
                  <li>Use "Hey Rina" to activate voice help</li>
                  <li>Say "stop listening" to disable voice</li>
                  <li>Voice commands work in any theme</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="help-stats">
              <h3>📊 Session Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{sessionStats.commandsExecuted}</div>
                  <div className="stat-label">Commands Executed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{formatSessionTime(sessionStats.timeSpent)}</div>
                  <div className="stat-label">Session Time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{sessionStats.errorsEncountered}</div>
                  <div className="stat-label">Errors</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{currentTheme === 'dark' ? '🌙' : '☀️'}</div>
                  <div className="stat-label">Current Theme</div>
                </div>
              </div>

              <div className="productivity-tips">
                <h4>🚀 Productivity Tips:</h4>
                <ul>
                  <li>Use command history (↑/↓) to repeat commands</li>
                  <li>Enable voice commands for hands-free operation</li>
                  <li>Use Tab completion to speed up typing</li>
                  <li>Learn keyboard shortcuts for common actions</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="help-ai">
              <h3>🤖 AI Assistant</h3>
              
              {aiSuggestions ? (
                <div className="ai-suggestions">
                  <h4>🎯 AI Suggestions:</h4>
                  <div className="ai-response">
                    <p>{aiSuggestions}</p>
                  </div>
                </div>
              ) : (
                <div className="ai-placeholder">
                  <p>Ask Rina anything about terminal commands!</p>
                  <p>Try saying: "Hey Rina, how do I list hidden files?"</p>
                </div>
              )}

              <div className="ai-capabilities">
                <h4>🧠 AI Capabilities:</h4>
                <ul>
                  <li>Context-aware command suggestions</li>
                  <li>Error explanation and fixes</li>
                  <li>Command optimization tips</li>
                  <li>Natural language command translation</li>
                  <li>Git workflow assistance</li>
                  <li>Package management help</li>
                </ul>
              </div>

              <div className="ai-examples">
                <h4>💭 Example Questions:</h4>
                <div className="example-questions">
                  <button className="example-btn">"How do I undo my last commit?"</button>
                  <button className="example-btn">"What's the difference between rm and rmdir?"</button>
                  <button className="example-btn">"How do I search for files containing text?"</button>
                  <button className="example-btn">"Show me npm scripts in package.json"</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="help-modal-footer">
          <div className="help-footer-info">
            <span>🧜‍♀️ Rina is here to help! Ask me anything about terminal commands.</span>
          </div>
          <div className="help-footer-actions">
            <button onClick={onClose} className="help-footer-btn">
              Close Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

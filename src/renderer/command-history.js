/**
 * Command History System for RinaWarp Terminal
 * Provides persistent command history with search functionality
 */

export class CommandHistory {
  constructor(terminal) {
    this.terminal = terminal;
    this.history = [];
    this.currentIndex = -1;
    this.tempCommand = '';
    this.maxHistory = 10000;
    this.searchMode = false;
    this.searchTerm = '';
    this.searchResults = [];
    this.searchIndex = 0;

    // Load history from storage
    this.loadHistory();

    // Initialize UI
    this.createSearchUI();

    // Attach to terminal
    this.attachToTerminal();
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('rinawarp-command-history');
      if (saved) {
        this.history = JSON.parse(saved);
        this.currentIndex = this.history.length;
      }
    } catch (e) {
      console.error('Failed to load command history:', e);
      this.history = [];
    }
  }

  saveHistory() {
    try {
      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(-this.maxHistory);
      }
      localStorage.setItem('rinawarp-command-history', JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save command history:', e);
    }
  }

  createSearchUI() {
    // Create search overlay
    this.searchOverlay = document.createElement('div');
    this.searchOverlay.id = 'history-search-overlay';
    this.searchOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      z-index: 2000;
      backdrop-filter: blur(5px);
    `;

    // Create search container
    this.searchContainer = document.createElement('div');
    this.searchContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid rgba(0, 170, 255, 0.5);
      border-radius: 10px;
      padding: 20px;
      min-width: 500px;
      max-width: 80%;
      max-height: 80%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Search input
    const searchHeader = document.createElement('div');
    searchHeader.innerHTML = `
      <h3 style="color: #00AAFF; margin: 0 0 10px 0;">🔍 Search Command History</h3>
      <input type="text" id="history-search-input" 
             placeholder="Type to search..." 
             style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.1); 
                    color: white; border: 1px solid rgba(0, 170, 255, 0.5); 
                    border-radius: 5px; font-size: 16px;">
      <div style="color: #888; font-size: 12px; margin-top: 5px;">
        Use ↑↓ to navigate, Enter to select, Esc to cancel
      </div>
    `;

    // Results container
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      margin-top: 20px;
      max-height: 400px;
    `;

    this.searchContainer.appendChild(searchHeader);
    this.searchContainer.appendChild(this.resultsContainer);
    this.searchOverlay.appendChild(this.searchContainer);
    document.body.appendChild(this.searchOverlay);

    // Event listeners
    const searchInput = this.searchContainer.querySelector('#history-search-input');
    searchInput.addEventListener('input', e => this.onSearchInput(e.target.value));
    searchInput.addEventListener('keydown', e => this.onSearchKeydown(e));

    // Close on overlay click
    this.searchOverlay.addEventListener('click', e => {
      if (e.target === this.searchOverlay) {
        this.closeSearch();
      }
    });
  }

  attachToTerminal() {
    if (!this.terminal) return;

    // Override terminal key handling
    this.terminal.attachCustomKeyEventHandler(event => {
      if (event.type !== 'keydown') return true;

      // Ctrl+R for search
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        this.openSearch();
        return false;
      }

      // Don't interfere if search is open
      if (this.searchMode) return true;

      // Arrow keys for history navigation
      switch (event.key) {
        case 'ArrowUp':
          if (!event.shiftKey && !event.altKey) {
            this.navigateHistory(-1);
            return false;
          }
          break;

        case 'ArrowDown':
          if (!event.shiftKey && !event.altKey) {
            this.navigateHistory(1);
            return false;
          }
          break;
      }

      return true;
    });

    // Monitor for command execution
    this.hookIntoCommandExecution();
  }

  hookIntoCommandExecution() {
    // Monitor Enter key for command execution
    this.terminal.onData(data => {
      if (data === '\r' || data === '\n') {
        const command = this.getCurrentCommand();
        if (command && command.trim()) {
          this.addCommand(command.trim());
        }
      }
    });

    // Also hook into shell harness if available
    if (window.terminalState?.shellHarness) {
      const harness = window.terminalState.shellHarness;
      const originalExecute = harness.execute?.bind(harness);
      if (originalExecute) {
        harness.execute = async command => {
          this.addCommand(command);
          return originalExecute(command);
        };
      }
    }
  }

  getCurrentCommand() {
    // Get current line from terminal
    const buffer = this.terminal.buffer.active;
    const cursorY = buffer.cursorY;
    const line = buffer.getLine(cursorY);

    if (!line) return '';

    let lineText = '';
    for (let i = 0; i < line.length; i++) {
      const cell = line.getCell(i);
      if (cell) {
        lineText += cell.getChars() || ' ';
      }
    }

    // Remove prompt if present (simple heuristic)
    lineText = lineText.trim();
    const promptPatterns = [/^PS\s.*?>\s*/, /^.*?[$#]\s*/, /^>\s*/];

    for (const pattern of promptPatterns) {
      lineText = lineText.replace(pattern, '');
    }

    return lineText.trim();
  }

  addCommand(command) {
    if (!command || command.trim() === '') return;

    // Don't add duplicates of the last command
    if (this.history.length > 0 && this.history[this.history.length - 1] === command) {
      return;
    }

    // Add timestamp
    const _entry = {
      command: command,
      timestamp: new Date().toISOString(),
    };

    this.history.push(command);
    this.currentIndex = this.history.length;
    this.tempCommand = '';

    // Save to storage
    this.saveHistory();

    // Update autocomplete if available
    if (window.autoCompleteSystem) {
      window.autoCompleteSystem.addToHistory(command);
    }
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    // Save current command if starting navigation
    if (this.currentIndex === this.history.length) {
      this.tempCommand = this.getCurrentCommand();
    }

    // Navigate
    this.currentIndex += direction;

    // Bounds check
    if (this.currentIndex < 0) {
      this.currentIndex = 0;
    } else if (this.currentIndex > this.history.length) {
      this.currentIndex = this.history.length;
    }

    // Get command to display
    let command;
    if (this.currentIndex === this.history.length) {
      command = this.tempCommand;
    } else {
      command = this.history[this.currentIndex];
    }

    // Clear current line and write command
    this.clearCurrentLine();
    this.terminal.write(command);
  }

  clearCurrentLine() {
    // Move to beginning of line after prompt
    const currentLine = this.getCurrentCommand();
    const backspaces = '\b'.repeat(currentLine.length);
    const spaces = ' '.repeat(currentLine.length);
    const moreBackspaces = '\b'.repeat(currentLine.length);
    this.terminal.write(backspaces + spaces + moreBackspaces);
  }

  openSearch() {
    this.searchMode = true;
    this.searchTerm = '';
    this.searchResults = [];
    this.searchIndex = 0;

    // Show overlay
    this.searchOverlay.style.display = 'block';

    // Focus search input
    const searchInput = this.searchContainer.querySelector('#history-search-input');
    searchInput.value = '';
    searchInput.focus();

    // Show all history initially
    this.updateSearchResults('');
  }

  closeSearch() {
    this.searchMode = false;
    this.searchOverlay.style.display = 'none';
  }

  onSearchInput(value) {
    this.searchTerm = value;
    this.updateSearchResults(value);
  }

  updateSearchResults(searchTerm) {
    // Filter history
    if (searchTerm) {
      this.searchResults = this.history
        .filter(cmd => cmd.toLowerCase().includes(searchTerm.toLowerCase()))
        .reverse(); // Show most recent first
    } else {
      this.searchResults = [...this.history].reverse();
    }

    this.searchIndex = 0;

    // Update UI
    this.renderSearchResults();
  }

  renderSearchResults() {
    this.resultsContainer.innerHTML = '';

    if (this.searchResults.length === 0) {
      this.resultsContainer.innerHTML = `
        <div style="color: #888; text-align: center; padding: 20px;">
          No commands found
        </div>
      `;
      return;
    }

    // Show results
    this.searchResults.forEach((command, index) => {
      const resultItem = document.createElement('div');
      resultItem.style.cssText = `
        padding: 10px;
        cursor: pointer;
        border-radius: 5px;
        margin-bottom: 5px;
        font-family: monospace;
        transition: all 0.2s;
        ${
          index === this.searchIndex
            ? 'background: rgba(0, 170, 255, 0.3); color: #00AAFF;'
            : 'background: rgba(255, 255, 255, 0.05); color: #fff;'
        }
      `;

      // Highlight matching text
      if (this.searchTerm) {
        const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
        resultItem.innerHTML = command.replace(regex, '<span style="color: #FFD700;">$1</span>');
      } else {
        resultItem.textContent = command;
      }

      resultItem.addEventListener('click', () => {
        this.selectSearchResult(index);
      });

      resultItem.addEventListener('mouseenter', () => {
        this.searchIndex = index;
        this.renderSearchResults();
      });

      this.resultsContainer.appendChild(resultItem);
    });

    // Scroll to selected item
    const selectedItem = this.resultsContainer.children[this.searchIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  onSearchKeydown(event) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.navigateSearchResults(-1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.navigateSearchResults(1);
        break;

      case 'Enter':
        event.preventDefault();
        this.selectSearchResult(this.searchIndex);
        break;

      case 'Escape':
        event.preventDefault();
        this.closeSearch();
        break;
    }
  }

  navigateSearchResults(direction) {
    if (this.searchResults.length === 0) return;

    this.searchIndex += direction;

    if (this.searchIndex < 0) {
      this.searchIndex = this.searchResults.length - 1;
    } else if (this.searchIndex >= this.searchResults.length) {
      this.searchIndex = 0;
    }

    this.renderSearchResults();
  }

  selectSearchResult(index) {
    if (index < 0 || index >= this.searchResults.length) return;

    const command = this.searchResults[index];

    // Clear current line and write selected command
    this.clearCurrentLine();
    this.terminal.write(command);

    // Close search
    this.closeSearch();
  }

  // Public API
  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
    this.currentIndex = 0;
    this.saveHistory();
  }

  exportHistory() {
    return JSON.stringify(this.history, null, 2);
  }

  importHistory(historyJson) {
    try {
      const imported = JSON.parse(historyJson);
      if (Array.isArray(imported)) {
        this.history = imported;
        this.currentIndex = this.history.length;
        this.saveHistory();
        return true;
      }
    } catch (e) {
      console.error('Failed to import history:', e);
    }
    return false;
  }
}

// Export for use in terminal
window.CommandHistory = CommandHistory;

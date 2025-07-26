/**
 * Auto-complete System for RinaWarp Terminal
 * Provides intelligent command suggestions as the user types
 */

export class AutoCompleteSystem {
  constructor(terminal) {
    this.terminal = terminal;
    this.suggestions = [];
    this.currentIndex = -1;
    this.isActive = false;
    this.currentInput = '';
    this.position = { row: 0, col: 0 };
    
    // Command history for learning
    this.commandHistory = this.loadHistory();
    
    // Common commands database
    this.commandDatabase = {
      // PowerShell commands
      'Get-': ['ChildItem', 'Process', 'Service', 'Location', 'Content', 'Command', 'Help', 'Date', 'EventLog', 'WmiObject'],
      'Set-': ['Location', 'Content', 'Variable', 'ExecutionPolicy', 'ItemProperty'],
      'New-': ['Item', 'ItemProperty', 'Variable', 'Object', 'PSSession'],
      'Remove-': ['Item', 'ItemProperty', 'Variable', 'PSSession'],
      'Start-': ['Process', 'Service', 'Job', 'Sleep'],
      'Stop-': ['Process', 'Service', 'Job'],
      'Restart-': ['Service', 'Computer'],
      
      // Git commands
      'git ': ['status', 'add', 'commit', 'push', 'pull', 'clone', 'checkout', 'branch', 'merge', 'log', 'diff', 'stash', 'reset', 'remote', 'fetch'],
      'git add ': ['.', '--all', '-A', '-u'],
      'git commit ': ['-m', '-am', '--amend', '-a'],
      'git checkout ': ['-b', 'main', 'master', 'develop'],
      'git branch ': ['-d', '-D', '-a', '-r'],
      
      // NPM commands
      'npm ': ['install', 'run', 'start', 'test', 'build', 'publish', 'update', 'outdated', 'list', 'init'],
      'npm install ': ['--save', '--save-dev', '-g', '--production'],
      'npm run ': ['dev', 'build', 'test', 'start', 'lint', 'format'],
      
      // Docker commands
      'docker ': ['run', 'ps', 'images', 'build', 'pull', 'push', 'exec', 'stop', 'start', 'rm', 'rmi', 'logs', 'compose'],
      'docker run ': ['-it', '-d', '--rm', '-p', '-v', '--name'],
      'docker compose ': ['up', 'down', 'build', 'logs', 'ps', 'exec'],
      
      // Common utilities
      'cd ': ['..', '~', '/'],
      'ls ': ['-la', '-l', '-a', '-lh'],
      'rm ': ['-rf', '-r', '-f'],
      'cp ': ['-r', '-rf', '-a'],
      'mkdir ': ['-p'],
      'curl ': ['-o', '-O', '-L', '-H', '-X'],
      
      // File paths (dynamic, will be populated)
      './': [],
      '../': [],
      '~/': ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos']
    };
    
    // Initialize UI
    this.createAutoCompleteUI();
    
    // Bind to terminal
    this.attachToTerminal();
  }
  
  loadHistory() {
    try {
      const saved = localStorage.getItem('rinawarp-command-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
  
  saveHistory() {
    try {
      // Keep only last 1000 commands
      if (this.commandHistory.length > 1000) {
        this.commandHistory = this.commandHistory.slice(-1000);
      }
      localStorage.setItem('rinawarp-command-history', JSON.stringify(this.commandHistory));
    } catch (e) {
      console.error('Failed to save command history:', e);
    }
  }
  
  createAutoCompleteUI() {
    // Create suggestion container
    this.container = document.createElement('div');
    this.container.id = 'autocomplete-suggestions';
    this.container.className = 'autocomplete-container';
    this.container.style.cssText = `
      position: absolute;
      display: none;
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(0, 170, 255, 0.5);
      border-radius: 8px;
      padding: 5px 0;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 170, 255, 0.3);
      min-width: 200px;
    `;
    
    document.body.appendChild(this.container);
  }
  
  attachToTerminal() {
    if (!this.terminal) return;
    
    // Override terminal key handling
    this.terminal.attachCustomKeyEventHandler((event) => {
      // Only handle if autocomplete is enabled
      if (!window.settingsPanel?.settings?.autoComplete) {
        return true; // Let terminal handle it
      }
      
      if (event.type === 'keydown') {
        switch (event.key) {
        case 'Tab':
          if (this.isActive) {
            event.preventDefault();
            this.selectSuggestion();
            return false;
          } else {
            // Trigger autocomplete
            this.triggerAutoComplete();
            return false;
          }
            
        case 'ArrowUp':
          if (this.isActive) {
            event.preventDefault();
            this.navigateSuggestions(-1);
            return false;
          }
          break;
            
        case 'ArrowDown':
          if (this.isActive) {
            event.preventDefault();
            this.navigateSuggestions(1);
            return false;
          }
          break;
            
        case 'Escape':
          if (this.isActive) {
            event.preventDefault();
            this.hide();
            return false;
          }
          break;
            
        case 'Enter':
          if (this.isActive && this.currentIndex >= 0) {
            event.preventDefault();
            this.selectSuggestion();
            return false;
          }
          break;
        }
      }
      
      return true; // Let terminal handle other keys
    });
    
    // Monitor terminal input
    this.terminal.onData((data) => {
      // Update current input and show suggestions
      if (data && data !== '\t' && data !== '\r' && data !== '\n') {
        setTimeout(() => this.updateSuggestions(), 10);
      }
    });
  }
  
  getCurrentLine() {
    // Get current line from terminal buffer
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
    
    return lineText.trimEnd();
  }
  
  triggerAutoComplete() {
    this.currentInput = this.getCurrentLine();
    const suggestions = this.generateSuggestions(this.currentInput);
    
    if (suggestions.length > 0) {
      this.show(suggestions);
    } else {
      this.hide();
    }
  }
  
  updateSuggestions() {
    if (!this.isActive) return;
    
    this.currentInput = this.getCurrentLine();
    const suggestions = this.generateSuggestions(this.currentInput);
    
    if (suggestions.length > 0) {
      this.show(suggestions);
    } else {
      this.hide();
    }
  }
  
  generateSuggestions(input) {
    if (!input || input.length < 2) return [];
    
    const suggestions = new Set();
    const lowerInput = input.toLowerCase();
    
    // 1. Check command database
    for (const [prefix, commands] of Object.entries(this.commandDatabase)) {
      if (input.startsWith(prefix)) {
        const remaining = input.substring(prefix.length);
        commands.forEach(cmd => {
          if (cmd.toLowerCase().startsWith(remaining.toLowerCase())) {
            suggestions.add(prefix + cmd);
          }
        });
      } else if (prefix.startsWith(lowerInput)) {
        suggestions.add(prefix);
      }
    }
    
    // 2. Check command history
    this.commandHistory.forEach(cmd => {
      if (cmd.toLowerCase().startsWith(lowerInput) && cmd !== input) {
        suggestions.add(cmd);
      }
    });
    
    // 3. Path completion
    if (input.includes('/') || input.includes('\\')) {
      // This would need file system access in a real implementation
      // For now, we'll use mock suggestions
      if (input.startsWith('./')) {
        suggestions.add('./src/');
        suggestions.add('./package.json');
        suggestions.add('./README.md');
      }
    }
    
    // 4. AI-based suggestions
    if (window.advancedAI) {
      const aiSuggestions = window.advancedAI.getSuggestions(input);
      aiSuggestions.forEach(s => suggestions.add(s));
    }
    
    // Convert to array and sort by relevance
    return Array.from(suggestions)
      .sort((a, b) => {
        // Prioritize exact prefix matches
        const aStarts = a.toLowerCase().startsWith(lowerInput);
        const bStarts = b.toLowerCase().startsWith(lowerInput);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Then by length (shorter first)
        return a.length - b.length;
      })
      .slice(0, 10); // Limit to 10 suggestions
  }
  
  show(suggestions) {
    this.suggestions = suggestions;
    this.currentIndex = -1;
    this.isActive = true;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Add suggestions
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = suggestion;
      item.style.cssText = `
        padding: 5px 15px;
        cursor: pointer;
        color: #fff;
        transition: all 0.2s;
      `;
      
      item.addEventListener('mouseenter', () => {
        this.currentIndex = index;
        this.updateHighlight();
      });
      
      item.addEventListener('click', () => {
        this.currentIndex = index;
        this.selectSuggestion();
      });
      
      this.container.appendChild(item);
    });
    
    // Position the container
    this.positionContainer();
    
    // Show container
    this.container.style.display = 'block';
  }
  
  hide() {
    this.isActive = false;
    this.container.style.display = 'none';
    this.suggestions = [];
    this.currentIndex = -1;
  }
  
  positionContainer() {
    // Get terminal position and cursor position
    const terminalEl = document.getElementById('terminal');
    if (!terminalEl) return;
    
    const rect = terminalEl.getBoundingClientRect();
    const cursorX = this.terminal.buffer.active.cursorX;
    const cursorY = this.terminal.buffer.active.cursorY;
    
    // Calculate position (simplified - would need more precise calculation)
    const charWidth = rect.width / this.terminal.cols;
    const charHeight = rect.height / this.terminal.rows;
    
    const left = rect.left + (cursorX * charWidth);
    const top = rect.top + ((cursorY + 1) * charHeight);
    
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
    
    // Ensure container stays within viewport
    const containerRect = this.container.getBoundingClientRect();
    if (containerRect.right > window.innerWidth) {
      this.container.style.left = `${window.innerWidth - containerRect.width - 10}px`;
    }
    if (containerRect.bottom > window.innerHeight) {
      this.container.style.top = `${rect.top + (cursorY * charHeight) - containerRect.height}px`;
    }
  }
  
  navigateSuggestions(direction) {
    if (this.suggestions.length === 0) return;
    
    this.currentIndex += direction;
    
    if (this.currentIndex < 0) {
      this.currentIndex = this.suggestions.length - 1;
    } else if (this.currentIndex >= this.suggestions.length) {
      this.currentIndex = 0;
    }
    
    this.updateHighlight();
  }
  
  updateHighlight() {
    const items = this.container.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.style.background = 'rgba(0, 170, 255, 0.3)';
        item.style.color = '#00AAFF';
      } else {
        item.style.background = 'transparent';
        item.style.color = '#fff';
      }
    });
  }
  
  selectSuggestion() {
    if (this.currentIndex < 0 || this.currentIndex >= this.suggestions.length) {
      this.currentIndex = 0;
    }
    
    const suggestion = this.suggestions[this.currentIndex];
    if (!suggestion) return;
    
    // Clear current line and write suggestion
    const currentLine = this.getCurrentLine();
    const backspaces = '\b'.repeat(currentLine.length);
    this.terminal.write(backspaces);
    this.terminal.write(suggestion);
    
    // Add to history
    this.addToHistory(suggestion);
    
    // Hide suggestions
    this.hide();
  }
  
  addToHistory(command) {
    if (!command || command.trim() === '') return;
    
    // Remove duplicates
    this.commandHistory = this.commandHistory.filter(cmd => cmd !== command);
    
    // Add to end
    this.commandHistory.push(command);
    
    // Save
    this.saveHistory();
  }
}

// Export for use in terminal
window.AutoCompleteSystem = AutoCompleteSystem;

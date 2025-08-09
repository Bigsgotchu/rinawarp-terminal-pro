/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Enhanced Terminal Features for RinaWarp Terminal
 * Adds improved functionality while maintaining core stability
 */

const { _spawn } = require('child_process');
const _path = require('node:path');
const _fs = require('node:fs');
const config = require('../config/unified-config.cjs');

class EnhancedTerminal {
  constructor(baseTerminal) {
    this.baseTerminal = baseTerminal;
    this.features = {
      autocomplete: true,
      history: true,
      multipleSelection: true,
      splitPanes: false, // Disabled for stability
      findInTerminal: true,
      smartPaste: true,
    };

    this.commandHistory = [];
    this.historyIndex = -1;
    this.autocompleteCache = new Map();
    this.setupEnhancements();
  }

  setupEnhancements() {
    if (this.baseTerminal.terminal) {
      this.setupKeyboardShortcuts();
      this.setupCommandHistory();
      this.setupAutocomplete();
      this.setupSmartPaste();
      this.setupFindFeature();
    }
  }

  setupKeyboardShortcuts() {
    // Enhanced keyboard shortcuts
    this.baseTerminal.terminal.attachCustomKeyEventHandler(e => {
      // Ctrl+R for history search
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        this.showHistorySearch();
        return false;
      }

      // Ctrl+F for find
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.showFindDialog();
        return false;
      }

      // Ctrl+Shift+C for copy (enhanced)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.enhancedCopy();
        return false;
      }

      // Ctrl+Shift+V for smart paste
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        this.smartPaste();
        return false;
      }

      // Up/Down for command history
      if (e.key === 'ArrowUp' && this.commandHistory.length > 0) {
        if (this.historyIndex === -1) {
          this.historyIndex = this.commandHistory.length - 1;
        } else if (this.historyIndex > 0) {
          this.historyIndex--;
        }

        if (this.historyIndex >= 0) {
          this.replaceCurrentLine(this.commandHistory[this.historyIndex]);
        }
        return false;
      }

      if (e.key === 'ArrowDown' && this.historyIndex !== -1) {
        this.historyIndex++;
        if (this.historyIndex >= this.commandHistory.length) {
          this.historyIndex = -1;
          this.replaceCurrentLine('');
        } else {
          this.replaceCurrentLine(this.commandHistory[this.historyIndex]);
        }
        return false;
      }

      // Tab for autocomplete
      if (e.key === 'Tab') {
        e.preventDefault();
        this.handleAutocomplete();
        return false;
      }

      return true;
    });
  }

  setupCommandHistory() {
    // Load command history from config
    const savedHistory = config.get('terminal.commandHistory') || [];
    this.commandHistory = savedHistory.slice(-1000); // Keep last 1000 commands

    // Save command when executed
    this.baseTerminal.terminal.onData(data => {
      if (data === '\\r') {
        // Enter key
        const currentLine = this.getCurrentLine();
        if (
          currentLine.trim() &&
          currentLine !== this.commandHistory[this.commandHistory.length - 1]
        ) {
          this.commandHistory.push(currentLine.trim());
          if (this.commandHistory.length > 1000) {
            this.commandHistory.shift();
          }
          config.set('terminal.commandHistory', this.commandHistory);
        }
        this.historyIndex = -1;
      }
    });
  }

  setupAutocomplete() {
    // Build autocomplete cache for common commands
    this.buildAutocompleteCache();

    // Rebuild cache periodically
    setInterval(() => {
      this.buildAutocompleteCache();
    }, 300000); // Every 5 minutes
  }

  buildAutocompleteCache() {
    // Common commands based on platform
    const commonCommands = this.getCommonCommands();

    // Add commands from history
    const historyCommands = [
      ...new Set(this.commandHistory.map(cmd => cmd.split(' ')[0]).filter(cmd => cmd.length > 1)),
    ];

    // Combine and cache
    this.autocompleteCache.clear();
    [...commonCommands, ...historyCommands].forEach(cmd => {
      this.autocompleteCache.set(cmd.toLowerCase(), cmd);
    });
  }

  getCommonCommands() {
    const platform = process.platform;

    if (platform === 'win32') {
      return [
        'dir',
        'cd',
        'copy',
        'move',
        'del',
        'mkdir',
        'rmdir',
        'type',
        'echo',
        'cls',
        'ipconfig',
        'ping',
        'tracert',
        'netstat',
        'tasklist',
        'taskkill',
        'powershell',
        'cmd',
        'npm',
        'node',
        'git',
        'code',
        'python',
        'pip',
      ];
    } else {
      return [
        'ls',
        'cd',
        'cp',
        'mv',
        'rm',
        'mkdir',
        'rmdir',
        'cat',
        'echo',
        'clear',
        'grep',
        'find',
        'which',
        'ps',
        'kill',
        'top',
        'df',
        'du',
        'chmod',
        'chown',
        'npm',
        'node',
        'git',
        'code',
        'python',
        'pip',
      ];
    }
  }

  handleAutocomplete() {
    const currentLine = this.getCurrentLine();
    const words = currentLine.split(' ');
    const currentWord = words[words.length - 1];

    if (currentWord.length === 0) return;

    // Find matches
    const matches = [];
    for (const [key, value] of this.autocompleteCache) {
      if (key.startsWith(currentWord.toLowerCase())) {
        matches.push(value);
      }
    }

    if (matches.length === 1) {
      // Single match - complete it
      const completion = matches[0].substring(currentWord.length);
      this.baseTerminal.terminal.write(completion + ' ');
    } else if (matches.length > 1) {
      // Multiple matches - show them
      this.baseTerminal.terminal.write('\\r\\n');
      const matchText = matches.slice(0, 10).join('  '); // Show max 10
      this.baseTerminal.terminal.write(`\\x1b[36m${matchText}\\x1b[0m\\r\\n`);
      this.rewritePrompt(currentLine);
    }
  }

  setupSmartPaste() {
    // Enhanced paste with multiline support
    document.addEventListener('paste', e => {
      if (
        document.activeElement === this.baseTerminal.element ||
        this.baseTerminal.element.contains(document.activeElement)
      ) {
        e.preventDefault();

        const clipboardData = e.clipboardData.getData('text');
        this.smartPasteText(clipboardData);
      }
    });
  }

  smartPasteText(text) {
    if (!text) return;

    const lines = text.split('\\n');

    if (lines.length === 1) {
      // Single line - paste normally
      this.baseTerminal.terminal.write(text);
    } else {
      // Multiple lines - ask for confirmation
      this.showMultilinePasteDialog(lines);
    }
  }

  showMultilinePasteDialog(lines) {
    const dialog = document.createElement('div');
    dialog.className = 'multiline-paste-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Paste Multiple Lines?</h3>
        <p>You're about to paste ${lines.length} lines. This will execute ${lines.length} commands.</p>
        <div class="preview">
          ${lines
            .slice(0, 5)
            .map(line => `<div class="command-line">${this.escapeHtml(line)}</div>`)
            .join('')}
          ${lines.length > 5 ? `<div class="more">... and ${lines.length - 5} more lines</div>` : ''}
        </div>
        <div class="dialog-buttons">
          <button class="paste-one-by-one">Paste One by One</button>
          <button class="paste-all">Paste All</button>
          <button class="cancel">Cancel</button>
        </div>
      </div>
    `;

    // Style the dialog
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    document.body.appendChild(dialog);

    // Handle button clicks
    dialog.querySelector('.paste-one-by-one').onclick = () => {
      document.body.removeChild(dialog);
      this.pasteOneByOne(lines);
    };

    dialog.querySelector('.paste-all').onclick = () => {
      document.body.removeChild(dialog);
      this.baseTerminal.terminal.write(lines.join('\\r'));
    };

    dialog.querySelector('.cancel').onclick = () => {
      document.body.removeChild(dialog);
    };
  }

  pasteOneByOne(lines) {
    let index = 0;

    const pasteNext = () => {
      if (index < lines.length) {
        this.baseTerminal.terminal.write(lines[index] + '\\r');
        index++;
        setTimeout(pasteNext, 500); // Wait 500ms between commands
      }
    };

    pasteNext();
  }

  setupFindFeature() {
    this.findDialog = null;
  }

  showFindDialog() {
    if (this.findDialog) {
      this.findDialog.focus();
      return;
    }

    this.findDialog = document.createElement('div');
    this.findDialog.className = 'find-dialog';
    this.findDialog.innerHTML = `
      <div class="find-content">
        <input type="text" placeholder="Find in terminal..." class="find-input">
        <button class="find-next">Next</button>
        <button class="find-prev">Prev</button>
        <button class="find-close">×</button>
      </div>
    `;

    // Style the find dialog
    this.findDialog.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: var(--header-bg, #2a2a2a);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 5px;
      padding: 8px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 5px;
    `;

    this.baseTerminal.element.appendChild(this.findDialog);

    const input = this.findDialog.querySelector('.find-input');
    input.focus();

    // Handle find functionality
    const _currentSearchIndex = 0;
    const _searchResults = [];

    const performSearch = (_direction = 1) => {
      const searchTerm = input.value;
      if (!searchTerm) return;

      // Simple search in terminal buffer (would need XTerm addon for better search)
      // This is a simplified version
      console.log(`Searching for: ${searchTerm}`);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        performSearch();
      } else if (e.key === 'Escape') {
        this.closeFindDialog();
      }
    });

    this.findDialog.querySelector('.find-next').onclick = () => performSearch(1);
    this.findDialog.querySelector('.find-prev').onclick = () => performSearch(-1);
    this.findDialog.querySelector('.find-close').onclick = () => this.closeFindDialog();
  }

  closeFindDialog() {
    if (this.findDialog) {
      this.findDialog.remove();
      this.findDialog = null;
      this.baseTerminal.terminal.focus();
    }
  }

  showHistorySearch() {
    // Quick history search overlay
    const overlay = document.createElement('div');
    overlay.className = 'history-search-overlay';
    overlay.innerHTML = `
      <div class="history-search-content">
        <input type="text" placeholder="Search command history... (ESC to close)" class="history-input">
        <div class="history-results"></div>
      </div>
    `;

    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    this.baseTerminal.element.appendChild(overlay);

    const input = overlay.querySelector('.history-input');
    const results = overlay.querySelector('.history-results');

    input.focus();

    const updateResults = () => {
      const searchTerm = input.value.toLowerCase();
      const matches = this.commandHistory
        .filter(cmd => cmd.toLowerCase().includes(searchTerm))
        .slice(-20) // Last 20 matches
        .reverse();

      results.innerHTML = matches
        .map(
          (cmd, index) =>
            `<div class="history-item" data-index="${index}">${this.escapeHtml(cmd)}</div>`
        )
        .join('');

      // Add click handlers
      results.querySelectorAll('.history-item').forEach(item => {
        item.onclick = () => {
          this.replaceCurrentLine(item.textContent);
          overlay.remove();
          this.baseTerminal.terminal.focus();
        };
      });
    };

    input.addEventListener('input', updateResults);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        overlay.remove();
        this.baseTerminal.terminal.focus();
      }
    });

    updateResults();
  }

  enhancedCopy() {
    const selection = this.baseTerminal.terminal.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).then(() => {
        this.showNotification('Copied to clipboard', 'success');
      });
    }
  }

  getCurrentLine() {
    // Simplified method to get current line
    // In a real implementation, this would need to track the current input
    return '';
  }

  replaceCurrentLine(text) {
    // Simplified method to replace current line
    // In a real implementation, this would clear the current line and write new text
    this.baseTerminal.terminal.write('\\r\\x1b[K' + text);
  }

  rewritePrompt(currentLine) {
    // Rewrite the prompt with current line
    this.baseTerminal.terminal.write('$ ' + currentLine);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-color, #00ff88);
      color: var(--bg-primary, #1a1a1a);
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

module.exports = EnhancedTerminal;

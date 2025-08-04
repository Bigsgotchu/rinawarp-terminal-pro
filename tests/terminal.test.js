/**
 * @jest-environment jsdom
 */

/**
 * Test Suite for RinaWarp Terminal
 * Unit and integration tests for core functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../src/renderer/terminal-wrapper.js');
jest.mock('../src/renderer/shell-harness.js');

// Import modules to test
import { AutoCompleteSystem } from '../src/renderer/autocomplete-system.js';
import { SyntaxHighlighter } from '../src/renderer/syntax-highlighter.js';
import { CommandHistory } from '../src/renderer/command-history.js';
import { TerminalThemes } from '../src/renderer/terminal-themes.js';
import { ErrorHandler } from '../src/renderer/error-handler.js';

describe('AutoCompleteSystem', () => {
  let terminal;
  let autoComplete;

  beforeEach(() => {
    // Mock terminal
    terminal = {
      buffer: {
        active: {
          cursorX: 0,
          cursorY: 0,
          getLine: jest.fn(),
        },
      },
      write: jest.fn(),
      attachCustomKeyEventHandler: jest.fn(),
      onData: jest.fn(),
    };

    // Mock DOM
    document.body.innerHTML = '<div id="terminal"></div>';

    autoComplete = new AutoCompleteSystem(terminal);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for git commands', () => {
      const suggestions = autoComplete.generateSuggestions('git st');
      expect(suggestions).toContain('git status');
    });

    it('should generate suggestions for npm commands', () => {
      const suggestions = autoComplete.generateSuggestions('npm i');
      expect(suggestions).toContain('npm install');
    });

    it('should return empty array for short input', () => {
      const suggestions = autoComplete.generateSuggestions('g');
      expect(suggestions).toEqual([]);
    });

    it('should limit suggestions to 10', () => {
      const suggestions = autoComplete.generateSuggestions('Get-');
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('command history integration', () => {
    it('should add commands to history', () => {
      // Set up autocomplete with suggestions
      autoComplete.suggestions = ['git status', 'git stash'];
      autoComplete.currentIndex = 0;
      autoComplete.isActive = true;
      
      const addHistorySpy = jest.spyOn(autoComplete, 'addToHistory');
      
      // Mock getCurrentLine to return a value
      autoComplete.getCurrentLine = jest.fn(() => 'git st');
      
      autoComplete.selectSuggestion();
      expect(addHistorySpy).toHaveBeenCalledWith('git status');
    });
  });
});

describe('SyntaxHighlighter', () => {
  let terminal;
  let highlighter;

  beforeEach(() => {
    terminal = {
      write: jest.fn(),
    };

    highlighter = new SyntaxHighlighter(terminal);
  });

  describe('detectCommandType', () => {
    it('should detect git commands', () => {
      expect(highlighter.detectCommandType('git status')).toBe('git');
    });

    it('should detect npm commands', () => {
      expect(highlighter.detectCommandType('npm install')).toBe('npm');
    });

    it('should detect PowerShell cmdlets', () => {
      expect(highlighter.detectCommandType('Get-Process')).toBe('powershell');
    });
  });

  describe('highlighting', () => {
    it('should highlight git branches in green', () => {
      const result = highlighter.highlightGit('git checkout master');
      expect(result).toContain('\x1b[32m'); // Green color code
      expect(result).toContain('master');
    });

    it('should highlight errors in red', () => {
      const result = highlighter.highlightGeneric('error: command failed');
      expect(result).toContain('\x1b[31m'); // Red color code
    });
  });
});

describe('CommandHistory', () => {
  let terminal;
  let history;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    terminal = {
      buffer: {
        active: {
          cursorY: 0,
          getLine: jest.fn(() => ({
            length: 10,
            getCell: jest.fn(() => ({ getChars: () => 'test' })),
          })),
        },
      },
      write: jest.fn(),
      attachCustomKeyEventHandler: jest.fn(),
      onData: jest.fn(),
    };

    document.body.innerHTML = '<div id="terminal"></div>';
    history = new CommandHistory(terminal);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('command storage', () => {
    it('should add commands to history', () => {
      history.addCommand('ls -la');
      expect(history.history).toContain('ls -la');
    });

    it('should not add duplicate consecutive commands', () => {
      history.addCommand('pwd');
      history.addCommand('pwd');
      expect(history.history.filter(cmd => cmd === 'pwd').length).toBe(1);
    });

    it('should persist history to localStorage', () => {
      history.addCommand('git status');
      history.saveHistory();

      const saved = localStorage.getItem('rinawarp-command-history');
      expect(saved).toContain('git status');
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      history.history = ['cmd1', 'cmd2', 'cmd3'];
      history.currentIndex = history.history.length;
    });

    it('should navigate backward through history', () => {
      history.navigateHistory(-1);
      expect(history.currentIndex).toBe(2);
    });

    it('should navigate forward through history', () => {
      history.currentIndex = 0;
      history.navigateHistory(1);
      expect(history.currentIndex).toBe(1);
    });
  });
});

describe('TerminalThemes', () => {
  let themes;

  beforeEach(() => {
    localStorage.clear();
    themes = new TerminalThemes();
  });

  describe('theme management', () => {
    it('should have default themes', () => {
      expect(themes.themes['mermaid-ocean']).toBeDefined();
      expect(themes.themes['cyberpunk']).toBeDefined();
      expect(themes.themes['dracula']).toBeDefined();
    });

    it('should apply theme to document', () => {
      themes.applyTheme('matrix');

      const style = document.getElementById('terminal-theme-styles');
      expect(style).toBeDefined();
      expect(style.textContent).toContain('#00FF00'); // Matrix green
    });

    it('should save theme preference', () => {
      themes.applyTheme('midnight');

      const saved = localStorage.getItem('rinawarp-theme');
      expect(saved).toBe('midnight');
    });
  });

  describe('custom themes', () => {
    it('should create custom theme', () => {
      const _customTheme = themes.createCustomTheme({
        name: 'My Theme',
        background: '#000000',
        foreground: '#FFFFFF',
      });

      expect(themes.themes['custom']).toBeDefined();
      expect(themes.themes['custom'].name).toBe('My Theme');
    });

    it('should export theme as JSON', () => {
      const exported = themes.exportTheme('mermaid-ocean');
      const parsed = JSON.parse(exported);

      expect(parsed.name).toBe('Mermaid Ocean');
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler;

  beforeEach(() => {
    document.body.innerHTML = '';
    errorHandler = new ErrorHandler();
  });

  describe('error categorization', () => {
    it('should determine severity for terminal failures', () => {
      const severity = errorHandler.determineErrorSeverity({
        error: new Error('terminal failed to initialize'),
      });
      expect(severity).toBe(3); // Critical
    });

    it('should determine severity for warnings', () => {
      const severity = errorHandler.determineErrorSeverity({
        error: new Error('deprecated function warning'),
      });
      expect(severity).toBe(2); // Warning
    });
  });

  describe('user-friendly messages', () => {
    it('should convert technical errors to friendly messages', () => {
      const friendly = errorHandler.getUserFriendlyMessage('ENOENT: no such file');
      expect(friendly).toBe('File or directory not found.');
    });

    it('should handle network errors', () => {
      const friendly = errorHandler.getUserFriendlyMessage('Network error: timeout');
      expect(friendly).toBe('Connection problem. Please check your internet.');
    });
  });

  describe('error logging', () => {
    it('should log errors to errorLog', () => {
      errorHandler.handleError({
        type: 'test',
        error: new Error('Test error'),
      });

      expect(errorHandler.errorLog.length).toBeGreaterThan(0);
      expect(errorHandler.errorLog[0].error.message).toBe('Test error');
    });

    it('should maintain maximum log size', () => {
      // Add more than maxLogSize errors
      for (let i = 0; i < 150; i++) {
        errorHandler.logError({
          error: new Error(`Error ${i}`),
        });
      }

      expect(errorHandler.errorLog.length).toBeLessThanOrEqual(100);
    });
  });
});

// Integration Tests
describe('Integration Tests', () => {
  describe('AutoComplete with CommandHistory', () => {
    it('should use command history for suggestions', () => {
      const terminal = {
        buffer: { active: { cursorY: 0 } },
        write: jest.fn(),
        attachCustomKeyEventHandler: jest.fn(),
        onData: jest.fn(),
      };

      const history = new CommandHistory(terminal);
      history.addCommand('git commit -m "test"');

      const autoComplete = new AutoCompleteSystem(terminal);
      autoComplete.commandHistory = history.history;

      const suggestions = autoComplete.generateSuggestions('git com');
      expect(suggestions).toContain('git commit -m "test"');
    });
  });

  describe('Theme with Syntax Highlighting', () => {
    it('should apply theme colors to syntax highlighting', () => {
      const terminal = { write: jest.fn() };
      const themes = new TerminalThemes();
      const highlighter = new SyntaxHighlighter(terminal);

      themes.applyTheme('matrix');

      // Matrix theme uses green for everything
      const highlighted = highlighter.highlightGeneric('success');
      expect(highlighted).toContain('\x1b[32m'); // Green
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  it('should handle large command history efficiently', () => {
    const terminal = {
      buffer: { active: { cursorY: 0 } },
      write: jest.fn(),
      attachCustomKeyEventHandler: jest.fn(),
      onData: jest.fn(),
    };

    const history = new CommandHistory(terminal);

    const startTime = Date.now();

    // Add 1000 commands
    for (let i = 0; i < 1000; i++) {
      history.addCommand(`command ${i}`);
    }

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    expect(timeTaken).toBeLessThan(1000); // Should complete in less than 1 second
  });

  it('should generate suggestions quickly', () => {
    const terminal = {
      buffer: {
        active: {
          cursorX: 0,
          cursorY: 0,
          getLine: jest.fn(),
        },
      },
      write: jest.fn(),
      attachCustomKeyEventHandler: jest.fn(),
      onData: jest.fn(),
      cols: 80,
      rows: 24
    };
    const autoComplete = new AutoCompleteSystem(terminal);

    const startTime = Date.now();

    // Generate suggestions 100 times
    for (let i = 0; i < 100; i++) {
      autoComplete.generateSuggestions('git');
    }

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    expect(timeTaken).toBeLessThan(100); // Should complete in less than 100ms
  });
});

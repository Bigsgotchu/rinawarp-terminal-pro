/**
 * Split Pane System for RinaWarp Terminal
 * Allows users to split terminal into multiple panes for multitasking
 */

export class SplitPaneManager {
  constructor() {
    this.panes = [];
    this.activePane = null;
    this.container = null;
    this.resizing = false;
    this.maxPanes = 4;
    
    // Initialize
    this.init();
  }
  
  init() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'split-pane-container';
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      position: relative;
    `;
    
    // Replace terminal container content
    const terminalContainer = document.querySelector('.terminal-container');
    if (terminalContainer) {
      // Store original terminal
      this.originalTerminal = document.getElementById('terminal');
      
      // Clear and setup container
      terminalContainer.innerHTML = '';
      terminalContainer.appendChild(this.container);
      
      // Create initial pane with original terminal
      this.createPane(this.originalTerminal, true);
    }
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }
  
  createPane(terminalElement = null, isFirst = false) {
    if (this.panes.length >= this.maxPanes) {
      console.warn('Maximum number of panes reached');
      return null;
    }
    
    const pane = {
      id: `pane-${Date.now()}`,
      terminal: null,
      terminalWrapper: null,
      element: null,
      size: 100 / (this.panes.length + 1) // Equal split
    };
    
    // Create pane element
    pane.element = document.createElement('div');
    pane.element.id = pane.id;
    pane.element.className = 'terminal-pane';
    pane.element.style.cssText = `
      flex: 1;
      position: relative;
      overflow: hidden;
      border: 2px solid transparent;
      transition: border-color 0.3s;
    `;
    
    // Create terminal container within pane
    const terminalDiv = document.createElement('div');
    terminalDiv.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    pane.element.appendChild(terminalDiv);
    
    // Use existing terminal for first pane, create new for others
    if (isFirst && terminalElement) {
      terminalDiv.appendChild(terminalElement);
      pane.terminal = window.terminal;
      pane.terminalWrapper = window.terminalWrapper;
    } else {
      // Create new terminal instance
      this.createNewTerminal(pane, terminalDiv);
    }
    
    // Add click handler for focus
    pane.element.addEventListener('click', () => {
      this.setActivePane(pane);
    });
    
    // Add to container
    this.container.appendChild(pane.element);
    
    // Add resize handle if not the last pane
    if (this.panes.length > 0) {
      this.addResizeHandle(pane);
    }
    
    // Store pane
    this.panes.push(pane);
    
    // Update all pane sizes
    this.updatePaneSizes();
    
    // Set as active
    this.setActivePane(pane);
    
    return pane;
  }
  
  async createNewTerminal(pane, container) {
    try {
      // Import terminal wrapper
      const { TerminalWrapper } = await import('./terminal-wrapper.js');
      
      // Create new terminal wrapper
      pane.terminalWrapper = new TerminalWrapper();
      await pane.terminalWrapper.initialize(container);
      pane.terminal = pane.terminalWrapper.terminal;
      
      // Initialize additional features for new terminal
      this.initializeTerminalFeatures(pane);
      
    } catch (error) {
      console.error('Failed to create new terminal:', error);
      container.innerHTML = `
        <div style="color: #ff6b6b; padding: 20px; text-align: center;">
          Failed to create terminal pane
        </div>
      `;
    }
  }
  
  initializeTerminalFeatures(pane) {
    // Initialize autocomplete
    if (window.AutoCompleteSystem) {
      pane.autoComplete = new window.AutoCompleteSystem(pane.terminal);
    }
    
    // Initialize syntax highlighting
    if (window.SyntaxHighlighter) {
      pane.syntaxHighlighter = new window.SyntaxHighlighter(pane.terminal);
    }
    
    // Initialize command history
    if (window.CommandHistory) {
      pane.commandHistory = new window.CommandHistory(pane.terminal);
    }
  }
  
  addResizeHandle(pane) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.cssText = `
      position: absolute;
      top: 0;
      right: -3px;
      width: 6px;
      height: 100%;
      cursor: col-resize;
      background: transparent;
      z-index: 10;
    `;
    
    handle.addEventListener('mouseenter', () => {
      handle.style.background = 'rgba(0, 170, 255, 0.5)';
    });
    
    handle.addEventListener('mouseleave', () => {
      if (!this.resizing) {
        handle.style.background = 'transparent';
      }
    });
    
    handle.addEventListener('mousedown', (e) => {
      this.startResize(e, pane);
    });
    
    pane.element.appendChild(handle);
  }
  
  startResize(e, pane) {
    this.resizing = true;
    this.resizingPane = pane;
    this.startX = e.clientX;
    this.startWidth = pane.element.offsetWidth;
    
    document.addEventListener('mousemove', this.handleResize);
    document.addEventListener('mouseup', this.stopResize);
    
    // Prevent text selection
    document.body.style.userSelect = 'none';
  }
  
  handleResize = (e) => {
    if (!this.resizing) return;
    
    const deltaX = e.clientX - this.startX;
    const containerWidth = this.container.offsetWidth;
    const newWidth = this.startWidth + deltaX;
    const percentage = (newWidth / containerWidth) * 100;
    
    // Set minimum and maximum widths
    if (percentage > 20 && percentage < 80) {
      this.resizingPane.element.style.flex = `0 0 ${percentage}%`;
      
      // Adjust other panes
      this.redistributePanes(this.resizingPane, percentage);
    }
  };
  
  stopResize = () => {
    this.resizing = false;
    this.resizingPane = null;
    
    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.stopResize);
    
    // Re-enable text selection
    document.body.style.userSelect = '';
    
    // Hide all resize handles
    document.querySelectorAll('.resize-handle').forEach(handle => {
      handle.style.background = 'transparent';
    });
  };
  
  redistributePanes(excludePane, usedPercentage) {
    const remainingPercentage = 100 - usedPercentage;
    const otherPanes = this.panes.filter(p => p !== excludePane);
    const percentagePerPane = remainingPercentage / otherPanes.length;
    
    otherPanes.forEach(pane => {
      pane.element.style.flex = `0 0 ${percentagePerPane}%`;
    });
  }
  
  updatePaneSizes() {
    const paneCount = this.panes.length;
    const percentagePerPane = 100 / paneCount;
    
    this.panes.forEach(pane => {
      pane.element.style.flex = `0 0 ${percentagePerPane}%`;
    });
  }
  
  setActivePane(pane) {
    // Remove active class from all panes
    this.panes.forEach(p => {
      p.element.style.borderColor = 'transparent';
    });
    
    // Set active pane
    this.activePane = pane;
    pane.element.style.borderColor = 'rgba(0, 170, 255, 0.5)';
    
    // Focus terminal
    if (pane.terminal) {
      pane.terminal.focus();
    }
    
    // Update global terminal reference for compatibility
    window.terminal = pane.terminal;
    window.terminalWrapper = pane.terminalWrapper;
  }
  
  closePane(pane = null) {
    const targetPane = pane || this.activePane;
    
    if (!targetPane || this.panes.length === 1) {
      console.warn('Cannot close the last pane');
      return;
    }
    
    // Remove from DOM
    targetPane.element.remove();
    
    // Remove from panes array
    const index = this.panes.indexOf(targetPane);
    this.panes.splice(index, 1);
    
    // Clean up terminal
    if (targetPane.terminal && targetPane.terminal.dispose) {
      targetPane.terminal.dispose();
    }
    
    // Update sizes and set new active pane
    this.updatePaneSizes();
    if (this.activePane === targetPane) {
      this.setActivePane(this.panes[0]);
    }
  }
  
  splitHorizontal() {
    // Change flex direction for horizontal split
    this.container.style.flexDirection = 'column';
    this.createPane();
  }
  
  splitVertical() {
    // Change flex direction for vertical split
    this.container.style.flexDirection = 'row';
    this.createPane();
  }
  
  focusPane(direction) {
    if (!this.activePane) return;
    
    const currentIndex = this.panes.indexOf(this.activePane);
    let newIndex;
    
    switch (direction) {
    case 'left':
    case 'up':
      newIndex = currentIndex - 1;
      break;
    case 'right':
    case 'down':
      newIndex = currentIndex + 1;
      break;
    }
    
    if (newIndex >= 0 && newIndex < this.panes.length) {
      this.setActivePane(this.panes[newIndex]);
    }
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D for vertical split
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.splitVertical();
      }
      
      // Ctrl+Shift+E for horizontal split
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.splitHorizontal();
      }
      
      // Ctrl+Shift+W to close pane
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        this.closePane();
      }
      
      // Alt+Arrow keys to navigate panes
      if (e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase();
        this.focusPane(direction);
      }
    });
  }
  
  // Get all terminals
  getAllTerminals() {
    return this.panes.map(pane => pane.terminal).filter(t => t);
  }
  
  // Execute command in all panes
  executeInAllPanes(command) {
    this.panes.forEach(pane => {
      if (pane.terminal) {
        pane.terminal.write(command + '\r');
      }
    });
  }
}

// Export for use in terminal
window.SplitPaneManager = SplitPaneManager;

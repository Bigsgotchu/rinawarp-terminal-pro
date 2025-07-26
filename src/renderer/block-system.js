/**
 * Block-Based Terminal System for RinaWarp
 * Inspired by WaveTerm's sophisticated block architecture
 */

export class BlockManager {
  constructor() {
    this.blocks = new Map();
    this.activeBlockId = null;
    this.layouts = new Map();
  }

  createTerminalBlock(config = {}) {
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const block = {
      id: blockId,
      type: 'terminal',
      title: config.title || 'Terminal',
      connection: config.connection || 'local',
      terminalConfig: {
        theme: config.theme || 'default',
        fontSize: config.fontSize || 12,
        fontFamily: config.fontFamily || 'Monaco, monospace',
        transparency: config.transparency || 0,
      },
      position: config.position || { x: 0, y: 0, width: 800, height: 600 },
      state: 'active',
      metadata: {
        created: new Date(),
        lastAccessed: new Date(),
        commandHistory: [],
        workingDirectory: config.cwd || process.cwd(),
      },
    };

    this.blocks.set(blockId, block);
    this.createBlockElement(block);

    return blockId;
  }

  createBlockElement(block) {
    const container = document.createElement('div');
    container.className = 'terminal-block';
    container.id = `block-${block.id}`;
    container.style.cssText = `
            position: absolute;
            left: ${block.position.x}px;
            top: ${block.position.y}px;
            width: ${block.position.width}px;
            height: ${block.position.height}px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--terminal-bg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

    // Create header with title and controls
    const header = this.createBlockHeader(block);
    container.appendChild(header);

    // Create terminal container
    const terminalContainer = document.createElement('div');
    terminalContainer.className = 'terminal-container';
    terminalContainer.style.cssText = `
            flex: 1;
            position: relative;
            background: var(--terminal-bg);
        `;
    container.appendChild(terminalContainer);

    // Initialize terminal in container
    this.initializeTerminalInBlock(block.id, terminalContainer);

    // Add to workspace
    const workspace = document.getElementById('workspace') || document.body;
    workspace.appendChild(container);

    // Make resizable and draggable
    this.makeBlockInteractive(container, block);
  }

  createBlockHeader(block) {
    const header = document.createElement('div');
    header.className = 'block-header';
    header.style.cssText = `
            height: 32px;
            background: var(--header-bg, #2a2a2a);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            cursor: move;
            user-select: none;
        `;

    // Title and connection info
    const titleSection = document.createElement('div');
    titleSection.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const title = document.createElement('span');
    title.textContent = block.title;
    title.style.cssText = 'color: var(--text-color); font-size: 12px; font-weight: 500;';

    const connectionBadge = document.createElement('span');
    connectionBadge.textContent = block.connection;
    connectionBadge.style.cssText = `
            background: var(--accent-color, #007acc);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            text-transform: uppercase;
        `;

    titleSection.appendChild(title);
    titleSection.appendChild(connectionBadge);

    // Control buttons
    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 4px;';

    const minimizeBtn = this.createControlButton('−', () => this.minimizeBlock(block.id));
    const maximizeBtn = this.createControlButton('□', () => this.maximizeBlock(block.id));
    const closeBtn = this.createControlButton('×', () => this.closeBlock(block.id));

    controls.appendChild(minimizeBtn);
    controls.appendChild(maximizeBtn);
    controls.appendChild(closeBtn);

    header.appendChild(titleSection);
    header.appendChild(controls);

    return header;
  }

  createControlButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
            width: 20px;
            height: 20px;
            border: none;
            background: transparent;
            color: var(--text-color);
            cursor: pointer;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            line-height: 1;
        `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255,255,255,0.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
    });

    button.addEventListener('click', onClick);
    return button;
  }

  async initializeTerminalInBlock(blockId, container) {
    const block = this.blocks.get(blockId);
    if (!block) return;

    try {
      // Initialize xterm.js terminal
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      const { WebLinksAddon } = await import('xterm-addon-web-links');
      const { SearchAddon } = await import('xterm-addon-search');

      const terminal = new Terminal({
        theme: this.getTerminalTheme(block.terminalConfig.theme),
        fontSize: block.terminalConfig.fontSize,
        fontFamily: block.terminalConfig.fontFamily,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 10000,
        allowTransparency: block.terminalConfig.transparency > 0,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddon);

      terminal.open(container);
      fitAddon.fit();

      // Store terminal reference in block
      block.terminal = terminal;
      block.fitAddon = fitAddon;
      block.searchAddon = searchAddon;

      // Connect to shell process
      await this.connectBlockToShell(blockId);

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(container);

      console.log(`✅ Terminal initialized in block ${blockId}`);
    } catch (error) {
      console.error(`❌ Failed to initialize terminal in block ${blockId}:`, error);
    }
  }

  async connectBlockToShell(blockId) {
    const block = this.blocks.get(blockId);
    if (!block || !block.terminal) return;

    try {
      // Create shell process via IPC
      const shellConfig = {
        shell: this.getShellForConnection(block.connection),
        shellArgs: [],
        terminalId: blockId,
        platform: (await window.nodeAPI?.getPlatform()) || process.platform,
      };

      const processInfo = await window.electronAPI.ipcRenderer.invoke(
        'create-shell-process',
        shellConfig
      );
      block.processId = processInfo.id;

      // Handle shell output
      window.electronAPI.ipcRenderer.on(`shell-data-${processInfo.id}`, (event, data) => {
        block.terminal.write(data);
        block.metadata.lastAccessed = new Date();
      });

      // Handle shell errors
      window.electronAPI.ipcRenderer.on(`shell-error-${processInfo.id}`, (event, data) => {
        block.terminal.write(`\r\n\x1b[31m${data}\x1b[0m`);
      });

      // Handle input from terminal
      block.terminal.onData(data => {
        window.electronAPI.ipcRenderer.invoke('write-to-shell', processInfo.id, data);
      });

      console.log(`✅ Block ${blockId} connected to shell process ${processInfo.id}`);
    } catch (error) {
      console.error(`❌ Failed to connect block ${blockId} to shell:`, error);
    }
  }

  getShellForConnection(connection) {
    // This could be expanded to support different connections
    switch (connection) {
    case 'local':
      return process.platform === 'win32' ? 'pwsh.exe' : '/bin/bash';
    case 'ssh':
      return 'ssh';
    default:
      return process.platform === 'win32' ? 'pwsh.exe' : '/bin/bash';
    }
  }

  getTerminalTheme(themeName) {
    const themes = {
      default: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#264f78',
        black: '#000000',
        red: '#f14c4c',
        green: '#23d18b',
        yellow: '#f5f543',
        blue: '#3b8eea',
        magenta: '#d670d6',
        cyan: '#29b8db',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      dark: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#c9d1d9',
      },
      light: {
        background: '#ffffff',
        foreground: '#24292f',
        cursor: '#24292f',
      },
    };

    return themes[themeName] || themes.default;
  }

  makeBlockInteractive(element, block) {
    let isDragging = false;
    const _isResizing = false;
    let dragStart = { x: 0, y: 0 };
    let elementStart = { x: 0, y: 0 };

    const header = element.querySelector('.block-header');

    // Dragging functionality
    header.addEventListener('mousedown', e => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      elementStart = {
        x: parseInt(element.style.left),
        y: parseInt(element.style.top),
      };
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', onDragEnd);
      e.preventDefault();
    });

    const onDrag = e => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newX = elementStart.x + deltaX;
      const newY = elementStart.y + deltaY;

      element.style.left = `${Math.max(0, newX)}px`;
      element.style.top = `${Math.max(0, newY)}px`;

      // Update block position
      block.position.x = newX;
      block.position.y = newY;
    };

    const onDragEnd = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', onDragEnd);
    };

    // Add resize handles
    this.addResizeHandles(element, block);
  }

  addResizeHandles(element, block) {
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

    handles.forEach(handle => {
      const handleElement = document.createElement('div');
      handleElement.className = `resize-handle resize-${handle}`;
      handleElement.style.cssText = this.getResizeHandleStyle(handle);

      handleElement.addEventListener('mousedown', e => {
        this.startResize(e, element, block, handle);
      });

      element.appendChild(handleElement);
    });
  }

  getResizeHandleStyle(handle) {
    const base = 'position: absolute; background: transparent;';

    switch (handle) {
    case 'nw':
      return `${base} top: -3px; left: -3px; width: 6px; height: 6px; cursor: nw-resize;`;
    case 'ne':
      return `${base} top: -3px; right: -3px; width: 6px; height: 6px; cursor: ne-resize;`;
    case 'sw':
      return `${base} bottom: -3px; left: -3px; width: 6px; height: 6px; cursor: sw-resize;`;
    case 'se':
      return `${base} bottom: -3px; right: -3px; width: 6px; height: 6px; cursor: se-resize;`;
    case 'n':
      return `${base} top: -3px; left: 6px; right: 6px; height: 6px; cursor: n-resize;`;
    case 's':
      return `${base} bottom: -3px; left: 6px; right: 6px; height: 6px; cursor: s-resize;`;
    case 'e':
      return `${base} right: -3px; top: 6px; bottom: 6px; width: 6px; cursor: e-resize;`;
    case 'w':
      return `${base} left: -3px; top: 6px; bottom: 6px; width: 6px; cursor: w-resize;`;
    }
  }

  startResize(e, element, block, handle) {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(element.style.width);
    const startHeight = parseInt(element.style.height);
    const startLeft = parseInt(element.style.left);
    const startTop = parseInt(element.style.top);

    const onResize = e => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      // Handle different resize directions
      if (handle.includes('e')) newWidth = Math.max(200, startWidth + deltaX);
      if (handle.includes('w')) {
        newWidth = Math.max(200, startWidth - deltaX);
        newLeft = startLeft + deltaX;
      }
      if (handle.includes('s')) newHeight = Math.max(150, startHeight + deltaY);
      if (handle.includes('n')) {
        newHeight = Math.max(150, startHeight - deltaY);
        newTop = startTop + deltaY;
      }

      // Apply new dimensions
      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;

      // Update block position/size
      block.position = { x: newLeft, y: newTop, width: newWidth, height: newHeight };

      // Trigger terminal resize
      if (block.fitAddon) {
        setTimeout(() => block.fitAddon.fit(), 10);
      }
    };

    const onResizeEnd = () => {
      document.removeEventListener('mousemove', onResize);
      document.removeEventListener('mouseup', onResizeEnd);
    };

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', onResizeEnd);
  }

  minimizeBlock(blockId) {
    const element = document.getElementById(`block-${blockId}`);
    if (element) {
      element.style.display = element.style.display === 'none' ? 'flex' : 'none';
    }
  }

  maximizeBlock(blockId) {
    const element = document.getElementById(`block-${blockId}`);
    const block = this.blocks.get(blockId);

    if (element && block) {
      if (block.isMaximized) {
        // Restore
        element.style.left = `${block.originalPosition.x}px`;
        element.style.top = `${block.originalPosition.y}px`;
        element.style.width = `${block.originalPosition.width}px`;
        element.style.height = `${block.originalPosition.height}px`;
        block.isMaximized = false;
      } else {
        // Maximize
        block.originalPosition = { ...block.position };
        element.style.left = '0px';
        element.style.top = '0px';
        element.style.width = '100vw';
        element.style.height = '100vh';
        block.isMaximized = true;
      }

      // Trigger terminal resize
      if (block.fitAddon) {
        setTimeout(() => block.fitAddon.fit(), 100);
      }
    }
  }

  async closeBlock(blockId) {
    const block = this.blocks.get(blockId);
    const element = document.getElementById(`block-${blockId}`);

    if (block) {
      // Kill shell process
      if (block.processId) {
        await window.electronAPI.ipcRenderer.invoke('kill-shell-process', block.processId);
      }

      // Dispose terminal
      if (block.terminal) {
        block.terminal.dispose();
      }

      // Remove from DOM
      if (element) {
        element.remove();
      }

      // Remove from memory
      this.blocks.delete(blockId);

      console.log(`✅ Block ${blockId} closed`);
    }
  }

  saveLayout(name) {
    const layout = {
      name,
      timestamp: new Date(),
      blocks: Array.from(this.blocks.entries()).map(([id, block]) => ({
        id,
        type: block.type,
        title: block.title,
        connection: block.connection,
        position: block.position,
        terminalConfig: block.terminalConfig,
        metadata: {
          workingDirectory: block.metadata.workingDirectory,
        },
      })),
    };

    this.layouts.set(name, layout);

    // Save to local storage or file
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`rinawarp-layout-${name}`, JSON.stringify(layout));
    }

    console.log(`✅ Layout "${name}" saved with ${layout.blocks.length} blocks`);
    return layout;
  }

  async loadLayout(name) {
    let layout = this.layouts.get(name);

    if (!layout && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`rinawarp-layout-${name}`);
      if (stored) {
        layout = JSON.parse(stored);
      }
    }

    if (!layout) {
      throw new Error(`Layout "${name}" not found`);
    }

    // Clear existing blocks
    for (const blockId of this.blocks.keys()) {
      await this.closeBlock(blockId);
    }

    // Recreate blocks from layout
    for (const blockConfig of layout.blocks) {
      const _newBlockId = this.createTerminalBlock({
        title: blockConfig.title,
        connection: blockConfig.connection,
        position: blockConfig.position,
        theme: blockConfig.terminalConfig.theme,
        fontSize: blockConfig.terminalConfig.fontSize,
        fontFamily: blockConfig.terminalConfig.fontFamily,
        transparency: blockConfig.terminalConfig.transparency,
        cwd: blockConfig.metadata.workingDirectory,
      });

      console.log(
        `✅ Restored block "${blockConfig.title}" at ${blockConfig.position.x},${blockConfig.position.y}`
      );
    }

    console.log(`✅ Layout "${name}" loaded with ${layout.blocks.length} blocks`);
    return layout;
  }

  getActiveBlock() {
    return this.blocks.get(this.activeBlockId);
  }

  getAllBlocks() {
    return Array.from(this.blocks.values());
  }

  getAllLayouts() {
    return Array.from(this.layouts.values());
  }
}

// Export for use in other modules
window.BlockManager = BlockManager;

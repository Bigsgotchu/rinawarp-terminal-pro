/**
 * RinaWarp Terminal - Visual Command Builder 🧜‍♀️
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Interactive visual interface for building terminal commands with checkboxes, dropdowns, and guides
 */

class VisualCommandBuilder {
  constructor() {
    this.isVisible = false;
    this.currentCategory = 'git';
    this.commandDefinitions = this.initializeCommandDefinitions();
    this.templates = this.initializeTemplates();
    this.setupEventListeners();
    this.createBuilderUI();

    // Initialize analytics tracking
    this.startTime = Date.now();
    this.sessionCommands = new Map();
    this.setupAnalyticsTracking();
  }

  initializeCommandDefinitions() {
    return {
      git: {
        icon: '🐙',
        name: 'Git Operations',
        description:
          'Version control with Git - track changes, collaborate, and manage code history',
        commands: {
          add: {
            name: 'Stage Files',
            description: 'Add files to staging area before committing',
            base: 'git add',
            options: [
              { name: 'all', flag: '.', description: 'Add all changed files', type: 'checkbox' },
              {
                name: 'specific',
                flag: '',
                description: 'Add specific files',
                type: 'file-picker',
              },
              {
                name: 'interactive',
                flag: '-i',
                description: 'Interactive staging',
                type: 'checkbox',
              },
              {
                name: 'patch',
                flag: '-p',
                description: 'Patch mode (review each change)',
                type: 'checkbox',
              },
            ],
          },
          commit: {
            name: 'Commit Changes',
            description: 'Save staged changes with a message',
            base: 'git commit',
            options: [
              {
                name: 'message',
                flag: '-m',
                description: 'Commit message',
                type: 'text',
                required: true,
              },
              {
                name: 'all',
                flag: '-a',
                description: 'Automatically stage modified files',
                type: 'checkbox',
              },
              {
                name: 'amend',
                flag: '--amend',
                description: 'Modify the last commit',
                type: 'checkbox',
              },
              {
                name: 'no-edit',
                flag: '--no-edit',
                description: 'Use previous commit message (with --amend)',
                type: 'checkbox',
              },
            ],
          },
          push: {
            name: 'Push to Remote',
            description: 'Upload local commits to remote repository',
            base: 'git push',
            options: [
              {
                name: 'origin',
                flag: 'origin',
                description: 'Push to origin remote',
                type: 'checkbox',
                default: true,
              },
              {
                name: 'branch',
                flag: '',
                description: 'Specific branch',
                type: 'text',
                placeholder: 'main',
              },
              {
                name: 'force',
                flag: '--force',
                description: '⚠️ Force push (dangerous!)',
                type: 'checkbox',
              },
              {
                name: 'set-upstream',
                flag: '-u',
                description: 'Set upstream for new branch',
                type: 'checkbox',
              },
            ],
          },
          pull: {
            name: 'Pull from Remote',
            description: 'Download and merge changes from remote repository',
            base: 'git pull',
            options: [
              {
                name: 'origin',
                flag: 'origin',
                description: 'Pull from origin remote',
                type: 'checkbox',
                default: true,
              },
              {
                name: 'branch',
                flag: '',
                description: 'Specific branch',
                type: 'text',
                placeholder: 'main',
              },
              {
                name: 'rebase',
                flag: '--rebase',
                description: 'Rebase instead of merge',
                type: 'checkbox',
              },
              {
                name: 'force',
                flag: '--force',
                description: '⚠️ Force pull (dangerous!)',
                type: 'checkbox',
              },
            ],
          },
          status: {
            name: 'Check Status',
            description: 'See what files have changed and staging status',
            base: 'git status',
            options: [
              { name: 'short', flag: '-s', description: 'Short format output', type: 'checkbox' },
              {
                name: 'porcelain',
                flag: '--porcelain',
                description: 'Machine-readable output',
                type: 'checkbox',
              },
            ],
          },
          branch: {
            name: 'Branch Management',
            description: 'Create, list, or delete branches',
            base: 'git branch',
            options: [
              {
                name: 'list',
                flag: '',
                description: 'List all branches',
                type: 'radio',
                group: 'action',
              },
              {
                name: 'create',
                flag: '',
                description: 'Create new branch',
                type: 'radio',
                group: 'action',
              },
              {
                name: 'delete',
                flag: '-d',
                description: 'Delete branch',
                type: 'radio',
                group: 'action',
              },
              {
                name: 'branch-name',
                flag: '',
                description: 'Branch name',
                type: 'text',
                dependsOn: ['create', 'delete'],
              },
            ],
          },
        },
      },

      file: {
        icon: '📁',
        name: 'File Operations',
        description: 'Manage files and directories with safe, guided operations',
        commands: {
          list: {
            name: 'List Files',
            description: 'Show files and directories in current or specified location',
            base: 'ls',
            options: [
              {
                name: 'long',
                flag: '-l',
                description: 'Long format (detailed info)',
                type: 'checkbox',
              },
              { name: 'all', flag: '-a', description: 'Show hidden files', type: 'checkbox' },
              { name: 'human', flag: '-h', description: 'Human-readable sizes', type: 'checkbox' },
              {
                name: 'sort-time',
                flag: '-t',
                description: 'Sort by modification time',
                type: 'checkbox',
              },
              { name: 'reverse', flag: '-r', description: 'Reverse order', type: 'checkbox' },
              {
                name: 'path',
                flag: '',
                description: 'Specific directory',
                type: 'directory-picker',
              },
            ],
          },
          copy: {
            name: 'Copy Files',
            description: 'Copy files or directories to a new location',
            base: 'cp',
            options: [
              {
                name: 'source',
                flag: '',
                description: 'Source file/directory',
                type: 'file-picker',
                required: true,
              },
              {
                name: 'destination',
                flag: '',
                description: 'Destination path',
                type: 'directory-picker',
                required: true,
              },
              {
                name: 'recursive',
                flag: '-r',
                description: 'Copy directories recursively',
                type: 'checkbox',
              },
              {
                name: 'preserve',
                flag: '-p',
                description: 'Preserve file attributes',
                type: 'checkbox',
              },
              {
                name: 'interactive',
                flag: '-i',
                description: 'Ask before overwriting',
                type: 'checkbox',
              },
              {
                name: 'verbose',
                flag: '-v',
                description: "Show what's being copied",
                type: 'checkbox',
              },
            ],
          },
          move: {
            name: 'Move/Rename',
            description: 'Move files to new location or rename them',
            base: 'mv',
            options: [
              {
                name: 'source',
                flag: '',
                description: 'Source file/directory',
                type: 'file-picker',
                required: true,
              },
              {
                name: 'destination',
                flag: '',
                description: 'New location/name',
                type: 'text',
                required: true,
              },
              {
                name: 'interactive',
                flag: '-i',
                description: 'Ask before overwriting',
                type: 'checkbox',
              },
              {
                name: 'no-clobber',
                flag: '-n',
                description: "Don't overwrite existing files",
                type: 'checkbox',
              },
              {
                name: 'verbose',
                flag: '-v',
                description: "Show what's being moved",
                type: 'checkbox',
              },
            ],
          },
          remove: {
            name: 'Remove Files',
            description: '⚠️ Delete files or directories (be careful!)',
            base: 'rm',
            warning: 'This operation cannot be undone! Consider using trash/recycle bin instead.',
            options: [
              {
                name: 'files',
                flag: '',
                description: 'Files to remove',
                type: 'file-picker',
                required: true,
              },
              {
                name: 'recursive',
                flag: '-r',
                description: '⚠️ Remove directories recursively',
                type: 'checkbox',
              },
              {
                name: 'force',
                flag: '-f',
                description: '⚠️ Force removal (very dangerous!)',
                type: 'checkbox',
              },
              {
                name: 'interactive',
                flag: '-i',
                description: 'Ask for each file',
                type: 'checkbox',
              },
              {
                name: 'verbose',
                flag: '-v',
                description: "Show what's being removed",
                type: 'checkbox',
              },
            ],
          },
          permissions: {
            name: 'Change Permissions',
            description: 'Modify file and directory permissions',
            base: 'chmod',
            options: [
              {
                name: 'files',
                flag: '',
                description: 'Files to modify',
                type: 'file-picker',
                required: true,
              },
              {
                name: 'mode',
                flag: '',
                description: 'Permission mode',
                type: 'select',
                required: true,
                choices: [
                  { value: '755', label: '755 - Owner: read/write/execute, Others: read/execute' },
                  { value: '644', label: '644 - Owner: read/write, Others: read-only' },
                  { value: '600', label: '600 - Owner: read/write, Others: no access' },
                  { value: '777', label: '⚠️ 777 - Everyone: full access (security risk!)' },
                ],
              },
              {
                name: 'recursive',
                flag: '-R',
                description: 'Apply to directories recursively',
                type: 'checkbox',
              },
            ],
          },
        },
      },

      docker: {
        icon: '🐳',
        name: 'Docker Containers',
        description: 'Manage containers, images, and Docker environments',
        commands: {
          run: {
            name: 'Run Container',
            description: 'Create and start a new container from an image',
            base: 'docker run',
            options: [
              {
                name: 'image',
                flag: '',
                description: 'Docker image',
                type: 'text',
                required: true,
                placeholder: 'nginx:latest',
              },
              { name: 'detached', flag: '-d', description: 'Run in background', type: 'checkbox' },
              {
                name: 'interactive',
                flag: '-it',
                description: 'Interactive terminal',
                type: 'checkbox',
              },
              {
                name: 'name',
                flag: '--name',
                description: 'Container name',
                type: 'text',
                placeholder: 'my-container',
              },
              {
                name: 'port',
                flag: '-p',
                description: 'Port mapping',
                type: 'text',
                placeholder: '8080:80',
              },
              {
                name: 'volume',
                flag: '-v',
                description: 'Volume mapping',
                type: 'text',
                placeholder: '/host/path:/container/path',
              },
              {
                name: 'remove',
                flag: '--rm',
                description: 'Auto-remove when stopped',
                type: 'checkbox',
              },
            ],
          },
          ps: {
            name: 'List Containers',
            description: 'Show running or all containers',
            base: 'docker ps',
            options: [
              {
                name: 'all',
                flag: '-a',
                description: 'Show all containers (including stopped)',
                type: 'checkbox',
              },
              {
                name: 'quiet',
                flag: '-q',
                description: 'Show only container IDs',
                type: 'checkbox',
              },
              { name: 'size', flag: '-s', description: 'Show container sizes', type: 'checkbox' },
            ],
          },
          stop: {
            name: 'Stop Container',
            description: 'Stop one or more running containers',
            base: 'docker stop',
            options: [
              {
                name: 'containers',
                flag: '',
                description: 'Container names or IDs',
                type: 'text',
                required: true,
              },
              {
                name: 'time',
                flag: '-t',
                description: 'Seconds to wait before killing',
                type: 'number',
                placeholder: '10',
              },
            ],
          },
          images: {
            name: 'List Images',
            description: 'Show available Docker images',
            base: 'docker images',
            options: [
              { name: 'all', flag: '-a', description: 'Show all images', type: 'checkbox' },
              { name: 'quiet', flag: '-q', description: 'Show only image IDs', type: 'checkbox' },
              {
                name: 'digests',
                flag: '--digests',
                description: 'Show image digests',
                type: 'checkbox',
              },
            ],
          },
        },
      },

      system: {
        icon: '⚙️',
        name: 'System Commands',
        description: 'Monitor system resources and manage processes',
        commands: {
          processes: {
            name: 'List Processes',
            description: 'Show running processes and system information',
            base: 'ps',
            options: [
              {
                name: 'all-users',
                flag: 'aux',
                description: 'All processes for all users',
                type: 'checkbox',
              },
              {
                name: 'current-user',
                flag: 'x',
                description: 'All processes for current user',
                type: 'checkbox',
              },
              {
                name: 'full-format',
                flag: '-f',
                description: 'Full format listing',
                type: 'checkbox',
              },
            ],
          },
          disk_usage: {
            name: 'Disk Usage',
            description: 'Check disk space usage',
            base: 'df',
            options: [
              {
                name: 'human',
                flag: '-h',
                description: 'Human-readable sizes',
                type: 'checkbox',
                default: true,
              },
              {
                name: 'inodes',
                flag: '-i',
                description: 'Show inode information',
                type: 'checkbox',
              },
              { name: 'type', flag: '-T', description: 'Show filesystem type', type: 'checkbox' },
            ],
          },
          memory: {
            name: 'Memory Usage',
            description: 'Check memory and swap usage',
            base: 'free',
            options: [
              {
                name: 'human',
                flag: '-h',
                description: 'Human-readable sizes',
                type: 'checkbox',
                default: true,
              },
              { name: 'total', flag: '-t', description: 'Show total line', type: 'checkbox' },
              {
                name: 'seconds',
                flag: '-s',
                description: 'Repeat every N seconds',
                type: 'number',
                placeholder: '1',
              },
            ],
          },
        },
      },
    };
  }

  initializeTemplates() {
    return {
      git: [
        {
          name: 'Quick Commit All',
          command: 'git add . && git commit -m "Quick update" && git push',
        },
        {
          name: 'Safe Push',
          command: 'git status && git add . && git commit -m "Update" && git push',
        },
        { name: 'Check Status & Pull', command: 'git status && git pull' },
      ],
      file: [
        { name: 'Safe File Copy', command: 'cp -i -v source destination' },
        { name: 'List Details', command: 'ls -la' },
        { name: 'Safe Remove', command: 'rm -i filename' },
      ],
      docker: [
        { name: 'Run Web Server', command: 'docker run -d -p 8080:80 --name my-web nginx:latest' },
        { name: 'Interactive Shell', command: 'docker run -it --rm ubuntu:latest /bin/bash' },
        { name: 'Check All Containers', command: 'docker ps -a' },
      ],
    };
  }

  createBuilderUI() {
    // Create main builder container
    const builderContainer = document.createElement('div');
    builderContainer.id = 'visual-command-builder';
    builderContainer.className = 'command-builder hidden';
    builderContainer.innerHTML = `
      <div class="builder-content">
        <div class="builder-header">
          <h3>🧜‍♀️ Visual Command Builder</h3>
          <p class="builder-subtitle">Build terminal commands with visual controls - no memorizing needed!</p>
          <button class="builder-close" onclick="commandBuilder.hide()">×</button>
        </div>
        
        <div class="builder-body">
          <div class="category-tabs">
            ${Object.entries(this.commandDefinitions)
              .map(
                ([key, category]) =>
                  `<button class="category-tab ${key === 'git' ? 'active' : ''}" data-category="${key}">
                ${category.icon} ${category.name}
              </button>`
              )
              .join('')}
          </div>
          
          <div class="category-content">
            <div class="category-description">
              <p id="category-description">${this.commandDefinitions.git.description}</p>
            </div>
            
            <div class="commands-grid" id="commands-grid">
              <!-- Commands will be populated here -->
            </div>
          </div>
          
          <div class="command-preview">
            <div class="preview-header">
              <span class="preview-title">🌊 Command Preview:</span>
              <button class="copy-command" onclick="commandBuilder.copyCommand()" title="Copy to clipboard">📋</button>
            </div>
            <div class="preview-command" id="preview-command">
              <code>Select a command to see preview</code>
            </div>
            <div class="preview-actions">
              <button class="btn btn-secondary" onclick="commandBuilder.explainCommand()">
                🤔 Explain Command
              </button>
              <button class="btn btn-primary" onclick="commandBuilder.executeCommand()">
                🚀 Execute Command
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(builderContainer);
    this.container = builderContainer;
    this.setupBuilderEventListeners();
    this.renderCommands();
  }

  setupBuilderEventListeners() {
    // Category tab switching
    this.container.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', e => {
        const category = e.target.dataset.category;
        this.switchCategory(category);
      });
    });
  }

  setupEventListeners() {
    // Global keyboard shortcut (Ctrl+Shift+B for Builder)
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  show() {
    this.container.classList.remove('hidden');
    this.container.classList.add('visible');
    this.isVisible = true;

    // Track builder opened
    this.trackEvent('command-builder-opened', {
      trigger: 'manual',
      category: this.currentCategory,
      timestamp: Date.now(),
    });

    // Focus the first input if available
    setTimeout(() => {
      const firstInput = this.container.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 300);
  }

  hide() {
    const duration = Date.now() - this.startTime;

    this.container.classList.add('hidden');
    this.container.classList.remove('visible');
    this.isVisible = false;

    // Track builder closed
    this.trackEvent('command-builder-closed', {
      duration: duration,
      sessionCommands: this.sessionCommands.size,
      timestamp: Date.now(),
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  switchCategory(category) {
    this.currentCategory = category;

    // Update active tab
    this.container.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // Update description
    const descElement = this.container.querySelector('#category-description');
    descElement.textContent = this.commandDefinitions[category].description;

    // Re-render commands
    this.renderCommands();

    // Clear preview
    this.updatePreview('Select a command to see preview');
  }

  renderCommands() {
    const commandsGrid = this.container.querySelector('#commands-grid');
    const category = this.commandDefinitions[this.currentCategory];

    commandsGrid.innerHTML = Object.entries(category.commands)
      .map(([key, command]) => {
        return this.createCommandCard(key, command);
      })
      .join('');

    // Setup event listeners for the rendered commands
    this.setupCommandEventListeners();
  }

  createCommandCard(commandKey, command) {
    return `
      <div class="command-card" data-command="${commandKey}">
        <div class="command-header">
          <h4>${command.name}</h4>
          <p class="command-description">${command.description}</p>
          ${command.warning ? `<div class="command-warning">⚠️ ${command.warning}</div>` : ''}
        </div>
        <div class="command-options">
          ${command.options.map((option, index) => this.createOptionInput(commandKey, option, index)).join('')}
        </div>
        <div class="command-actions">
          <button class="btn btn-small btn-secondary" onclick="commandBuilder.previewCommand('${commandKey}')">
            👁️ Preview
          </button>
          <button class="btn btn-small btn-primary" onclick="commandBuilder.buildCommand('${commandKey}')">
            🔨 Build Command
          </button>
        </div>
      </div>
    `;
  }

  createOptionInput(commandKey, option, index) {
    const inputId = `${commandKey}-${option.name}-${index}`;
    const isRequired = option.required ? 'required' : '';
    const defaultChecked = option.default ? 'checked' : '';

    switch (option.type) {
      case 'checkbox':
        return `
          <div class="option-item checkbox-item">
            <label class="checkbox-label">
              <input type="checkbox" id="${inputId}" name="${option.name}" ${defaultChecked} ${isRequired}>
              <span class="checkbox-custom"></span>
              <span class="option-name">${option.description}</span>
            </label>
          </div>
        `;

      case 'radio':
        return `
          <div class="option-item radio-item">
            <label class="radio-label">
              <input type="radio" id="${inputId}" name="${commandKey}-${option.group}" value="${option.name}" ${isRequired}>
              <span class="radio-custom"></span>
              <span class="option-name">${option.description}</span>
            </label>
          </div>
        `;

      case 'text':
        return `
          <div class="option-item text-item">
            <label for="${inputId}" class="option-label">${option.description}:</label>
            <input type="text" id="${inputId}" name="${option.name}" placeholder="${option.placeholder || ''}" ${isRequired}>
          </div>
        `;

      case 'number':
        return `
          <div class="option-item number-item">
            <label for="${inputId}" class="option-label">${option.description}:</label>
            <input type="number" id="${inputId}" name="${option.name}" placeholder="${option.placeholder || ''}" ${isRequired}>
          </div>
        `;

      case 'select':
        return `
          <div class="option-item select-item">
            <label for="${inputId}" class="option-label">${option.description}:</label>
            <select id="${inputId}" name="${option.name}" ${isRequired}>
              <option value="">Choose...</option>
              ${option.choices
                .map(choice => `<option value="${choice.value}">${choice.label}</option>`)
                .join('')}
            </select>
          </div>
        `;

      case 'file-picker':
        return `
          <div class="option-item file-picker-item">
            <label for="${inputId}" class="option-label">${option.description}:</label>
            <div class="file-picker-group">
              <input type="text" id="${inputId}" name="${option.name}" placeholder="Enter file path or click browse" ${isRequired}>
              <button type="button" class="btn btn-small btn-secondary" onclick="commandBuilder.browseFiles('${inputId}')">
                📁 Browse
              </button>
            </div>
          </div>
        `;

      case 'directory-picker':
        return `
          <div class="option-item directory-picker-item">
            <label for="${inputId}" class="option-label">${option.description}:</label>
            <div class="directory-picker-group">
              <input type="text" id="${inputId}" name="${option.name}" placeholder="Enter directory path or click browse" ${isRequired}>
              <button type="button" class="btn btn-small btn-secondary" onclick="commandBuilder.browseDirectories('${inputId}')">
                📂 Browse
              </button>
            </div>
          </div>
        `;

      default:
        return `
          <div class="option-item">
            <span class="option-name">${option.description}</span>
          </div>
        `;
    }
  }

  setupCommandEventListeners() {
    // Add change listeners to all inputs to update preview in real-time
    this.container.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', () => {
        const commandCard = input.closest('.command-card');
        if (commandCard) {
          const commandKey = commandCard.dataset.command;
          this.previewCommand(commandKey);
        }
      });
    });
  }

  previewCommand(commandKey) {
    const command = this.buildCommandString(commandKey);
    this.updatePreview(command);
  }

  buildCommand(commandKey) {
    const startTime = Date.now();
    const command = this.buildCommandString(commandKey);
    const executionTime = Date.now() - startTime;

    this.updatePreview(command);

    // Track command built
    this.trackCommand({
      category: this.currentCategory,
      command: commandKey,
      finalCommand: command,
      executionTime: executionTime,
      success: true,
      options: this.getCommandOptions(commandKey),
    });

    // Show success message
    this.showBuildMessage(`🧜‍♀️ Command built successfully! ${command}`);
  }

  buildCommandString(commandKey) {
    const category = this.commandDefinitions[this.currentCategory];
    const command = category.commands[commandKey];
    const commandCard = this.container.querySelector(`[data-command="${commandKey}"]`);

    if (!commandCard) return command.base;

    const commandParts = [command.base];
    let hasFiles = false;

    command.options.forEach(option => {
      const input = commandCard.querySelector(`[name="${option.name}"]`);
      if (!input) return;

      let value = '';

      if (input.type === 'checkbox' && input.checked) {
        value = option.flag;
      } else if (input.type === 'radio' && input.checked) {
        value = option.flag;
      } else if ((input.type === 'text' || input.type === 'number') && input.value.trim()) {
        if (option.flag) {
          value = `${option.flag} ${input.value.trim()}`;
        } else {
          value = input.value.trim();
          hasFiles = true;
        }
      } else if (input.type === 'select' && input.value) {
        if (option.flag) {
          value = `${option.flag} ${input.value}`;
        } else {
          value = input.value;
        }
      }

      if (value) {
        if (hasFiles && !option.flag) {
          commandParts.push(value); // Files go at the end
        } else {
          commandParts.push(value);
        }
      }
    });

    return commandParts.filter(part => part.trim()).join(' ');
  }

  updatePreview(command) {
    const previewElement = this.container.querySelector('#preview-command code');
    previewElement.textContent = command;

    // Syntax highlighting for better readability
    this.applySyntaxHighlighting(previewElement);
  }

  applySyntaxHighlighting(element) {
    const command = element.textContent;
    const highlighted = command
      .replace(/^(\w+)/, '<span class="command-name">$1</span>')
      .replace(/(-{1,2}\w+)/g, '<span class="command-flag">$1</span>')
      .replace(/(["'][^"']*["'])/g, '<span class="command-string">$1</span>');

    element.innerHTML = highlighted;
  }

  copyCommand() {
    const commandText = this.container.querySelector('#preview-command code').textContent;

    if (commandText && commandText !== 'Select a command to see preview') {
      navigator.clipboard
        .writeText(commandText)
        .then(() => {
          this.showBuildMessage('📋 Command copied to clipboard!');
        })
        .catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = commandText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          this.showBuildMessage('📋 Command copied to clipboard!');
        });
    }
  }

  executeCommand() {
    const commandText = this.container.querySelector('#preview-command code').textContent;

    if (commandText && commandText !== 'Select a command to see preview') {
      // Send command to terminal
      this.sendToTerminal(commandText);
      this.hide();
      this.showBuildMessage('🚀 Command sent to terminal!');
    }
  }

  explainCommand() {
    const commandText = this.container.querySelector('#preview-command code').textContent;

    if (commandText && commandText !== 'Select a command to see preview') {
      // Show explanation modal or use AI to explain
      this.showCommandExplanation(commandText);
    }
  }

  sendToTerminal(command) {
    // Find the active terminal and send the command
    const terminal = window.terminal || window.term;

    if (terminal && terminal.write) {
      terminal.write(command + '\r');
    } else {
      // Fallback: dispatch custom event
      window.dispatchEvent(
        new CustomEvent('command-builder-execute', {
          detail: { command },
        })
      );
    }
  }

  showBuildMessage(message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'builder-notification';
    notification.textContent = message;

    this.container.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showCommandExplanation(command) {
    // Create explanation modal
    const modal = document.createElement('div');
    modal.className = 'command-explanation-modal';
    modal.innerHTML = `
      <div class="explanation-content">
        <div class="explanation-header">
          <h3>🧜‍♀️ Command Explanation</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="explanation-body">
          <div class="command-display">
            <code>${command}</code>
          </div>
          <div class="explanation-text">
            <p>🌊 Let me break this down for you!</p>
            <div id="explanation-content">
              ${this.generateExplanation(command)}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-remove after 10 seconds
    setTimeout(() => modal.remove(), 10000);
  }

  generateExplanation(command) {
    const parts = command.split(' ');
    const baseCommand = parts[0];

    const explanations = {
      git: '🐙 Git is a version control system that tracks changes in your code',
      docker: '🐳 Docker manages containers - isolated environments for your applications',
      ls: '📋 Lists files and directories in the current location',
      cp: '📄 Copies files from one location to another',
      mv: '🔄 Moves or renames files',
      rm: '🗑️ Removes (deletes) files - be careful!',
      chmod: '🔐 Changes file permissions (who can read, write, or execute)',
      ps: '⚡ Shows running processes on your system',
      df: '💾 Shows disk space usage',
      free: '🧠 Shows memory usage',
    };

    let explanation = explanations[baseCommand] || '🤔 This is a system command';

    // Add flag explanations
    const flags = parts.filter(part => part.startsWith('-'));
    if (flags.length > 0) {
      explanation += '<br><br><strong>Options used:</strong><ul>';
      flags.forEach(flag => {
        explanation += `<li><code>${flag}</code> - adds specific behavior to the command</li>`;
      });
      explanation += '</ul>';
    }

    return explanation;
  }

  browseFiles(inputId) {
    // Simulate file browser (in real app, this would open a file dialog)
    const input = document.getElementById(inputId);
    const commonFiles = [
      'README.md',
      'package.json',
      'index.html',
      'main.js',
      'style.css',
      '.gitignore',
    ];

    const selected = prompt(
      `🧜‍♀️ Enter filename or choose from common files:\n\n${commonFiles.join(', ')}`
    );
    if (selected) {
      input.value = selected;
      input.dispatchEvent(new Event('change'));
    }
  }

  browseDirectories(inputId) {
    // Simulate directory browser
    const input = document.getElementById(inputId);
    const commonDirs = ['.', '..', 'src/', 'public/', 'docs/', 'tests/', '/tmp/', '~/'];

    const selected = prompt(
      `🧜‍♀️ Enter directory path or choose from common directories:\n\n${commonDirs.join(', ')}`
    );
    if (selected) {
      input.value = selected;
      input.dispatchEvent(new Event('change'));
    }
  }

  // Analytics integration methods
  setupAnalyticsTracking() {
    // Listen for analytics events if analytics system is available
    if (typeof window !== 'undefined') {
      console.log('📊 Setting up analytics tracking for Command Builder');
    }
  }

  trackEvent(eventType, data = {}) {
    // Dispatch custom event that analytics system can listen to
    if (typeof document !== 'undefined') {
      document.dispatchEvent(
        new CustomEvent(eventType, {
          detail: {
            source: 'visual-command-builder',
            timestamp: Date.now(),
            ...data,
          },
        })
      );
    }
  }

  trackCommand(commandData) {
    const commandKey = `${commandData.category}:${commandData.command}`;

    // Update session commands
    const sessionData = this.sessionCommands.get(commandKey) || {
      count: 0,
      totalTime: 0,
      lastUsed: null,
    };

    sessionData.count++;
    sessionData.totalTime += commandData.executionTime || 0;
    sessionData.lastUsed = Date.now();

    this.sessionCommands.set(commandKey, sessionData);

    // Dispatch analytics event
    this.trackEvent('command-built', commandData);

    console.log('📊 Command tracked:', commandKey, commandData);
  }

  trackError(errorData) {
    this.trackEvent('command-builder-error', {
      category: this.currentCategory,
      timestamp: Date.now(),
      ...errorData,
    });
  }

  getCommandOptions(commandKey) {
    const commandCard = this.container.querySelector(`[data-command="${commandKey}"]`);
    if (!commandCard) return {};

    const options = {};
    const category = this.commandDefinitions[this.currentCategory];
    const command = category.commands[commandKey];

    command.options.forEach(option => {
      const input = commandCard.querySelector(`[name="${option.name}"]`);
      if (!input) return;

      if (input.type === 'checkbox') {
        options[option.name] = input.checked;
      } else if (input.type === 'radio' && input.checked) {
        options[option.name] = input.value;
      } else if (
        (input.type === 'text' || input.type === 'number' || input.type === 'select') &&
        input.value
      ) {
        options[option.name] = input.value;
      }
    });

    return options;
  }

  getAnalytics() {
    return {
      sessionCommands: Object.fromEntries(this.sessionCommands),
      totalCommands: Array.from(this.sessionCommands.values()).reduce(
        (sum, cmd) => sum + cmd.count,
        0
      ),
      currentCategory: this.currentCategory,
      sessionDuration: Date.now() - this.startTime,
      isVisible: this.isVisible,
    };
  }
}

// Initialize the Visual Command Builder
let commandBuilder;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    commandBuilder = new VisualCommandBuilder();
    window.commandBuilder = commandBuilder;

    console.log('🧜‍♀️ Visual Command Builder initialized! Press Ctrl+Shift+B to open.');
  });
}

export default VisualCommandBuilder;

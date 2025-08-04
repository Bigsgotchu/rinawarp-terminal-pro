/**
 * Syntax Highlighting System for RinaWarp Terminal
 * Provides colorized output for different command types and results
 */

export class SyntaxHighlighter {
  constructor(terminal) {
    this.terminal = terminal;
    this.enabled = true;

    // Define color schemes
    this.colorSchemes = {
      // Command types
      powershell: {
        cmdlet: '\x1b[36m', // Cyan for cmdlets
        parameter: '\x1b[35m', // Magenta for parameters
        string: '\x1b[33m', // Yellow for strings
        number: '\x1b[32m', // Green for numbers
        operator: '\x1b[37m', // White for operators
        comment: '\x1b[90m', // Gray for comments
        error: '\x1b[31m', // Red for errors
        variable: '\x1b[34m', // Blue for variables
      },

      git: {
        command: '\x1b[36m', // Cyan for git commands
        branch: '\x1b[32m', // Green for branches
        modified: '\x1b[33m', // Yellow for modified
        added: '\x1b[32m', // Green for added
        deleted: '\x1b[31m', // Red for deleted
        hash: '\x1b[35m', // Magenta for commit hashes
        remote: '\x1b[34m', // Blue for remotes
      },

      npm: {
        command: '\x1b[35m', // Magenta for npm commands
        package: '\x1b[36m', // Cyan for package names
        version: '\x1b[32m', // Green for versions
        script: '\x1b[33m', // Yellow for scripts
        error: '\x1b[31m', // Red for errors
        warning: '\x1b[33m', // Yellow for warnings
        success: '\x1b[32m', // Green for success
      },

      docker: {
        command: '\x1b[34m', // Blue for docker commands
        image: '\x1b[36m', // Cyan for images
        container: '\x1b[35m', // Magenta for containers
        running: '\x1b[32m', // Green for running
        stopped: '\x1b[31m', // Red for stopped
        port: '\x1b[33m', // Yellow for ports
        volume: '\x1b[37m', // White for volumes
      },

      // File types
      files: {
        directory: '\x1b[34;1m', // Bold blue for directories
        executable: '\x1b[32;1m', // Bold green for executables
        symlink: '\x1b[36m', // Cyan for symlinks
        archive: '\x1b[31m', // Red for archives
        image: '\x1b[35m', // Magenta for images
        document: '\x1b[33m', // Yellow for documents
        code: '\x1b[36m', // Cyan for code files
        config: '\x1b[33m', // Yellow for config files
      },
    };

    // Reset color
    this.reset = '\x1b[0m';

    // Command patterns
    this.patterns = {
      powershell: {
        cmdlet:
          /\b(Get|Set|New|Remove|Start|Stop|Restart|Test|Enable|Disable|Invoke|Select|Where|ForEach|Sort|Group|Measure|Compare|Export|Import|ConvertTo|ConvertFrom|Out|Write|Read|Clear|Copy|Move|Rename|Add|Update|Install|Uninstall|Register|Unregister|Push|Pop|Enter|Exit|Suspend|Resume|Wait|Debug|Trace|Format)-[A-Z][a-zA-Z]+\b/g,
        parameter: /-[A-Za-z]+/g,
        variable: /\$[A-Za-z_][A-Za-z0-9_]*/g,
        string: /(['"])(?:(?=(\\?))\2.)*?\1/g,
        number: /\b\d+\.?\d*\b/g,
        comment: /#.*/g,
      },

      git: {
        command: /^git\s+[a-z-]+/,
        branch: /\b(master|main|develop|feature\/[^\s]+|release\/[^\s]+|hotfix\/[^\s]+)\b/g,
        hash: /\b[0-9a-f]{7,40}\b/g,
        file: /\b[^\s]+\.[a-z]+\b/g,
        remote: /\b(origin|upstream)\/[^\s]+/g,
      },

      npm: {
        command: /^npm\s+[a-z-]+/,
        package: /@?[a-z0-9][\w.-]*\/[\w.-]+|@?[a-z0-9][\w.-]+/g,
        version: /\d+\.\d+\.\d+(-[a-z0-9.-]+)?/g,
        script: /"[^"]+"\s*:/g,
      },

      docker: {
        command: /^docker\s+[a-z-]+/,
        image: /[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[a-z0-9]+(?:[._-][a-z0-9]+)*)?/g,
        container: /[0-9a-f]{12,64}/g,
        port: /\d+:\d+/g,
      },
    };

    // File extension mappings
    this.fileExtensions = {
      directory: ['/', '\\'],
      executable: ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.app'],
      archive: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2'],
      image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.ico'],
      document: ['.txt', '.doc', '.docx', '.pdf', '.md', '.rtf'],
      code: [
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.py',
        '.java',
        '.cpp',
        '.c',
        '.cs',
        '.rb',
        '.go',
        '.rust',
        '.swift',
      ],
      config: ['.json', '.xml', '.yaml', '.yml', '.ini', '.conf', '.config', '.env'],
    };

    // Initialize
    this.init();
  }

  init() {
    // Override terminal write method to add syntax highlighting
    if (this.terminal && this.terminal.write) {
      const originalWrite = this.terminal.write.bind(this.terminal);

      this.terminal.write = data => {
        if (this.enabled && window.settingsPanel?.settings?.syntaxHighlighting) {
          data = this.highlight(data);
        }
        originalWrite(data);
      };
    }

    // Also hook into shell output if available
    if (window.terminalState?.shellHarness) {
      this.attachToShellHarness();
    }
  }

  attachToShellHarness() {
    const harness = window.terminalState.shellHarness;
    if (!harness) return;

    // Override the output handler
    const originalOutputHandler = harness.handleOutput?.bind(harness);
    if (originalOutputHandler) {
      harness.handleOutput = data => {
        if (this.enabled && window.settingsPanel?.settings?.syntaxHighlighting) {
          data = this.highlightOutput(data, harness.lastCommand);
        }
        originalOutputHandler(data);
      };
    }
  }

  highlight(text) {
    if (typeof text !== 'string') return text;

    // Detect command type
    const commandType = this.detectCommandType(text);

    // Apply appropriate highlighting
    switch (commandType) {
    case 'powershell':
      return this.highlightPowerShell(text);
    case 'git':
      return this.highlightGit(text);
    case 'npm':
      return this.highlightNpm(text);
    case 'docker':
      return this.highlightDocker(text);
    case 'ls':
    case 'dir':
      return this.highlightFileList(text);
    default:
      return this.highlightGeneric(text);
    }
  }

  highlightOutput(text, command) {
    if (!command) return text;

    // Determine output type based on command
    if (command.startsWith('git')) {
      return this.highlightGitOutput(text, command);
    } else if (command.startsWith('npm')) {
      return this.highlightNpmOutput(text);
    } else if (command.startsWith('docker')) {
      return this.highlightDockerOutput(text);
    } else if (command.match(/^(ls|dir|Get-ChildItem)/)) {
      return this.highlightFileList(text);
    }

    return text;
  }

  detectCommandType(text) {
    const trimmed = text.trim();

    if (trimmed.startsWith('git ')) return 'git';
    if (trimmed.startsWith('npm ')) return 'npm';
    if (trimmed.startsWith('docker ')) return 'docker';
    if (trimmed.match(/^(ls|dir)\b/)) return 'ls';
    if (trimmed.match(/^[A-Z][a-z]+-[A-Z]/)) return 'powershell';

    return 'generic';
  }

  highlightPowerShell(text) {
    const colors = this.colorSchemes.powershell;
    let highlighted = text;

    // Highlight in specific order to avoid conflicts
    highlighted = highlighted.replace(
      this.patterns.powershell.comment,
      match => colors.comment + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.powershell.string,
      match => colors.string + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.powershell.cmdlet,
      match => colors.cmdlet + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.powershell.parameter,
      match => colors.parameter + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.powershell.variable,
      match => colors.variable + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.powershell.number,
      match => colors.number + match + this.reset
    );

    return highlighted;
  }

  highlightGit(text) {
    const colors = this.colorSchemes.git;
    let highlighted = text;

    highlighted = highlighted.replace(
      this.patterns.git.command,
      match => colors.command + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.git.branch,
      match => colors.branch + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.git.hash,
      match => colors.hash + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.git.remote,
      match => colors.remote + match + this.reset
    );

    return highlighted;
  }

  highlightGitOutput(text, command) {
    const colors = this.colorSchemes.git;
    let highlighted = text;

    if (command.includes('status')) {
      // Highlight git status output
      highlighted = highlighted.replace(
        /modified:\s+(.+)/g,
        (match, file) => colors.modified + 'modified:' + this.reset + '   ' + file
      );

      highlighted = highlighted.replace(
        /new file:\s+(.+)/g,
        (match, file) => colors.added + 'new file:' + this.reset + '   ' + file
      );

      highlighted = highlighted.replace(
        /deleted:\s+(.+)/g,
        (match, file) => colors.deleted + 'deleted:' + this.reset + '    ' + file
      );

      highlighted = highlighted.replace(
        /On branch (.+)/g,
        (match, branch) => 'On branch ' + colors.branch + branch + this.reset
      );
    } else if (command.includes('log')) {
      // Highlight git log output
      highlighted = highlighted.replace(
        /commit ([0-9a-f]+)/g,
        (match, hash) => 'commit ' + colors.hash + hash + this.reset
      );

      highlighted = highlighted.replace(
        /Author: (.+)/g,
        (match, author) => colors.command + 'Author:' + this.reset + ' ' + author
      );

      highlighted = highlighted.replace(
        /Date: (.+)/g,
        (match, date) => colors.command + 'Date:' + this.reset + '   ' + date
      );
    }

    return highlighted;
  }

  highlightNpm(text) {
    const colors = this.colorSchemes.npm;
    let highlighted = text;

    highlighted = highlighted.replace(
      this.patterns.npm.command,
      match => colors.command + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.npm.package,
      match => colors.package + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.npm.version,
      match => colors.version + match + this.reset
    );

    return highlighted;
  }

  highlightNpmOutput(text) {
    const colors = this.colorSchemes.npm;
    let highlighted = text;

    // Highlight npm output patterns
    highlighted = highlighted.replace(/npm ERR!/g, colors.error + 'npm ERR!' + this.reset);

    highlighted = highlighted.replace(/npm WARN/g, colors.warning + 'npm WARN' + this.reset);

    highlighted = highlighted.replace(
      /added \d+ packages?/g,
      match => colors.success + match + this.reset
    );

    highlighted = highlighted.replace(
      /updated \d+ packages?/g,
      match => colors.success + match + this.reset
    );

    highlighted = highlighted.replace(
      /removed \d+ packages?/g,
      match => colors.warning + match + this.reset
    );

    return highlighted;
  }

  highlightDocker(text) {
    const colors = this.colorSchemes.docker;
    let highlighted = text;

    highlighted = highlighted.replace(
      this.patterns.docker.command,
      match => colors.command + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.docker.image,
      match => colors.image + match + this.reset
    );

    highlighted = highlighted.replace(
      this.patterns.docker.port,
      match => colors.port + match + this.reset
    );

    return highlighted;
  }

  highlightDockerOutput(text) {
    const colors = this.colorSchemes.docker;
    let highlighted = text;

    // Highlight container states
    highlighted = highlighted.replace(/Up \d+ \w+/g, match => colors.running + match + this.reset);

    highlighted = highlighted.replace(
      /Exited \(\d+\)/g,
      match => colors.stopped + match + this.reset
    );

    return highlighted;
  }

  highlightFileList(text) {
    const colors = this.colorSchemes.files;
    const lines = text.split('\n');

    return lines
      .map(line => {
        // Skip empty lines
        if (!line.trim()) return line;

        // Detect file type
        const isDirectory = line.includes('<DIR>') || line.endsWith('/') || line.endsWith('\\');

        if (isDirectory) {
          return colors.directory + line + this.reset;
        }

        // Check file extension
        for (const [type, extensions] of Object.entries(this.fileExtensions)) {
          if (extensions.some(ext => line.toLowerCase().includes(ext))) {
            return colors[type] + line + this.reset;
          }
        }

        return line;
      })
      .join('\n');
  }

  highlightGeneric(text) {
    // Basic highlighting for common patterns
    let highlighted = text;

    // Highlight errors
    highlighted = highlighted.replace(
      /\b(error|fail|failed|exception)\b/gi,
      match => '\x1b[31m' + match + this.reset
    );

    // Highlight warnings
    highlighted = highlighted.replace(
      /\b(warning|warn)\b/gi,
      match => '\x1b[33m' + match + this.reset
    );

    // Highlight success
    highlighted = highlighted.replace(
      /\b(success|succeeded|complete|completed|done)\b/gi,
      match => '\x1b[32m' + match + this.reset
    );

    // Highlight numbers
    highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, match => '\x1b[36m' + match + this.reset);

    return highlighted;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  toggle() {
    this.enabled = !this.enabled;
  }
}

// Export for use in terminal
window.SyntaxHighlighter = SyntaxHighlighter;

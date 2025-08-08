import logger from '../utilities/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Advanced Git Integration System
 * Provides visual diff, branch management, and intelligent git suggestions
 */

// Prevent duplicate class declarations
(function () {
  if (window.GitIntegration) {
    return;
  }

  class GitIntegration {
    constructor() {
      this.gitCache = new Map();
      this.repoStatus = new Map();
      this.diffRenderer = null;
      this.branchManager = null;
      this.commitAnalyzer = null;

      this.initialize();
    }

    async initialize() {
      this.diffRenderer = new VisualDiffRenderer();
      this.branchManager = new BranchManager();
      this.commitAnalyzer = new CommitAnalyzer();

      // Set up git monitoring
      this.setupGitMonitoring();

      logger.debug('✅ Git Integration initialized');
    }

    /**
     * Check if directory is a Git repository
     */
    async isGitRepository(directory) {
      try {
        const result = await this.executeGitCommand(['rev-parse', '--git-dir'], directory);
        return result.exitCode === 0;
      } catch (error) {
        return false;
      }
    }

    /**
     * Get current Git branch
     */
    async getCurrentBranch(directory) {
      try {
        const result = await this.executeGitCommand(['branch', '--show-current'], directory);
        if (result.exitCode === 0) {
          return result.stdout.trim();
        }
        return 'unknown';
      } catch (error) {
        return 'unknown';
      }
    }

    /**
     * Get Git status with enhanced information
     */
    async getEnhancedStatus(directory) {
      const cacheKey = `status:${directory}`;
      const cached = this.gitCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 5000) {
        return cached.data;
      }

      try {
        const [statusResult, branchResult, remoteResult] = await Promise.all([
          this.executeGitCommand(['status', '--porcelain=v1'], directory),
          this.executeGitCommand(['branch', '--show-current'], directory),
          this.executeGitCommand(['remote', '-v'], directory),
        ]);

        const status = {
          branch: branchResult.stdout.trim(),
          files: this.parseGitStatus(statusResult.stdout),
          hasRemote: remoteResult.exitCode === 0 && remoteResult.stdout.trim().length > 0,
          isClean: statusResult.stdout.trim().length === 0,
          ahead: 0,
          behind: 0,
          timestamp: Date.now(),
        };

        // Get ahead/behind information
        if (status.hasRemote) {
          try {
            const aheadBehind = await this.executeGitCommand(
              ['rev-list', '--count', '--left-right', `${status.branch}...origin/${status.branch}`],
              directory
            );

            if (aheadBehind.exitCode === 0) {
              const [ahead, behind] = aheadBehind.stdout.trim().split('\t').map(Number);
              status.ahead = ahead || 0;
              status.behind = behind || 0;
            }
          } catch (error) {
            console.warn('Could not get ahead/behind info:', error);
          }
        }

        this.gitCache.set(cacheKey, { data: status, timestamp: Date.now() });
        return status;
      } catch (error) {
        console.error('Git status error:', error);
        return null;
      }
    }

    /**
     * Generate intelligent Git suggestions based on context
     */
    async getSuggestions(partialCommand, context) {
      const suggestions = [];

      if (!(await this.isGitRepository(context.cwd))) {
        if (partialCommand.includes('git')) {
          suggestions.push({
            type: 'git-init',
            text: 'git init',
            description: 'Initialize a new Git repository',
            confidence: 0.9,
          });
        }
        return suggestions;
      }

      const status = await this.getEnhancedStatus(context.cwd);
      if (!status) return suggestions;

      // Command-specific suggestions
      if (partialCommand.startsWith('git ')) {
        const gitCommand = partialCommand.substring(4).trim();

        // Status-based suggestions
        if (!gitCommand || gitCommand === 'st' || gitCommand.startsWith('status')) {
          suggestions.push({
            type: 'git-status',
            text: 'git status --short',
            description: 'Show repository status in short format',
            confidence: 0.8,
          });
        }

        // Add suggestions
        if (gitCommand.startsWith('add') || gitCommand === 'a') {
          if (status.files.untracked.length > 0) {
            suggestions.push({
              type: 'git-add',
              text: 'git add .',
              description: `Add all ${status.files.untracked.length} untracked files`,
              confidence: 0.7,
            });
          }

          if (status.files.modified.length > 0) {
            suggestions.push({
              type: 'git-add',
              text: 'git add -u',
              description: `Add all ${status.files.modified.length} modified files`,
              confidence: 0.7,
            });
          }
        }

        // Commit suggestions
        if (gitCommand.startsWith('commit') || gitCommand === 'c') {
          const stagedFiles = status.files.staged.length;
          if (stagedFiles > 0) {
            suggestions.push({
              type: 'git-commit',
              text: 'git commit -m "',
              description: `Commit ${stagedFiles} staged files`,
              confidence: 0.8,
              cursorPosition: -1, // Position cursor before closing quote
            });
          } else if (status.files.modified.length > 0) {
            suggestions.push({
              type: 'git-commit',
              text: 'git commit -am "',
              description: `Add and commit ${status.files.modified.length} modified files`,
              confidence: 0.7,
              cursorPosition: -1,
            });
          }
        }

        // Branch suggestions
        if (gitCommand.startsWith('branch') || gitCommand === 'br') {
          const branches = await this.getBranches(context.cwd);
          branches.forEach(branch => {
            if (branch !== status.branch) {
              suggestions.push({
                type: 'git-branch',
                text: `git checkout ${branch}`,
                description: `Switch to branch '${branch}'`,
                confidence: 0.6,
              });
            }
          });
        }

        // Push/Pull suggestions
        if (status.hasRemote) {
          if (gitCommand.startsWith('push') || gitCommand === 'p') {
            if (status.ahead > 0) {
              suggestions.push({
                type: 'git-push',
                text: 'git push',
                description: `Push ${status.ahead} commits to remote`,
                confidence: 0.8,
              });
            }
          }

          if (gitCommand.startsWith('pull') || gitCommand === 'pl') {
            if (status.behind > 0) {
              suggestions.push({
                type: 'git-pull',
                text: 'git pull',
                description: `Pull ${status.behind} commits from remote`,
                confidence: 0.8,
              });
            }
          }
        }

        // Diff suggestions
        if (gitCommand.startsWith('diff') || gitCommand === 'd') {
          if (status.files.modified.length > 0) {
            suggestions.push({
              type: 'git-diff',
              text: 'git diff',
              description: 'Show changes in working directory',
              confidence: 0.8,
            });
          }

          if (status.files.staged.length > 0) {
            suggestions.push({
              type: 'git-diff',
              text: 'git diff --cached',
              description: 'Show staged changes',
              confidence: 0.8,
            });
          }
        }
      }

      return suggestions;
    }

    /**
     * Visual Diff Rendering
     */
    async showVisualDiff(filePath, context) {
      try {
        const diffResult = await this.executeGitCommand(['diff', filePath], context.cwd);

        if (diffResult.exitCode === 0 && diffResult.stdout) {
          return this.diffRenderer.render(diffResult.stdout, filePath);
        }

        return null;
      } catch (error) {
        console.error('Visual diff error:', error);
        return null;
      }
    }

    /**
     * Get list of branches
     */
    async getBranches(directory) {
      try {
        const result = await this.executeGitCommand(
          ['branch', '--format=%(refname:short)'],
          directory
        );
        if (result.exitCode === 0) {
          return result.stdout.split('\n').filter(branch => branch.trim().length > 0);
        }
        return [];
      } catch (error) {
        return [];
      }
    }

    /**
     * Analyze commit history for patterns
     */
    async analyzeCommitHistory(directory, limit = 50) {
      try {
        const result = await this.executeGitCommand(
          ['log', `--max-count=${limit}`, '--pretty=format:%H|%an|%ae|%s|%ct'],
          directory
        );

        if (result.exitCode === 0) {
          const commits = result.stdout.split('\n').map(line => {
            const [hash, author, email, message, timestamp] = line.split('|');
            return {
              hash,
              author,
              email,
              message,
              timestamp: parseInt(timestamp) * 1000,
              date: new Date(parseInt(timestamp) * 1000),
            };
          });

          return this.commitAnalyzer.analyze(commits);
        }

        return null;
      } catch (error) {
        console.error('Commit analysis error:', error);
        return null;
      }
    }

    /**
     * Smart commit message suggestions
     */
    async suggestCommitMessage(directory) {
      const status = await this.getEnhancedStatus(directory);
      if (!status) return [];

      const suggestions = [];

      // Analyze file changes
      const fileTypes = new Set();
      const operations = new Set();

      [...status.files.staged, ...status.files.modified].forEach(file => {
        const ext = file.name.split('.').pop();
        fileTypes.add(ext);

        if (file.status === 'A') operations.add('Add');
        if (file.status === 'M') operations.add('Update');
        if (file.status === 'D') operations.add('Remove');
      });

      // Generate contextual commit messages
      if (operations.has('Add') && fileTypes.has('js')) {
        suggestions.push('feat: add new JavaScript functionality');
        suggestions.push('feat: implement new feature');
      }

      if (operations.has('Update') && fileTypes.has('md')) {
        suggestions.push('docs: update documentation');
        suggestions.push('docs: improve README');
      }

      if (fileTypes.has('test') || fileTypes.has('spec')) {
        suggestions.push('test: add/update tests');
        suggestions.push('test: improve test coverage');
      }

      // Generic suggestions
      suggestions.push('fix: resolve bug');
      suggestions.push('refactor: improve code structure');
      suggestions.push('style: format code');

      return suggestions;
    }

    /**
     * Parse git status output
     */
    parseGitStatus(statusOutput) {
      const files = {
        staged: [],
        modified: [],
        untracked: [],
        conflicted: [],
      };

      statusOutput.split('\n').forEach(line => {
        if (line.length < 3) return;

        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const fileName = line.substring(3);

        const fileInfo = {
          name: fileName,
          status: indexStatus !== ' ' ? indexStatus : workTreeStatus,
        };

        if (
          indexStatus === 'U' ||
          workTreeStatus === 'U' ||
          (indexStatus === 'A' && workTreeStatus === 'A') ||
          (indexStatus === 'D' && workTreeStatus === 'D')
        ) {
          files.conflicted.push(fileInfo);
        } else if (indexStatus !== ' ' && indexStatus !== '?') {
          files.staged.push(fileInfo);
        } else if (workTreeStatus === 'M') {
          files.modified.push(fileInfo);
        } else if (workTreeStatus === '?') {
          files.untracked.push(fileInfo);
        }
      });

      return files;
    }

    /**
     * Execute git command with proper error handling
     */
    async executeGitCommand(args, cwd) {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const command = `git ${args.join(' ')}`;
        return await window.electronAPI.executeCommand(command, { cwd });
      }

      throw new Error(new Error(new Error('Command execution not available')));
    }

    /**
     * Set up git repository monitoring
     */
    setupGitMonitoring() {
      // Watch for git operations
      if (window.electronAPI && window.electronAPI.watchFileSystem) {
        window.electronAPI.watchFileSystem('.git', (event, filename) => {
          if (filename === 'index' || filename === 'HEAD') {
            this.clearCache();
            this.emitGitUpdate();
          }
        });
      }
    }

    clearCache() {
      this.gitCache.clear();
    }

    emitGitUpdate() {
      if (window.rinaWarp && window.rinaWarp.eventBus) {
        window.rinaWarp.eventBus.emit('gitUpdate');
      }

      window.dispatchEvent(new CustomEvent('rinawarp:gitUpdate'));
    }
  }

  /**
   * Visual Diff Renderer
   */
  class VisualDiffRenderer {
    constructor() {
      this.container = null;
    }

    render(diffOutput, filePath) {
      const diffLines = diffOutput.split('\n');
      const renderedDiff = this.parseDiff(diffLines);

      return {
        filePath,
        html: this.generateHTML(renderedDiff),
        stats: this.calculateStats(renderedDiff),
      };
    }

    parseDiff(lines) {
      const hunks = [];
      let currentHunk = null;
      const _lineNumber = 0;

      lines.forEach(line => {
        if (line.startsWith('@@')) {
          // New hunk
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
          if (match) {
            currentHunk = {
              oldStart: parseInt(match[1]),
              newStart: parseInt(match[2]),
              lines: [],
            };
            hunks.push(currentHunk);
          }
        } else if (currentHunk) {
          const diffLine = {
            type: line[0] === '+' ? 'addition' : line[0] === '-' ? 'deletion' : 'context',
            content: line.substring(1),
            oldLineNumber: null,
            newLineNumber: null,
          };

          if (diffLine.type === 'context' || diffLine.type === 'deletion') {
            diffLine.oldLineNumber =
              currentHunk.oldStart +
              currentHunk.lines.filter(l => l.type === 'context' || l.type === 'deletion').length;
          }

          if (diffLine.type === 'context' || diffLine.type === 'addition') {
            diffLine.newLineNumber =
              currentHunk.newStart +
              currentHunk.lines.filter(l => l.type === 'context' || l.type === 'addition').length;
          }

          currentHunk.lines.push(diffLine);
        }
      });

      return hunks;
    }

    generateHTML(hunks) {
      let html = '<div class="git-diff-viewer">';

      hunks.forEach(hunk => {
        html += '<div class="diff-hunk">';

        hunk.lines.forEach(line => {
          const lineClass = `diff-line diff-${line.type}`;
          const oldNum = line.oldLineNumber ? line.oldLineNumber.toString().padStart(4) : '    ';
          const newNum = line.newLineNumber ? line.newLineNumber.toString().padStart(4) : '    ';

          html += `
          <div class="${lineClass}">
            <span class="line-number old-line">${oldNum}</span>
            <span class="line-number new-line">${newNum}</span>
            <span class="line-content">${this.escapeHTML(line.content)}</span>
          </div>
        `;
        });

        html += '</div>';
      });

      html += '</div>';

      // Add CSS
      html += this.generateCSS();

      return html;
    }

    generateCSS() {
      return `
      <style>
      .git-diff-viewer {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.4;
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 8px;
        overflow: hidden;
        margin: 10px 0;
      }
      
      .diff-hunk {
        border-bottom: 1px solid #333;
      }
      
      .diff-line {
        display: flex;
        align-items: center;
        padding: 2px 0;
        border-left: 3px solid transparent;
      }
      
      .diff-addition {
        background-color: rgba(46, 160, 67, 0.15);
        border-left-color: #2ea043;
      }
      
      .diff-deletion {
        background-color: rgba(248, 81, 73, 0.15);
        border-left-color: #f85149;
      }
      
      .diff-context {
        background-color: transparent;
      }
      
      .line-number {
        width: 50px;
        text-align: right;
        color: #8b949e;
        font-weight: normal;
        user-select: none;
        padding-right: 10px;
      }
      
      .line-content {
        flex: 1;
        padding-left: 10px;
        white-space: pre-wrap;
        word-break: break-all;
      }
      
      .diff-addition .line-content {
        color: #7ee787;
      }
      
      .diff-deletion .line-content {
        color: #ffa198;
      }
      </style>
    `;
    }

    calculateStats(hunks) {
      let additions = 0;
      let deletions = 0;

      hunks.forEach(hunk => {
        hunk.lines.forEach(line => {
          if (line.type === 'addition') additions++;
          if (line.type === 'deletion') deletions++;
        });
      });

      return { additions, deletions };
    }

    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  /**
   * Branch Manager
   */
  class BranchManager {
    constructor() {
      this.branches = new Map();
    }

    async getAllBranches(directory) {
      try {
        const [localResult, remoteResult] = await Promise.all([
          this.executeGitCommand(['branch'], directory),
          this.executeGitCommand(['branch', '-r'], directory),
        ]);

        const local = this.parseBranchOutput(localResult.stdout, 'local');
        const remote = this.parseBranchOutput(remoteResult.stdout, 'remote');

        return { local, remote };
      } catch (error) {
        return { local: [], remote: [] };
      }
    }

    parseBranchOutput(output, type) {
      return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const isCurrent = line.startsWith('*');
          const name = line.replace(/^\*\s*/, '').trim();
          return {
            name,
            type,
            isCurrent,
            fullName: type === 'remote' ? name : `refs/heads/${name}`,
          };
        });
    }

    async executeGitCommand(args, cwd) {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const command = `git ${args.join(' ')}`;
        return await window.electronAPI.executeCommand(command, { cwd });
      }
      throw new Error(new Error(new Error('Command execution not available')));
    }
  }

  /**
   * Commit Analyzer
   */
  class CommitAnalyzer {
    analyze(commits) {
      return {
        totalCommits: commits.length,
        authors: this.analyzeAuthors(commits),
        timePatterns: this.analyzeTimePatterns(commits),
        messagePatterns: this.analyzeMessagePatterns(commits),
        activity: this.analyzeActivity(commits),
      };
    }

    analyzeAuthors(commits) {
      const authors = new Map();

      commits.forEach(commit => {
        const key = `${commit.author} <${commit.email}>`;
        if (!authors.has(key)) {
          authors.set(key, {
            name: commit.author,
            email: commit.email,
            commits: 0,
            firstCommit: commit.date,
            lastCommit: commit.date,
          });
        }

        const author = authors.get(key);
        author.commits++;

        if (commit.date < author.firstCommit) {
          author.firstCommit = commit.date;
        }

        if (commit.date > author.lastCommit) {
          author.lastCommit = commit.date;
        }
      });

      return Array.from(authors.values()).sort((a, b) => b.commits - a.commits);
    }

    analyzeTimePatterns(commits) {
      const hourly = new Array(24).fill(0);
      const daily = new Array(7).fill(0);

      commits.forEach(commit => {
        const hour = commit.date.getHours();
        const day = commit.date.getDay();

        hourly[hour]++;
        daily[day]++;
      });

      return { hourly, daily };
    }

    analyzeMessagePatterns(commits) {
      const patterns = {
        conventional: 0,
        types: new Map(),
        avgLength: 0,
      };

      let totalLength = 0;

      commits.forEach(commit => {
        const message = commit.message;
        totalLength += message.length;

        // Check for conventional commits
        const conventionalMatch = message.match(
          /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/
        );
        if (conventionalMatch) {
          patterns.conventional++;
          const type = conventionalMatch[1];
          patterns.types.set(type, (patterns.types.get(type) || 0) + 1);
        }
      });

      patterns.avgLength = totalLength / commits.length;
      patterns.types = Array.from(patterns.types.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      return patterns;
    }

    analyzeActivity(commits) {
      const activity = new Map();

      commits.forEach(commit => {
        const date = commit.date.toISOString().split('T')[0];
        activity.set(date, (activity.get(date) || 0) + 1);
      });

      return Array.from(activity.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  }

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GitIntegration, VisualDiffRenderer, BranchManager, CommitAnalyzer };
  } else {
    window.GitIntegration = GitIntegration;
    window.VisualDiffRenderer = VisualDiffRenderer;
    window.BranchManager = BranchManager;
    window.CommitAnalyzer = CommitAnalyzer;
  }
})(); // End of wrapper function

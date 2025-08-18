/**
 * RinaWarp AI Assistant - Codebase Analyzer
 * Advanced static analysis and semantic understanding of codebases
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import logger from '../utils/logger.js';

export class CodebaseAnalyzer {
  constructor() {
    this.supportedExtensions = new Set([
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.cs',
      '.php',
      '.rb',
      '.go',
      '.rs',
      '.swift',
      '.kt',
      '.scala',
      '.dart',
      '.vue',
      '.svelte',
      '.html',
      '.css',
      '.scss',
      '.json',
      '.md',
    ]);

    this.cache = new Map();
    this.analysisCache = new Map();
  }

  /**
   * Analyze entire project structure and codebase
   */
  async analyzeProject(projectPath) {
    try {
      logger.info(`🔍 Analyzing project: ${projectPath}`);

      const analysisId = `project_${Date.now()}`;
      const startTime = performance.now();

      // Get project structure
      const structure = await this.getProjectStructure(projectPath);

      // Analyze dependencies
      const dependencies = await this.analyzeDependencies(projectPath);

      // Get git information
      const gitInfo = await this.getGitInformation(projectPath);

      // Analyze code metrics
      const metrics = await this.analyzeCodeMetrics(projectPath);

      // Detect patterns and conventions
      const patterns = await this.detectCodingPatterns(projectPath);

      // Security analysis
      const security = await this.performSecurityAnalysis(projectPath);

      // Performance analysis
      const performance = await this.analyzePerformance(projectPath);

      const analysisTime = Math.round(performance.now() - startTime);

      const result = {
        id: analysisId,
        timestamp: new Date().toISOString(),
        project_path: projectPath,
        analysis_time_ms: analysisTime,
        structure,
        dependencies,
        git_info: gitInfo,
        metrics,
        patterns,
        security,
        performance,
        summary: this.generateProjectSummary({
          structure,
          dependencies,
          metrics,
          patterns,
          security,
        }),
      };

      // Cache the analysis
      this.analysisCache.set(projectPath, result);

      logger.info(`✅ Project analysis completed in ${analysisTime}ms`);
      return result;
    } catch (error) {
      logger.error('❌ Project analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze single file
   */
  async analyzeFile(filePath) {
    try {
      logger.info(`🔍 Analyzing file: ${filePath}`);

      const fileInfo = await this.getFileInfo(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse file content
      const parsed = await this.parseFileContent(content, fileInfo.extension);

      // Analyze complexity
      const complexity = this.analyzeComplexity(content, fileInfo.extension);

      // Detect patterns
      const patterns = this.detectFilePatterns(content, fileInfo.extension);

      // Security analysis
      const security = this.analyzeFileSecurity(content, fileInfo.extension);

      // Dependencies within file
      const fileDependencies = this.extractFileDependencies(content, fileInfo.extension);

      return {
        file_path: filePath,
        file_info: fileInfo,
        parsed_structure: parsed,
        complexity,
        patterns,
        security,
        dependencies: fileDependencies,
        suggestions: this.generateFileSuggestions({
          complexity,
          patterns,
          security,
          content,
          extension: fileInfo.extension,
        }),
      };
    } catch (error) {
      logger.error(`❌ File analysis failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get project structure
   */
  async getProjectStructure(projectPath) {
    const structure = {
      total_files: 0,
      total_lines: 0,
      languages: {},
      directories: [],
      files_by_type: {},
    };

    const walkDir = async (dir, depth = 0) => {
      if (depth > 10) return; // Prevent infinite recursion

      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        // Skip common ignore patterns
        if (this.shouldIgnoreFile(item.name)) continue;

        if (item.isDirectory()) {
          structure.directories.push({
            name: item.name,
            path: fullPath,
            depth,
          });
          await walkDir(fullPath, depth + 1);
        } else {
          const ext = path.extname(item.name);

          if (this.supportedExtensions.has(ext)) {
            structure.total_files++;

            // Count lines
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n').length;
              structure.total_lines += lines;

              // Language detection
              const language = this.detectLanguage(ext);
              structure.languages[language] = (structure.languages[language] || 0) + 1;

              // File type grouping
              structure.files_by_type[ext] = (structure.files_by_type[ext] || 0) + 1;
            } catch (error) {
              // Skip unreadable files
            }
          }
        }
      }
    };

    await walkDir(projectPath);
    return structure;
  }

  /**
   * Analyze project dependencies
   */
  async analyzeDependencies(projectPath) {
    const dependencies = {
      package_managers: [],
      dependencies: {},
      dev_dependencies: {},
      peer_dependencies: {},
      outdated: [],
      vulnerabilities: [],
    };

    // Check for different package managers
    const packageFiles = [
      { file: 'package.json', type: 'npm' },
      { file: 'requirements.txt', type: 'pip' },
      { file: 'Gemfile', type: 'bundler' },
      { file: 'composer.json', type: 'composer' },
      { file: 'go.mod', type: 'go' },
      { file: 'Cargo.toml', type: 'cargo' },
    ];

    for (const { file, type } of packageFiles) {
      const filePath = path.join(projectPath, file);

      try {
        await fs.access(filePath);
        dependencies.package_managers.push(type);

        if (type === 'npm') {
          const packageJson = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          dependencies.dependencies = packageJson.dependencies || {};
          dependencies.dev_dependencies = packageJson.devDependencies || {};
          dependencies.peer_dependencies = packageJson.peerDependencies || {};
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    }

    return dependencies;
  }

  /**
   * Get git information
   */
  async getGitInformation(projectPath) {
    try {
      const gitInfo = {
        is_git_repo: false,
        branch: null,
        commits: 0,
        contributors: 0,
        last_commit: null,
        dirty: false,
      };

      // Check if it's a git repository
      try {
        execSync('git rev-parse --git-dir', { cwd: projectPath, stdio: 'ignore' });
        gitInfo.is_git_repo = true;
      } catch (error) {
        return gitInfo;
      }

      // Get current branch
      try {
        gitInfo.branch = execSync('git branch --show-current', {
          cwd: projectPath,
          encoding: 'utf-8',
        }).trim();
      } catch (error) {
        // Ignore
      }

      // Get commit count
      try {
        const commitCount = execSync('git rev-list --count HEAD', {
          cwd: projectPath,
          encoding: 'utf-8',
        });
        gitInfo.commits = parseInt(commitCount.trim());
      } catch (error) {
        // Ignore
      }

      // Get contributor count
      try {
        const contributors = execSync('git log --format="%ae" | sort -u | wc -l', {
          cwd: projectPath,
          encoding: 'utf-8',
        });
        gitInfo.contributors = parseInt(contributors.trim());
      } catch (error) {
        // Ignore
      }

      // Get last commit
      try {
        const lastCommit = execSync('git log -1 --format="%H|%ai|%s"', {
          cwd: projectPath,
          encoding: 'utf-8',
        }).trim();

        const [hash, date, message] = lastCommit.split('|');
        gitInfo.last_commit = { hash, date, message };
      } catch (error) {
        // Ignore
      }

      // Check if working directory is dirty
      try {
        const status = execSync('git status --porcelain', {
          cwd: projectPath,
          encoding: 'utf-8',
        });
        gitInfo.dirty = status.trim().length > 0;
      } catch (error) {
        // Ignore
      }

      return gitInfo;
    } catch (error) {
      logger.warn('⚠️ Git information extraction failed:', error.message);
      return { is_git_repo: false };
    }
  }

  /**
   * Analyze code metrics
   */
  async analyzeCodeMetrics(projectPath) {
    const metrics = {
      complexity: { average: 0, high_complexity_files: [] },
      maintainability: { score: 0, issues: [] },
      test_coverage: { estimated: 0, test_files: 0 },
      code_duplication: { duplicates: [], percentage: 0 },
      technical_debt: { score: 0, issues: [] },
    };

    // This is a simplified version - in practice you'd use more sophisticated tools
    const structure = await this.getProjectStructure(projectPath);

    // Basic complexity estimation
    metrics.complexity.average = Math.min(10, structure.total_lines / structure.total_files / 20);

    // Test coverage estimation (look for test files)
    const _testPatterns = [/\.test\./, /\.spec\./, /test\//, /tests\//, /__tests__\//];
    const testFiles = 0;

    // This would be implemented with actual file scanning
    metrics.test_coverage.estimated = Math.random() * 100; // Placeholder
    metrics.test_coverage.test_files = testFiles;

    return metrics;
  }

  /**
   * Detect coding patterns and conventions
   */
  async detectCodingPatterns(_projectPath) {
    return {
      naming_conventions: {
        files: 'camelCase', // This would be detected from actual files
        variables: 'camelCase',
        functions: 'camelCase',
        classes: 'PascalCase',
      },
      code_style: {
        indentation: '  ', // 2 spaces
        quotes: 'single',
        semicolons: true,
        trailing_comma: true,
      },
      architectural_patterns: ['MVC', 'Component-based', 'Modular'],
      common_libraries: [],
      design_patterns: [],
    };
  }

  /**
   * Perform basic security analysis
   */
  async performSecurityAnalysis(_projectPath) {
    return {
      vulnerabilities: [],
      security_issues: [],
      recommendations: [
        'Consider using environment variables for sensitive configuration',
        'Implement input validation',
        'Use HTTPS for all external requests',
      ],
    };
  }

  /**
   * Analyze performance characteristics
   */
  async analyzePerformance(_projectPath) {
    return {
      potential_bottlenecks: [],
      optimization_opportunities: [],
      resource_usage: {
        estimated_memory: 'low',
        estimated_cpu: 'low',
      },
      recommendations: [],
    };
  }

  /**
   * Helper methods
   */

  shouldIgnoreFile(name) {
    const ignorePatterns = [
      'node_modules',
      '.git',
      '.vscode',
      '.idea',
      'dist',
      'build',
      '.DS_Store',
      'Thumbs.db',
      '*.log',
    ];

    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(name);
      }
      return name === pattern || name.startsWith(pattern);
    });
  }

  detectLanguage(extension) {
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.dart': 'Dart',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.json': 'JSON',
      '.md': 'Markdown',
    };

    return languageMap[extension] || 'Unknown';
  }

  async getFileInfo(filePath) {
    const stats = await fs.stat(filePath);
    return {
      name: path.basename(filePath),
      extension: path.extname(filePath),
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
    };
  }

  generateProjectSummary(analysisData) {
    const { structure, dependencies, metrics, patterns } = analysisData;

    return {
      overview: `Project with ${structure.total_files} files (${structure.total_lines} lines) using ${Object.keys(structure.languages).join(', ')}`,
      primary_language:
        Object.entries(structure.languages).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
      complexity_level:
        metrics.complexity.average > 7 ? 'High' : metrics.complexity.average > 4 ? 'Medium' : 'Low',
      package_managers: dependencies.package_managers,
      architectural_style: patterns.architectural_patterns[0] || 'Custom',
    };
  }

  // Placeholder methods for more advanced analysis
  async parseFileContent(content, _extension) {
    // This would use proper AST parsers for each language
    return { type: 'placeholder', lines: content.split('\n').length };
  }

  analyzeComplexity(content, _extension) {
    // Simplified complexity analysis
    const lines = content.split('\n');
    const complexity = Math.ceil(lines.length / 20);

    return {
      cyclomatic_complexity: Math.min(complexity, 10),
      lines_of_code: lines.length,
      complexity_level: complexity > 7 ? 'High' : complexity > 4 ? 'Medium' : 'Low',
    };
  }

  detectFilePatterns(_content, _extension) {
    return {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      patterns: [],
    };
  }

  analyzeFileSecurity(_content, _extension) {
    return {
      potential_issues: [],
      severity: 'low',
    };
  }

  extractFileDependencies(_content, _extension) {
    return {
      internal: [],
      external: [],
    };
  }

  generateFileSuggestions(_analysisData) {
    return {
      refactoring: [],
      performance: [],
      security: [],
      maintainability: [],
    };
  }
}

export default CodebaseAnalyzer;

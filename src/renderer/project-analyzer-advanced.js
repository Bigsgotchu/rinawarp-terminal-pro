import logger from '../utils/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Advanced Project Analyzer
 * Provides deep project understanding, language detection, and intelligent suggestions
 */

// Prevent duplicate class declarations
(function () {
  if (window.ProjectAnalyzer) {
    return;
  }

  class ProjectAnalyzer {
    constructor() {
      this.projectCache = new Map();
      this.analysisCache = new Map();
      this.languageDetectors = new Map();
      this.frameworkDetectors = new Map();

      this.initialize();
    }

    async initialize() {
      // Initialize language detectors
      this.setupLanguageDetectors();
      this.setupFrameworkDetectors();

      logger.debug('✅ Project Analyzer initialized');
    }

    /**
     * Detect project type based on directory contents
     */
    async detectProjectType(directory) {
      const cacheKey = `project:${directory}`;
      const cached = this.projectCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 30000) {
        return cached.type;
      }

      try {
        const analysis = await this.analyzeProject(directory);
        const projectType = this.determineProjectType(analysis);

        this.projectCache.set(cacheKey, {
          type: projectType,
          timestamp: Date.now(),
        });

        return projectType;
      } catch (error) {
        console.warn('Project detection error:', error);
        return 'unknown';
      }
    }

    /**
     * Comprehensive project analysis
     */
    async analyzeProject(directory) {
      const cacheKey = `analysis:${directory}`;
      const cached = this.analysisCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.analysis;
      }

      const analysis = {
        directory,
        files: [],
        languages: new Map(),
        frameworks: new Set(),
        buildTools: new Set(),
        packageManagers: new Set(),
        configFiles: new Set(),
        testFrameworks: new Set(),
        dependencies: new Map(),
        scripts: new Map(),
        complexity: 'low',
        structure: {},
        recommendations: [],
      };

      try {
        // Get directory contents
        const contents = await this.getDirectoryContents(directory);
        analysis.files = contents.files;

        // Analyze languages
        await this.analyzeLanguages(analysis);

        // Analyze frameworks and tools
        await this.analyzeFrameworks(analysis);
        await this.analyzeBuildTools(analysis);
        await this.analyzePackageManagers(analysis);
        await this.analyzeConfigFiles(analysis);
        await this.analyzeTestFrameworks(analysis);

        // Deep analysis of specific files
        await this.analyzePackageJson(analysis);
        await this.analyzeCargoToml(analysis);
        await this.analyzeGoMod(analysis);
        await this.analyzePyprojectToml(analysis);
        await this.analyzeDockerfile(analysis);

        // Analyze project structure
        await this.analyzeProjectStructure(analysis);

        // Calculate complexity
        analysis.complexity = this.calculateComplexity(analysis);

        // Generate recommendations
        analysis.recommendations = await this.generateRecommendations(analysis);

        this.analysisCache.set(cacheKey, {
          analysis,
          timestamp: Date.now(),
        });

        return analysis;
      } catch (error) {
        console.error('Project analysis error:', error);
        return analysis;
      }
    }

    /**
     * Analyze programming languages in the project
     */
    async analyzeLanguages(analysis) {
      const languageStats = new Map();
      let totalLines = 0;

      for (const file of analysis.files) {
        const ext = this.getFileExtension(file);
        const language = this.getLanguageFromExtension(ext);

        if (language) {
          try {
            const lines = await this.countLines(file, analysis.directory);
            languageStats.set(language, (languageStats.get(language) || 0) + lines);
            totalLines += lines;
          } catch (error) {
            // File might not be readable, skip
            languageStats.set(language, (languageStats.get(language) || 0) + 1);
            totalLines += 1;
          }
        }
      }

      // Calculate percentages
      for (const [language, lines] of languageStats) {
        analysis.languages.set(language, {
          lines,
          percentage: totalLines > 0 ? (lines / totalLines) * 100 : 0,
        });
      }
    }

    /**
     * Analyze frameworks used in the project
     */
    async analyzeFrameworks(analysis) {
      for (const [pattern, framework] of this.frameworkDetectors) {
        if (this.matchesPattern(analysis.files, pattern)) {
          analysis.frameworks.add(framework);
        }
      }
    }

    /**
     * Analyze build tools
     */
    async analyzeBuildTools(analysis) {
      const buildToolPatterns = [
        ['webpack.config.js', 'Webpack'],
        ['rollup.config.js', 'Rollup'],
        ['vite.config.js', 'Vite'],
        ['gulpfile.js', 'Gulp'],
        ['Gruntfile.js', 'Grunt'],
        ['Makefile', 'Make'],
        ['CMakeLists.txt', 'CMake'],
        ['build.gradle', 'Gradle'],
        ['pom.xml', 'Maven'],
        ['Cargo.toml', 'Cargo'],
        ['mix.exs', 'Mix'],
        ['Package.swift', 'Swift Package Manager'],
      ];

      for (const [file, tool] of buildToolPatterns) {
        if (analysis.files.includes(file)) {
          analysis.buildTools.add(tool);
        }
      }
    }

    /**
     * Analyze package managers
     */
    async analyzePackageManagers(analysis) {
      const packageManagerFiles = [
        ['package.json', 'npm'],
        ['yarn.lock', 'Yarn'],
        ['package-lock.json', 'npm'],
        ['pnpm-lock.yaml', 'pnpm'],
        ['Pipfile', 'Pipenv'],
        ['poetry.lock', 'Poetry'],
        ['requirements.txt', 'pip'],
        ['Cargo.lock', 'Cargo'],
        ['go.sum', 'Go Modules'],
        ['composer.json', 'Composer'],
        ['Gemfile', 'Bundler'],
      ];

      for (const [file, manager] of packageManagerFiles) {
        if (analysis.files.includes(file)) {
          analysis.packageManagers.add(manager);
        }
      }
    }

    /**
     * Analyze configuration files
     */
    async analyzeConfigFiles(analysis) {
      const configPatterns = [
        [/\.eslintrc/, 'ESLint'],
        [/\.prettierrc/, 'Prettier'],
        [/tsconfig\.json/, 'TypeScript'],
        [/\.gitignore/, 'Git'],
        [/\.env/, 'Environment'],
        [/docker-compose/, 'Docker Compose'],
        [/Dockerfile/, 'Docker'],
        [/\.github\/workflows/, 'GitHub Actions'],
        [/\.travis\.yml/, 'Travis CI'],
        [/\.circleci/, 'CircleCI'],
        [/jest\.config/, 'Jest'],
        [/vitest\.config/, 'Vitest'],
      ];

      for (const file of analysis.files) {
        for (const [pattern, config] of configPatterns) {
          if (
            (pattern instanceof RegExp && pattern.test(file)) ||
            (typeof pattern === 'string' && file.includes(pattern))
          ) {
            analysis.configFiles.add(config);
          }
        }
      }
    }

    /**
     * Analyze test frameworks
     */
    async analyzeTestFrameworks(analysis) {
      const testPatterns = [
        [/\.test\./, 'Unit Tests'],
        [/\.spec\./, 'Spec Tests'],
        [/__tests__/, 'Jest/React Testing'],
        [/cypress/, 'Cypress'],
        [/playwright/, 'Playwright'],
        [/selenium/, 'Selenium'],
        [/jest/, 'Jest'],
        [/mocha/, 'Mocha'],
        [/jasmine/, 'Jasmine'],
        [/karma/, 'Karma'],
        [/pytest/, 'Pytest'],
        [/unittest/, 'Python unittest'],
      ];

      for (const file of analysis.files) {
        for (const [pattern, framework] of testPatterns) {
          if (
            (pattern instanceof RegExp && pattern.test(file)) ||
            (typeof pattern === 'string' && file.includes(pattern))
          ) {
            analysis.testFrameworks.add(framework);
          }
        }
      }
    }

    /**
     * Analyze package.json for Node.js projects
     */
    async analyzePackageJson(analysis) {
      if (!analysis.files.includes('package.json')) return;

      try {
        const content = await this.readFile('package.json', analysis.directory);
        const pkg = JSON.parse(content);

        // Analyze dependencies
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.peerDependencies,
          ...pkg.optionalDependencies,
        };

        for (const [name, version] of Object.entries(allDeps)) {
          analysis.dependencies.set(name, version);

          // Detect frameworks from dependencies
          this.detectFrameworkFromDependency(name, analysis.frameworks);
        }

        // Analyze scripts
        if (pkg.scripts) {
          for (const [name, script] of Object.entries(pkg.scripts)) {
            analysis.scripts.set(name, script);
          }
        }
      } catch (error) {
        console.warn('Error analyzing package.json:', error);
      }
    }

    /**
     * Analyze Cargo.toml for Rust projects
     */
    async analyzeCargoToml(analysis) {
      if (!analysis.files.includes('Cargo.toml')) return;

      try {
        const content = await this.readFile('Cargo.toml', analysis.directory);

        // Simple TOML parsing for dependencies
        const lines = content.split('\n');
        let inDependencies = false;

        for (const line of lines) {
          if (line.trim() === '[dependencies]') {
            inDependencies = true;
            continue;
          }

          if (line.trim().startsWith('[') && line.trim() !== '[dependencies]') {
            inDependencies = false;
            continue;
          }

          if (inDependencies && line.includes('=')) {
            const [name] = line.split('=').map(s => s.trim());
            if (name && !name.startsWith('#')) {
              analysis.dependencies.set(name.replace(/"/g, ''), 'rust-crate');
            }
          }
        }
      } catch (error) {
        console.warn('Error analyzing Cargo.toml:', error);
      }
    }

    /**
     * Analyze go.mod for Go projects
     */
    async analyzeGoMod(analysis) {
      if (!analysis.files.includes('go.mod')) return;

      try {
        const content = await this.readFile('go.mod', analysis.directory);
        const lines = content.split('\n');

        for (const line of lines) {
          if (line.trim().startsWith('require ')) {
            const match = line.match(/require\s+([^\s]+)/);
            if (match) {
              analysis.dependencies.set(match[1], 'go-module');
            }
          }
        }
      } catch (error) {
        console.warn('Error analyzing go.mod:', error);
      }
    }

    /**
     * Analyze pyproject.toml for Python projects
     */
    async analyzePyprojectToml(analysis) {
      if (!analysis.files.includes('pyproject.toml')) return;

      try {
        const content = await this.readFile('pyproject.toml', analysis.directory);

        // Simple parsing for Python dependencies
        const lines = content.split('\n');
        let inDependencies = false;

        for (const line of lines) {
          if (line.includes('dependencies') && line.includes('[')) {
            inDependencies = true;
            continue;
          }

          if (inDependencies && line.trim().startsWith(']')) {
            inDependencies = false;
            continue;
          }

          if (inDependencies && line.includes('"')) {
            const match = line.match(/"([^"]+)"/);
            if (match) {
              const depName = match[1].split('>=')[0].split('==')[0].split('~=')[0];
              analysis.dependencies.set(depName, 'python-package');
            }
          }
        }
      } catch (error) {
        console.warn('Error analyzing pyproject.toml:', error);
      }
    }

    /**
     * Analyze Dockerfile
     */
    async analyzeDockerfile(analysis) {
      const dockerFiles = analysis.files.filter(
        f => f.toLowerCase().includes('dockerfile') || f === 'Dockerfile'
      );

      if (dockerFiles.length === 0) return;

      try {
        for (const dockerFile of dockerFiles) {
          const content = await this.readFile(dockerFile, analysis.directory);
          const lines = content.split('\n');

          for (const line of lines) {
            if (line.trim().startsWith('FROM ')) {
              const baseImage = line.replace('FROM ', '').trim();
              analysis.dependencies.set(`docker:${baseImage}`, 'docker-image');
            }
          }
        }
      } catch (error) {
        console.warn('Error analyzing Dockerfile:', error);
      }
    }

    /**
     * Analyze project structure
     */
    async analyzeProjectStructure(analysis) {
      const structure = {
        hasTests: false,
        hasDocs: false,
        hasConfig: false,
        hasSrc: false,
        hasAssets: false,
        directories: new Set(),
        depth: 0,
      };

      // Analyze directory structure
      const directories = analysis.files.filter(f => !f.includes('.'));
      structure.directories = new Set(directories);

      // Check for common patterns
      structure.hasTests = analysis.files.some(
        f => f.includes('test') || f.includes('spec') || f.includes('__tests__')
      );

      structure.hasDocs = analysis.files.some(
        f => f.includes('doc') || f.includes('README') || f.includes('.md')
      );

      structure.hasConfig = analysis.configFiles.size > 0;

      structure.hasSrc = analysis.files.some(
        f => f.startsWith('src/') || f.startsWith('lib/') || f.startsWith('app/')
      );

      structure.hasAssets = analysis.files.some(
        f => f.includes('assets') || f.includes('static') || f.includes('public')
      );

      analysis.structure = structure;
    }

    /**
     * Calculate project complexity
     */
    calculateComplexity(analysis) {
      let score = 0;

      // Language diversity
      score += analysis.languages.size * 2;

      // Framework count
      score += analysis.frameworks.size * 3;

      // Build tools
      score += analysis.buildTools.size * 2;

      // Dependencies
      score += Math.min(analysis.dependencies.size / 10, 5);

      // Configuration complexity
      score += analysis.configFiles.size;

      // File count
      score += Math.min(analysis.files.length / 50, 5);

      if (score < 10) return 'low';
      if (score < 25) return 'medium';
      if (score < 50) return 'high';
      return 'very-high';
    }

    /**
     * Generate project recommendations
     */
    async generateRecommendations(analysis) {
      const recommendations = [];

      // Testing recommendations
      if (!analysis.structure.hasTests) {
        recommendations.push({
          type: 'testing',
          priority: 'high',
          message: 'No tests detected. Consider adding automated tests.',
          suggestion: this.getTestingRecommendation(analysis),
        });
      }

      // Documentation recommendations
      if (!analysis.structure.hasDocs) {
        recommendations.push({
          type: 'documentation',
          priority: 'medium',
          message: 'Limited documentation found. Consider adding README.md.',
          suggestion: 'Create comprehensive documentation for your project',
        });
      }

      // Dependency recommendations
      if (analysis.dependencies.size > 50) {
        recommendations.push({
          type: 'dependencies',
          priority: 'medium',
          message: 'Large number of dependencies detected.',
          suggestion: 'Review dependencies and remove unused ones',
        });
      }

      // Security recommendations
      if (analysis.dependencies.has('lodash') && !analysis.dependencies.has('lodash-es')) {
        recommendations.push({
          type: 'security',
          priority: 'low',
          message: 'Consider using lodash-es for better tree-shaking',
          suggestion: 'npm install lodash-es && npm uninstall lodash',
        });
      }

      // Build tool recommendations
      if (analysis.languages.has('TypeScript') && !analysis.buildTools.has('TypeScript')) {
        recommendations.push({
          type: 'build',
          priority: 'medium',
          message: 'TypeScript detected but no build configuration found',
          suggestion: 'Add tsconfig.json for TypeScript configuration',
        });
      }

      return recommendations;
    }

    /**
     * Determine overall project type
     */
    determineProjectType(analysis) {
      // Check for specific project types
      if (analysis.files.includes('package.json')) {
        if (analysis.dependencies.has('react')) return 'react';
        if (analysis.dependencies.has('vue')) return 'vue';
        if (analysis.dependencies.has('@angular/core')) return 'angular';
        if (analysis.dependencies.has('next')) return 'nextjs';
        if (analysis.dependencies.has('nuxt')) return 'nuxtjs';
        if (analysis.dependencies.has('express')) return 'express';
        if (analysis.dependencies.has('fastify')) return 'fastify';
        return 'node';
      }

      if (analysis.files.includes('Cargo.toml')) return 'rust';
      if (analysis.files.includes('go.mod')) return 'go';
      if (analysis.files.includes('pyproject.toml') || analysis.files.includes('setup.py'))
        return 'python';
      if (analysis.files.includes('pom.xml')) return 'maven-java';
      if (analysis.files.includes('build.gradle')) return 'gradle-java';
      if (analysis.files.includes('Package.swift')) return 'swift';
      if (analysis.files.includes('mix.exs')) return 'elixir';
      if (analysis.files.includes('composer.json')) return 'php';
      if (analysis.files.includes('Gemfile')) return 'ruby';

      // Fallback to primary language
      if (analysis.languages.size > 0) {
        const primaryLang = Array.from(analysis.languages.entries()).sort(
          (a, b) => b[1].percentage - a[1].percentage
        )[0][0];
        return primaryLang.toLowerCase();
      }

      return 'unknown';
    }

    /**
     * Get testing recommendation based on project type
     */
    getTestingRecommendation(analysis) {
      const projectType = this.determineProjectType(analysis);

      const testingRecommendations = {
        react: 'npm install --save-dev @testing-library/react jest',
        vue: 'npm install --save-dev @vue/test-utils jest',
        angular: 'ng add @angular/testing',
        node: 'npm install --save-dev jest',
        python: 'pip install pytest',
        rust: 'Built-in testing with `cargo test`',
        go: 'Built-in testing with `go test`',
        java: 'Add JUnit dependency',
      };

      return testingRecommendations[projectType] || 'Add appropriate testing framework';
    }

    /**
     * Setup language detectors
     */
    setupLanguageDetectors() {
      const languageExtensions = {
        '.js': 'JavaScript',
        '.jsx': 'JavaScript',
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript',
        '.py': 'Python',
        '.rs': 'Rust',
        '.go': 'Go',
        '.java': 'Java',
        '.kt': 'Kotlin',
        '.scala': 'Scala',
        '.cpp': 'C++',
        '.cxx': 'C++',
        '.cc': 'C++',
        '.c': 'C',
        '.h': 'C/C++',
        '.hpp': 'C++',
        '.cs': 'C#',
        '.php': 'PHP',
        '.rb': 'Ruby',
        '.swift': 'Swift',
        '.dart': 'Dart',
        '.ex': 'Elixir',
        '.exs': 'Elixir',
        '.clj': 'Clojure',
        '.cljs': 'ClojureScript',
        '.hs': 'Haskell',
        '.ml': 'OCaml',
        '.fs': 'F#',
        '.elm': 'Elm',
        '.lua': 'Lua',
        '.r': 'R',
        '.m': 'Objective-C',
        '.mm': 'Objective-C++',
        '.vim': 'Vim Script',
        '.sh': 'Shell',
        '.bash': 'Bash',
        '.zsh': 'Zsh',
        '.fish': 'Fish',
        '.ps1': 'PowerShell',
        '.sql': 'SQL',
        '.html': 'HTML',
        '.css': 'CSS',
        '.scss': 'SCSS',
        '.sass': 'Sass',
        '.less': 'Less',
        '.stylus': 'Stylus',
        '.json': 'JSON',
        '.xml': 'XML',
        '.yaml': 'YAML',
        '.yml': 'YAML',
        '.toml': 'TOML',
        '.ini': 'INI',
        '.cfg': 'Config',
        '.conf': 'Config',
      };

      for (const [ext, lang] of Object.entries(languageExtensions)) {
        this.languageDetectors.set(ext, lang);
      }
    }

    /**
     * Setup framework detectors
     */
    setupFrameworkDetectors() {
      const frameworkPatterns = [
        [['next.config.js', 'pages/', '_app.js'], 'Next.js'],
        [['nuxt.config.js', 'nuxt.config.ts'], 'Nuxt.js'],
        [['angular.json', 'src/app/'], 'Angular'],
        [['svelte.config.js', '*.svelte'], 'Svelte'],
        [['astro.config.js', 'src/pages/'], 'Astro'],
        [['remix.config.js', 'app/root.tsx'], 'Remix'],
        [['gatsby-config.js', 'gatsby-node.js'], 'Gatsby'],
        [['eleventy.config.js', '.eleventy.js'], '11ty'],
        [['tailwind.config.js'], 'Tailwind CSS'],
        [['postcss.config.js'], 'PostCSS'],
        [['babel.config.js', '.babelrc'], 'Babel'],
        [['electron-builder.json', 'electron/'], 'Electron'],
        [['capacitor.config.json'], 'Capacitor'],
        [['ionic.config.json'], 'Ionic'],
        [['expo/', 'app.json'], 'Expo'],
        [['flutter/', 'pubspec.yaml'], 'Flutter'],
        [['android/', 'ios/'], 'React Native'],
      ];

      for (const [patterns, framework] of frameworkPatterns) {
        this.frameworkDetectors.set(patterns, framework);
      }
    }

    /**
     * Utility methods
     */
    getFileExtension(filename) {
      return filename.substring(filename.lastIndexOf('.'));
    }

    getLanguageFromExtension(ext) {
      return this.languageDetectors.get(ext);
    }

    matchesPattern(files, patterns) {
      return patterns.some(pattern => {
        if (pattern.endsWith('/')) {
          return files.some(file => file.startsWith(pattern));
        } else if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return files.some(file => regex.test(file));
        } else {
          return files.includes(pattern);
        }
      });
    }

    detectFrameworkFromDependency(depName, frameworks) {
      const dependencyFrameworks = {
        react: 'React',
        vue: 'Vue.js',
        '@angular/core': 'Angular',
        svelte: 'Svelte',
        next: 'Next.js',
        nuxt: 'Nuxt.js',
        gatsby: 'Gatsby',
        express: 'Express.js',
        fastify: 'Fastify',
        koa: 'Koa.js',
        nestjs: 'NestJS',
        electron: 'Electron',
        'react-native': 'React Native',
        expo: 'Expo',
        ionic: 'Ionic',
        '@capacitor/core': 'Capacitor',
        tailwindcss: 'Tailwind CSS',
        bootstrap: 'Bootstrap',
        'material-ui': 'Material-UI',
        antd: 'Ant Design',
        'chakra-ui': 'Chakra UI',
        'styled-components': 'Styled Components',
        emotion: 'Emotion',
        redux: 'Redux',
        mobx: 'MobX',
        vuex: 'Vuex',
        pinia: 'Pinia',
      };

      for (const [dep, framework] of Object.entries(dependencyFrameworks)) {
        if (depName.includes(dep)) {
          frameworks.add(framework);
        }
      }
    }

    async getDirectoryContents(directory) {
      if (window.electronAPI && window.electronAPI.getDirectoryContents) {
        return await window.electronAPI.getDirectoryContents(directory);
      }
      return { files: [], directories: [] };
    }

    async readFile(filename, directory) {
      if (window.electronAPI && window.electronAPI.readFile) {
        return await window.electronAPI.readFile(`${directory}/${filename}`);
      }
      throw new Error(new Error(new Error('File reading not available')));
    }

    async countLines(filename, directory) {
      try {
        const content = await this.readFile(filename, directory);
        return content.split('\n').length;
      } catch (error) {
        return 0;
      }
    }
  }

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProjectAnalyzer };
  } else {
    window.ProjectAnalyzer = ProjectAnalyzer;
  }
})(); // End of wrapper function

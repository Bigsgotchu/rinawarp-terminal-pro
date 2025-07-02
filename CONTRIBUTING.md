# Contributing to RinaWarp Terminal

We welcome contributions from the community! This guide will help you get started with contributing to RinaWarp Terminal.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Our Pledge

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them learn
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different experience levels

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher  
- **Git** for version control
- **Code Editor** (VS Code recommended)

### Development Tools

We recommend these tools for the best development experience:

- **VS Code Extensions**:
  - ESLint
  - Prettier
  - GitLens
  - Electron
  - JavaScript (ES6) code snippets

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/your-username/rinawarp-terminal.git
cd rinawarp-terminal

# Add upstream remote
git remote add upstream https://github.com/Bigsgotchu/rinawarp-terminal.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Install Electron app dependencies
npm run postinstall
```

### 3. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp .env.template .env.local

# Edit .env with your configuration
# See .env.example for all available options
```

### 4. Start Development

```bash
# Start development mode
npm run dev

# In another terminal, start the server (if needed)
npm run server-dev
```

### 5. Verify Setup

```bash
# Run quality checks
npm run lint
npm run test
npm run security:check
```

## 📖 Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Fixes**: Fix existing issues
- **✨ Features**: Add new functionality
- **📚 Documentation**: Improve docs and guides
- **🎨 UI/UX**: Enhance user interface and experience
- **⚡ Performance**: Optimize code and improve speed
- **🧪 Testing**: Add or improve tests
- **🔧 Tooling**: Improve development tools and processes

### Before You Start

1. **Check existing issues**: Search for existing issues or feature requests
2. **Create an issue**: If none exists, create a new issue to discuss your idea
3. **Get feedback**: Wait for maintainer feedback before starting work
4. **Assign yourself**: Comment on the issue to let others know you're working on it

### Contribution Workflow

1. **Create a branch** from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/my-awesome-feature
   ```

2. **Make your changes** following our coding standards

3. **Test thoroughly**:
   ```bash
   npm run lint
   npm run test
   npm run security:check
   npm run build:dir  # Test build
   ```

4. **Commit your changes** using conventional commits:
   ```bash
   git add .
   git commit -m "feat(terminal): add split pane functionality"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/my-awesome-feature
   # Create PR on GitHub
   ```

## 🔄 Pull Request Process

### PR Requirements

Before submitting a PR, ensure:

- [ ] Code follows our style guidelines
- [ ] All tests pass
- [ ] Security checks pass
- [ ] Documentation is updated (if needed)
- [ ] PR description clearly explains the changes
- [ ] Linked to relevant issue(s)

### PR Checklist

```markdown
## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have tested this change locally
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Documentation
- [ ] I have updated the documentation accordingly
- [ ] I have updated the README if needed
- [ ] I have added JSDoc comments for new functions/classes
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Maintainer review** - at least one approval required
3. **Testing** by reviewers on their local environment
4. **Merge** by maintainers after approval

## 📝 Coding Standards

### JavaScript Style Guide

We use ESLint and Prettier for consistent code formatting:

```bash
# Auto-fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

### Code Style

- **Use ES6+ features**: arrow functions, destructuring, async/await
- **Prefer const/let** over var
- **Use descriptive names** for variables and functions
- **Keep functions small** and focused on single responsibility
- **Add JSDoc comments** for public APIs

### Example Code Style

```javascript
/**
 * Creates a new terminal instance with specified configuration
 * @param {Object} config - Terminal configuration
 * @param {string} config.shell - Shell command to use
 * @param {Object} config.theme - Theme configuration
 * @returns {Promise<Terminal>} Terminal instance
 */
async function createTerminal(config) {
    const { shell = 'powershell', theme = 'dark' } = config;
    
    try {
        const terminal = new Terminal({
            theme: getTheme(theme),
            shell,
            ...defaultConfig
        });
        
        await terminal.initialize();
        return terminal;
    } catch (error) {
        logger.error('Failed to create terminal:', error);
        throw new Error(`Terminal creation failed: ${error.message}`);
    }
}
```

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(terminal): add split pane functionality
fix(ui): resolve theme switching issue
docs(readme): update installation instructions
test(terminal): add unit tests for command history
```

## 🧪 Testing

### Test Types

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Security Tests**: Test for vulnerabilities

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- terminal.test.js
```

### Writing Tests

Use Jest for testing:

```javascript
// Example test
describe('TerminalManager', () => {
    let terminalManager;

    beforeEach(() => {
        terminalManager = new TerminalManager();
    });

    test('should create new terminal', async () => {
        const terminal = await terminalManager.createTerminal();
        
        expect(terminal).toBeDefined();
        expect(terminal.id).toBeDefined();
        expect(terminalManager.getTerminalCount()).toBe(1);
    });

    test('should handle terminal errors gracefully', async () => {
        const mockConfig = { shell: 'invalid-shell' };
        
        await expect(terminalManager.createTerminal(mockConfig))
            .rejects.toThrow('Terminal creation failed');
    });
});
```

## 📚 Documentation

### Documentation Standards

- **Keep it current**: Update docs with code changes
- **Be clear and concise**: Use simple language
- **Include examples**: Show how to use features
- **Add screenshots**: Visual examples for UI changes

### Types of Documentation

1. **Code Documentation**:
   - JSDoc comments for all public APIs
   - Inline comments for complex logic
   - README files for major components

2. **User Documentation**:
   - Installation guides
   - Feature documentation
   - Troubleshooting guides

3. **Developer Documentation**:
   - Architecture overview
   - API documentation
   - Plugin development guide

### Documentation Structure

```
docs/
├── guides/           # User guides
│   ├── INSTALL.md
│   ├── QUICKSTART.md
│   └── SETUP.md
├── development/      # Developer docs
│   ├── ARCHITECTURE.md
│   ├── PLUGIN_API.md
│   └── BUILD.md
├── deployment/       # Deployment guides
└── root-docs/        # Project documentation
```

## 🔧 Development Tools

### Available Scripts

```bash
# Development
npm run dev           # Start development mode
npm run server        # Start payment server
npm run server-dev    # Start server with hot reload

# Building
npm run build         # Build for current platform
npm run build:all     # Build for all platforms
npm run build:win     # Build Windows installer
npm run build:mac     # Build macOS application
npm run build:linux   # Build Linux packages

# Quality Assurance
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run test          # Run Jest tests
npm run security:audit # Security audit

# Maintenance
npm run clean         # Clean build artifacts
npm run rebuild       # Clean and rebuild
```

### Debugging

#### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Main Process",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/src/main.js",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
            "windows": {
                "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
            },
            "env": {
                "NODE_ENV": "development"
            }
        }
    ]
}
```

#### Chrome DevTools

For renderer process debugging:
1. Start development mode: `npm run dev`
2. Open DevTools: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Opt+I` (macOS)
3. Use breakpoints and console debugging

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version** to ensure bug still exists
3. **Minimal reproduction case** that demonstrates the issue

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
Clear description of what you expected to happen

## Actual Behavior
Clear description of what actually happened

## Environment
- OS: [e.g. Windows 11, macOS 12.6, Ubuntu 22.04]
- Node.js version: [e.g. 18.17.0]
- RinaWarp Terminal version: [e.g. 1.0.6]
- Electron version: [e.g. 25.3.1]

## Additional Context
- Screenshots
- Error messages
- Logs
- Related issues
```

## 💡 Feature Requests

### Before Requesting

1. **Check existing requests** to avoid duplicates
2. **Consider the scope** - does it fit the project goals?
3. **Think about implementation** - how might it work?

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature you'd like to see

## Problem Statement
What problem would this feature solve?

## Proposed Solution
How do you envision this feature working?

## Alternatives Considered
Other solutions you've considered

## Additional Context
- Mockups or wireframes
- Examples from other tools
- Use cases
```

## 🌟 Recognition

We appreciate all contributions and recognize contributors in various ways:

- **Contributors list** in README
- **Release notes** mention significant contributions
- **GitHub achievements** and badges
- **Special recognition** for outstanding contributions

### Hall of Fame

Contributors who make significant impact may be invited to join as:

- **Maintainers**: Help review PRs and guide development
- **Core Team**: Shape project direction and architecture
- **Ambassadors**: Help with community and documentation

## 📞 Getting Help

### Community Channels

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs and request features
- **Email**: contribute@rinawarp-terminal.web.app

### Mentorship

New contributors can get help from:

- **Good First Issues**: Labeled beginner-friendly issues
- **Mentoring**: Senior contributors available for guidance
- **Documentation**: Comprehensive guides and examples

## 🎯 Project Goals

Understanding our goals helps align contributions:

### Primary Goals
- **Developer Experience**: Make terminal usage more productive
- **Cross-Platform**: Work seamlessly on all major platforms
- **Performance**: Fast, responsive, memory-efficient
- **Extensibility**: Plugin system for customization

### Non-Goals
- **Browser-based**: We focus on desktop applications
- **Terminal replacement**: We enhance, not replace shells
- **Kitchen sink**: We avoid feature bloat

## 🔄 Release Process

### Release Schedule
- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: Quarterly for significant changes

### Contribution Timeline
- **Bug fixes**: Can be included in next patch release
- **Small features**: Included in next minor release
- **Large features**: May span multiple releases

---

## Thank You! 🙏

Your contributions make RinaWarp Terminal better for everyone. Whether you're fixing a typo, adding a feature, or helping other users, every contribution matters.

**Happy coding!** 🚀

---

*For more information, see our [README.md](README.md) and [documentation](docs/).*

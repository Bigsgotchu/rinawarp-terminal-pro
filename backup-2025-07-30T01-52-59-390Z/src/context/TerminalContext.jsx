import React, { createContext, useState, useEffect } from 'react';

export const TerminalContext = createContext();

export const TerminalProvider = ({ children }) => {
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentPath, setCurrentPath] = useState('~');
  const [gitStatus, setGitStatus] = useState(null);
  const [activePlugins, setActivePlugins] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    commandsExecuted: 0,
    timeSpent: 0,
    errorsEncountered: 0,
  });

  // AI-powered contextual help
  const getContextualHelp = () => {
    const context = {
      command: currentCommand,
      path: currentPath,
      theme: currentTheme,
      recentCommands: commandHistory.slice(-5),
      gitStatus,
      plugins: activePlugins,
    };

    // Context-aware help suggestions
    if (currentCommand.includes('git')) {
      return {
        type: 'git',
        title: 'Git Commands Help',
        suggestions: [
          '`git status` - Check repository status and staging area',
          '`git log --oneline` - View commit history in compact format',
          '`git branch` - List all branches (* marks current)',
          '`git checkout <branch>` - Switch to a different branch',
          '`git add .` - Stage all changes for commit',
          '`git commit -m "message"` - Commit staged changes',
          '`git push` - Push commits to remote repository',
          '`git pull` - Pull latest changes from remote',
        ],
        voiceCommands: [
          'Hey Rina, check git status',
          'Show me git log',
          'List all branches',
          'Switch to main branch',
        ],
      };
    } else if (currentCommand.includes('npm') || currentCommand.includes('yarn')) {
      return {
        type: 'package-manager',
        title: 'Package Manager Help',
        suggestions: [
          '`npm install` - Install all dependencies from package.json',
          '`npm run dev` - Start development server',
          '`npm test` - Run test suite',
          '`npm run build` - Build project for production',
          '`npm list` - Show installed packages',
          '`npm outdated` - Check for outdated packages',
          '`npm update` - Update packages to latest versions',
        ],
        voiceCommands: [
          'Install packages',
          'Start development server',
          'Run tests',
          'Build for production',
        ],
      };
    } else if (currentCommand.includes('docker')) {
      return {
        type: 'docker',
        title: 'Docker Commands Help',
        suggestions: [
          '`docker ps` - List running containers',
          '`docker images` - List available images',
          '`docker build .` - Build image from Dockerfile',
          '`docker run <image>` - Run container from image',
          '`docker stop <container>` - Stop running container',
          '`docker rm <container>` - Remove container',
          '`docker logs <container>` - View container logs',
        ],
        voiceCommands: [
          'List running containers',
          'Show docker images',
          'Build docker image',
          'Stop all containers',
        ],
      };
    } else if (
      currentCommand.includes('cd') ||
      currentCommand.includes('ls') ||
      currentCommand.includes('mkdir')
    ) {
      return {
        type: 'filesystem',
        title: 'File System Navigation',
        suggestions: [
          '`ls -la` - List all files with detailed info',
          '`cd <path>` - Change to specified directory',
          '`cd ..` - Move up one directory level',
          '`cd ~` - Go to home directory',
          '`mkdir <name>` - Create new directory',
          '`touch <file>` - Create new file',
          '`rm <file>` - Remove file',
          '`cp <source> <dest>` - Copy file or directory',
        ],
        voiceCommands: [
          'List files in current directory',
          'Change to home directory',
          'Create new folder',
          'Show file details',
        ],
      };
    }

    return {
      type: 'general',
      title: 'General Terminal Help',
      suggestions: [
        '`help` - Show this help system',
        '`clear` - Clear terminal screen',
        '`history` - Show command history',
        '`pwd` - Show current directory path',
        '`whoami` - Show current user',
        '`date` - Show current date and time',
        '`man <command>` - Show manual for command',
        'Use Tab for auto-completion',
        'Use ↑/↓ arrows for command history',
      ],
      voiceCommands: [
        'Hey Rina, what can you do?',
        'Show me the help menu',
        'Clear the screen',
        'What directory am I in?',
      ],
    };
  };

  // Plugin-based help extensions
  const getPluginHelp = pluginName => {
    const plugin = activePlugins.find(p => p.name === pluginName);
    if (!plugin) return null;

    return {
      type: 'plugin',
      title: `${plugin.name} Plugin Help`,
      suggestions: plugin.helpTopics || [],
      voiceCommands: plugin.voiceCommands || [],
    };
  };

  // AI suggestion processing
  const processAICommand = async command => {
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          context: {
            currentPath,
            recentCommands: commandHistory.slice(-3),
            theme: currentTheme,
            gitStatus,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.response);
        return data.response;
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    }

    return 'AI assistant is currently unavailable. Please try again later.';
  };

  // Command execution with analytics
  const executeCommand = command => {
    const newCommand = command.trim();
    if (!newCommand) return;

    setCurrentCommand(newCommand);
    setCommandHistory(prev => [...prev, newCommand]);
    setSessionStats(prev => ({
      ...prev,
      commandsExecuted: prev.commandsExecuted + 1,
    }));

    // Log for analytics
    console.log('🔍 Command executed:', newCommand);

    // Auto-show help for help requests
    if (newCommand.includes('help') || newCommand.includes('--help') || newCommand === '?') {
      return true; // Signal to show help modal
    }

    return false;
  };

  // Update git status periodically
  useEffect(() => {
    const updateGitStatus = async () => {
      try {
        const response = await fetch('/api/git/status');
        if (response.ok) {
          const status = await response.json();
          setGitStatus(status);
        }
      } catch (error) {
        console.error('Git status error:', error);
      }
    };

    const interval = setInterval(updateGitStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Session time tracking
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setSessionStats(prev => ({
        ...prev,
        timeSpent: Math.floor((Date.now() - startTime) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    // State
    currentCommand,
    commandHistory,
    aiSuggestions,
    currentTheme,
    isVoiceEnabled,
    currentPath,
    gitStatus,
    activePlugins,
    sessionStats,

    // Actions
    setCurrentCommand,
    setCommandHistory,
    setAiSuggestions,
    setCurrentTheme,
    setIsVoiceEnabled,
    setCurrentPath,
    setGitStatus,
    setActivePlugins,
    executeCommand,
    processAICommand,

    // Computed values
    getContextualHelp,
    getPluginHelp,
  };

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
};

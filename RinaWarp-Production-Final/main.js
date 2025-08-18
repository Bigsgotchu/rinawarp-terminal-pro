// Load environment variables first
require('dotenv').config({ path: '.env.sentry' });

const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { initSentryMain } = require('./sentry-main.js');

// Initialize Sentry monitoring
initSentryMain();

let mainWindow;
let isDebugMode = process.argv.includes('--debug');

// Suppress GPU-related warnings and errors
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

// Suppress certificate-related warnings in development
if (process.env.NODE_ENV === 'development' || process.argv.includes('--debug')) {
  app.commandLine.appendSwitch('--ignore-certificate-errors');
  app.commandLine.appendSwitch('--ignore-ssl-errors');
  app.commandLine.appendSwitch('--ignore-certificate-errors-spki-list');
  app.commandLine.appendSwitch('--disable-web-security');
  app.commandLine.appendSwitch('--allow-running-insecure-content');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow CORS for AI API calls
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Auxclick',
    },
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? false : true,
    show: false,
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (isDebugMode) {
      mainWindow.webContents.openDevTools();
    }

    // Set window title
    mainWindow.setTitle('RinaWarp Terminal - Personal Edition v3.0');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'RinaWarp',
      submenu: [
        {
          label: 'About RinaWarp Personal Edition',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About RinaWarp Personal Edition',
              message: 'RinaWarp Terminal - Personal Edition v3.0',
              detail:
                'Complete AI Integration with Premium Features\n\nLicensed to: kgilley\nLicense: Personal Use Only\nExpires: NEVER\n\nFeatures:\n• Full AI Integration (Anthropic, OpenAI, Groq)\n• Enhanced Terminal Experience\n• Voice Control & Output\n• Real-time Collaboration\n• Cloud Sync & Backups\n• Advanced Analytics\n• Unlimited Customization\n• Automation Builder\n• Enterprise Security\n\n© 2024 RinaWarp Technologies',
            });
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('menu-new-terminal');
          },
        },
        {
          label: 'Save Session',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-session');
          },
        },
        {
          label: 'Load Session',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-load-session');
          },
        },
        { type: 'separator' },
        {
          label: 'Export Configuration',
          click: () => {
            mainWindow.webContents.send('menu-export-config');
          },
        },
        {
          label: 'Import Configuration',
          click: () => {
            mainWindow.webContents.send('menu-import-config');
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
        { type: 'separator' },
        {
          label: 'Find in Terminal',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-find');
          },
        },
      ],
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Setup AI Provider',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            mainWindow.webContents.send('menu-setup-ai');
          },
        },
        {
          label: 'Open AI Chat',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('menu-ai-chat');
          },
        },
        { type: 'separator' },
        {
          label: 'Code Generation',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => {
            mainWindow.webContents.send('menu-code-generation');
          },
        },
        {
          label: 'Smart Debug',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            mainWindow.webContents.send('menu-debug');
          },
        },
        {
          label: 'Architecture Analysis',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.send('menu-architecture');
          },
        },
      ],
    },
    {
      label: 'Features',
      submenu: [
        {
          label: 'Voice Control',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            mainWindow.webContents.send('menu-voice-control');
          },
        },
        {
          label: 'Performance Mode',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow.webContents.send('menu-performance');
          },
        },
        {
          label: 'Collaboration',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => {
            mainWindow.webContents.send('menu-collaboration');
          },
        },
        { type: 'separator' },
        {
          label: 'Cloud Sync',
          click: () => {
            mainWindow.webContents.send('menu-cloud-sync');
          },
        },
        {
          label: 'Analytics',
          click: () => {
            mainWindow.webContents.send('menu-analytics');
          },
        },
        {
          label: 'Automation Builder',
          click: () => {
            mainWindow.webContents.send('menu-automation');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu-toggle-sidebar');
          },
        },
        {
          label: 'Terminal Themes',
          click: () => {
            mainWindow.webContents.send('menu-themes');
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(process.platform === 'darwin' ? [{ type: 'separator' }, { role: 'front' }] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Personal Edition Guide',
          click: () => {
            shell.openExternal('https://rinawarptech.com/creator-edition-guide');
          },
        },
        {
          label: 'AI Setup Tutorial',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'AI Setup Tutorial',
              message: 'Setting up AI Providers',
              detail:
                '1. Click "Setup AI Provider" or use Cmd+Shift+A\n\n2. Choose your preferred AI provider:\n   • Anthropic Claude (Most intelligent)\n   • OpenAI GPT-4 (Most versatile)\n   • Groq Llama (Free & fast)\n\n3. Get your API key:\n   • Anthropic: console.anthropic.com\n   • OpenAI: platform.openai.com\n   • Groq: console.groq.com\n\n4. Enter your API key and activate\n\n5. Start using AI features immediately!\n\nAll AI features include:\n• Enhanced chat assistant\n• Code generation\n• Smart debugging\n• Architecture analysis\n• Voice integration',
            });
          },
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Keyboard Shortcuts',
              message: 'RinaWarp Personal Edition Shortcuts',
              detail:
                'AI Features:\nCmd+Shift+A - Setup AI Provider\nCmd+Shift+C - Open AI Chat\nCmd+Shift+G - Code Generation\nCmd+Shift+D - Smart Debug\nCmd+Shift+R - Architecture Analysis\n\nTerminal:\nCmd+T - New Terminal\nCmd+S - Save Session\nCmd+O - Load Session\nCmd+F - Find in Terminal\n\nFeatures:\nCmd+Shift+V - Voice Control\nCmd+Shift+P - Performance Mode\nCmd+Shift+B - Collaboration\nCmd+B - Toggle Sidebar\n\nGeneral:\nCmd+Plus/Minus - Zoom\nCmd+0 - Reset Zoom\nF11 - Fullscreen',
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Support & Feedback',
          click: () => {
            shell.openExternal('https://rinawarptech.com/support');
          },
        },
        {
          label: 'Check for Updates',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Updates',
              message: 'You have the latest version!',
              detail:
                'RinaWarp Personal Edition v3.0\n\nAs a Personal Edition license holder, you automatically receive all updates and new features.\n\nNext update will include:\n• Enhanced AI models\n• Advanced voice features\n• New terminal themes\n• Improved collaboration tools',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for renderer communication
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Auto-updater configuration (only in production)
const isDev = process.env.NODE_ENV === 'development' || isDebugMode;

if (!isDev && app.isPackaged) {
  autoUpdater.checkForUpdatesAndNotify();

  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
  });

  autoUpdater.on('update-available', info => {
    console.log('📥 Update available:', info.version);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `RinaWarp Personal Edition v${info.version} is available!`,
        detail:
          "The update will be downloaded in the background. You will be notified when it's ready to install.",
        buttons: ['OK'],
      });
    }
  });

  autoUpdater.on('update-not-available', info => {
    console.log('✅ You have the latest version:', info.version);
  });

  autoUpdater.on('error', err => {
    console.log('❌ Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', progressObj => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    console.log(log_message);
  });

  autoUpdater.on('update-downloaded', info => {
    console.log('✅ Update downloaded:', info.version);
    if (mainWindow) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update Ready',
          message: `RinaWarp Personal Edition v${info.version} has been downloaded!`,
          detail:
            'The update is ready to install. The application will restart to apply the update.',
          buttons: ['Restart Now', 'Later'],
          defaultId: 0,
        })
        .then(result => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    }
  });
} else {
  console.log('🔧 Running in development mode - auto-updater disabled');
}

// Initialize Sentry for main process (do this early)
initSentryMain();

// App event handlers
app.whenReady().then(() => {
  createWindow();

  // Check for updates after window is ready (only in production)
  if (!isDev && app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle protocol for deep linking (future feature)
app.setAsDefaultProtocolClient('rinawarp');

// macOS specific handling
if (process.platform === 'darwin') {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    // Handle rinawarp:// protocol URLs
    console.log('Deep link:', url);
  });
}

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { autoUpdater } from 'electron-updater';
import { AgentOrchestrator } from './agentd/orchestrator';
import { DataStore } from './store/datastore';
import { setupIPCHandlers } from './ipc/handlers';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

let mainWindow: BrowserWindow | null = null;
let agentOrchestrator: AgentOrchestrator;
let dataStore: DataStore;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp() {
  // Initialize data store
  dataStore = new DataStore();
  await dataStore.connect();

  // Initialize agent orchestrator
  agentOrchestrator = new AgentOrchestrator(dataStore);
  await agentOrchestrator.initialize();

  // Setup IPC handlers
  setupIPCHandlers(ipcMain, agentOrchestrator, dataStore);

  // Setup auto-updater
  setupAutoUpdater();

  // Create window
  createWindow();
}

function setupAutoUpdater() {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://updates.rinawarp.com',
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:downloaded', info);
  });

  // Check for updates on launch (production only)
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates();
  }
}

// App lifecycle
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  // Cleanup
  if (agentOrchestrator) {
    await agentOrchestrator.shutdown();
  }
  if (dataStore) {
    await dataStore.disconnect();
  }
});

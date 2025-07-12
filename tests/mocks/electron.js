// Mock Electron module for testing
module.exports = {
  app: {
    getName: jest.fn(() => 'RinaWarp Terminal'),
    getVersion: jest.fn(() => '1.0.0'),
    getPath: jest.fn(name => {
      const paths = {
        home: '/mock/home',
        userData: '/mock/userData',
        temp: '/mock/temp',
        exe: '/mock/exe',
        appData: '/mock/appData',
      };
      return paths[name] || '/mock/default';
    }),
    getAppPath: jest.fn(() => '/mock/app/path'),
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    isReady: jest.fn(() => true),
  },

  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(() => Promise.resolve()),
    loadURL: jest.fn(() => Promise.resolve()),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      openDevTools: jest.fn(),
    },
    isVisible: jest.fn(() => true),
    isFocused: jest.fn(() => true),
  })),

  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },

  ipcRenderer: {
    invoke: jest.fn(() => Promise.resolve('mocked response')),
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },

  shell: {
    openExternal: jest.fn(() => Promise.resolve()),
    openPath: jest.fn(() => Promise.resolve()),
    showItemInFolder: jest.fn(),
  },

  dialog: {
    showOpenDialog: jest.fn(() =>
      Promise.resolve({
        canceled: false,
        filePaths: ['/mock/file/path'],
      })
    ),
    showSaveDialog: jest.fn(() =>
      Promise.resolve({
        canceled: false,
        filePath: '/mock/save/path',
      })
    ),
    showMessageBox: jest.fn(() =>
      Promise.resolve({
        response: 0,
      })
    ),
  },

  Menu: {
    buildFromTemplate: jest.fn(() => ({
      popup: jest.fn(),
    })),
    setApplicationMenu: jest.fn(),
  },

  nativeTheme: {
    shouldUseDarkColors: true,
    on: jest.fn(),
  },

  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      size: { width: 1920, height: 1080 },
    })),
    getAllDisplays: jest.fn(() => []),
    on: jest.fn(),
  },
};

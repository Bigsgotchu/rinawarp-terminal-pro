// Type declarations for Electron API in renderer

interface ElectronAPI {
  invoke: <T = any, R = any>(channel: string, data?: T) => Promise<{ success: boolean; data?: R; error?: string }>;
  on: (channel: string, callback: (data: any) => void) => void;
  off: (channel: string, callback: (data: any) => void) => void;

  runs: {
    create: (prompt: string, mode?: 'local' | 'remote') => Promise<{ success: boolean; data?: any; error?: string }>;
    get: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    list: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    cancel: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
    recover: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  agent: {
    status: () => Promise<{ success: boolean; data?: any; error?: string }>;
    execute: (task: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    diagnostic: () => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  build: {
    start: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  test: {
    start: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  deploy: {
    start: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  updates: {
    check: () => Promise<{ success: boolean; data?: any; error?: string }>;
    download: () => Promise<{ success: boolean; error?: string }>;
    install: () => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

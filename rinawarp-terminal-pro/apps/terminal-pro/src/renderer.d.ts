export {};

declare global {
  interface Window {
    rina?: {
      plan: (intent: string) => Promise<any>;
      execute: () => Promise<any>;
      verifyLicense: (customerId: string) => Promise<any>;
      ptyStart?: (args?: { cols?: number; rows?: number; cwd?: string }) => Promise<any>;
      ptyWrite?: (data: string) => Promise<any>;
      ptyResize?: (cols: number, rows: number) => Promise<any>;
    };
  }
}

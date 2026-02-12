export {};

declare global {
  interface Window {
    rina?: {
      plan: (intent: string) => Promise<any>;
      execute: () => Promise<any>;
      verifyLicense: (customerId: string) => Promise<any>;
    };
  }
}

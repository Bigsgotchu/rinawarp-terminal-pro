import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: ['golden/**/*.spec.ts', 'tests/**/*.spec.ts'],
  outputDir: './videos',
  fullyParallel: false,
  workers: 1,

  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'on',
  },

  retries: 0,

  timeout: 60000,
})

import { defineConfig } from '@playwright/test'

const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: '.',
  testMatch: ['golden/**/*.spec.ts'],
  outputDir: './videos',
  fullyParallel: false,
  workers: 1,

  use: {
    baseURL: 'http://localhost:3000',
    headless: isCi,
    screenshot: 'only-on-failure',
    video: isCi ? 'retain-on-failure' : 'on',
    trace: isCi ? 'retain-on-failure' : 'on',
  },

  retries: isCi ? 1 : 0,

  timeout: 120_000,
})

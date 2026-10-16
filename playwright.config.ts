import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'
import { configureTestDatabase } from './tests/helpers/testDatabase'

configureTestDatabase()
const production = process.env.PLAYWRIGHT_SERVER_MODE === 'production'
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const baseURL = `${production ? 'https' : 'http'}://localhost:${port}`
// The local production proxy and Payload must agree on the browser's public origin.
if (production) process.env.APP_URL = baseURL

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Removes accounts left by an interrupted run, once, before any worker starts
  globalSetup: './tests/e2e/global-setup.ts',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // Don't auto-open the report: it would block the terminal on failure
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    // Only the ephemeral local test certificate is untrusted. Production cookies stay Secure.
    ignoreHTTPSErrors: production,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        // Keep the self-signed local test certificate accepted across Chromium contexts.
        launchOptions: production ? { args: ['--ignore-certificate-errors'] } : {},
      },
    },
    // Pagination, the ruler and the toolbars rely on how each engine lays out lines, moves the
    // caret, keeps the focus and tracks a pointer: all three run them
    {
      name: 'firefox',
      testMatch:
        /(pagination|pageSettings|toolbar|editorHistory|login|editorReliability|documentCache)\.e2e\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch:
        /(pagination|pageSettings|toolbar|editorHistory|login|editorReliability|documentCache)\.e2e\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    stdout: 'pipe',
    command: production ? 'node scripts/start-e2e-production.mjs' : `pnpm dev --port ${port}`,
    // Reusing an unrelated local server can make fixtures and browser requests target different DBs.
    reuseExistingServer: false,
    url: baseURL,
    ignoreHTTPSErrors: production,
  },
})

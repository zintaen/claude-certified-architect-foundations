import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.(js|ts)/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Mobile journeys share a single Next dev server; keep concurrency modest to avoid
  // compile/navigation races under parallel cold route hits.
  workers: process.env.CI ? 1 : 3,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.(js|ts)/,
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /mobile\.spec\.(js|ts)/,
      // Keep journeys single-threaded: practice/exam rely on client session state and
      // a shared Next dev server; parallel cold compiles made starts flake.
      workers: 1,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      // Tight budgets so SEC-001 hammer e2e can trip 429 without 200+ requests.
      RATE_LIMIT_WRITE_MAX: '20',
      RATE_LIMIT_READ_MAX: '100',
      HOST_CUTOVER_REDIRECT: process.env.HOST_CUTOVER_REDIRECT || 'off',
      ENTITLEMENTS_ENFORCED: process.env.ENTITLEMENTS_ENFORCED || 'off',
      PADDLE_ENV: process.env.PADDLE_ENV || 'sandbox',
      // Local PAY-002 mock defaults — not forced in CI (no Supabase for fulfillment).
      ...(process.env.CI
        ? {}
        : {
            PADDLE_DEV_MOCK: process.env.PADDLE_DEV_MOCK || '1',
            NEXT_PUBLIC_PADDLE_DEV_MOCK: process.env.NEXT_PUBLIC_PADDLE_DEV_MOCK || '1',
            PADDLE_USE_FIXTURE_IDS: process.env.PADDLE_USE_FIXTURE_IDS || '1',
            PADDLE_WEBHOOK_SECRET:
              process.env.PADDLE_WEBHOOK_SECRET || 'local_dev_paddle_webhook_secret',
          }),
    },
  },
});

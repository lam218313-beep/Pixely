/**
 * End-to-end tests: the real app (production build) in phone-sized browsers, talking
 * to a fake backend (e2e/mock-api.ts). Run with `npm run test:e2e`.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4310;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Same address as production: the mobile version lives at /m/ (tests use relative paths like './plan').
    baseURL: `http://localhost:${PORT}/m/`,
    serviceWorkers: 'block',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // On CI the preinstalled Chromium lives elsewhere; locally (cloud sessions) use /opt/pw-browsers.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    // A small iPhone-sized screen (Chromium engine; WebKit isn't installed here).
    { name: 'iphone-se', use: { browserName: 'chromium', viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    env: { PIXELY_BASE: '/m/' }, // both the build and the preview server must know the app lives at /m/
    url: `http://localhost:${PORT}/m/`,
    reuseExistingServer: false, // always a fresh build: a leftover server could be serving old code
    timeout: 120_000,
  },
});

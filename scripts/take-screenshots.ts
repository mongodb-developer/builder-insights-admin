/**
 * Comprehensive screenshot script for Builder Insights Admin
 * 
 * Takes screenshots of all authenticated pages with the tour/walkthrough dismissed.
 * Uses Playwright to automate browser interactions.
 * 
 * Usage: npx tsx scripts/take-screenshots.ts
 */

import { chromium, type Page, type Browser } from 'playwright';
import { SignJWT } from 'jose';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.resolve(__dirname, '../public/screenshots');
const AUTH_SECRET = 'builder-insights-secret-change-me'; // dev fallback secret
const COOKIE_NAME = 'di-session';

const VIEWPORT = { width: 1440, height: 900 };

// All screens to capture, in order
const SCREENS: { name: string; path: string; waitFor?: string; actions?: (page: Page) => Promise<void> }[] = [
  // Public pages
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },

  // Authenticated pages (admin role gives access to everything)
  { name: 'dashboard', path: '/dashboard', waitFor: '[data-tour="nav-dashboard"]' },
  { name: 'search', path: '/search' },
  { name: 'events', path: '/events' },
  { name: 'insights', path: '/insights' },
  { name: 'advocates', path: '/advocates' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'world', path: '/world', actions: async (page) => {
    // Wait for the map tiles to load
    await page.waitForTimeout(3000);
  }},
  { name: 'program', path: '/program' },
  { name: 'bugs', path: '/bugs' },
  { name: 'import', path: '/import' },
  { name: 'settings', path: '/settings' },
  { name: 'monitoring', path: '/monitoring' },
  { name: 'operations', path: '/operations' },
  { name: 'admin-users', path: '/admin/users' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createJWT(): Promise<string> {
  const secret = new TextEncoder().encode(AUTH_SECRET);
  return new SignJWT({
    email: 'admin@builderinsights.app',
    name: 'Admin Tester',
    role: 'admin',
    isAdmin: true,
    advocateId: 'tester_admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(secret);
}

async function dismissTour(page: Page): Promise<void> {
  // Set localStorage to mark tour as completed BEFORE any navigation
  await page.evaluate(() => {
    localStorage.setItem('builder-insights-tour-completed', 'true');
  });
}

async function waitForPageReady(page: Page, screen: typeof SCREENS[0]): Promise<void> {
  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  
  // Wait for specific selector if provided
  if (screen.waitFor) {
    await page.waitForSelector(screen.waitFor, { timeout: 10000 }).catch(() => {});
  }

  // Run custom actions if provided
  if (screen.actions) {
    await screen.actions(page);
  }

  // Small delay for animations/transitions to finish
  await page.waitForTimeout(1500);

  // Dismiss any remaining overlays/dialogs that might be open
  // Close any MUI Snackbar alerts
  const snackbarClose = page.locator('.MuiSnackbar-root button[aria-label="Close"], .MuiAlert-action button');
  if (await snackbarClose.count() > 0) {
    await snackbarClose.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Close any Joyride tooltip that might have appeared despite localStorage
  const joyrideClose = page.locator('button[data-action="close"]');
  if (await joyrideClose.count() > 0) {
    await joyrideClose.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Also try the skip button
  const joyrideSkip = page.locator('button[data-action="skip"]');
  if (await joyrideSkip.count() > 0) {
    await joyrideSkip.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('📸 Builder Insights Screenshot Tool');
  console.log('====================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate a valid JWT for admin access
  console.log('Generating admin JWT...');
  const jwt = await createJWT();

  // Launch browser
  console.log('Launching browser...\n');
  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // Retina quality
  });

  const page = await context.newPage();

  // Set the auth cookie for authenticated pages
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: jwt,
      domain: new URL(BASE_URL).hostname,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Navigate to dashboard first to set localStorage (dismiss tour)
  console.log('Dismissing tour/walkthrough...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await dismissTour(page);
  // Reload to ensure tour is dismissed
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('Tour dismissed. Starting screenshots...\n');

  const results: { name: string; file: string; success: boolean; error?: string }[] = [];

  for (const screen of SCREENS) {
    const filename = `${screen.name}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    process.stdout.write(`  Capturing ${screen.name.padEnd(20)} ... `);

    try {
      await page.goto(`${BASE_URL}${screen.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Re-apply tour dismissal on every navigation (in case it gets cleared)
      await dismissTour(page);

      await waitForPageReady(page, screen);

      await page.screenshot({
        path: filepath,
        fullPage: false, // Viewport-sized screenshots for consistency
      });

      console.log(`OK  -> ${filename}`);
      results.push({ name: screen.name, file: filename, success: true });
    } catch (error: any) {
      console.log(`FAIL (${error.message})`);
      results.push({ name: screen.name, file: filename, success: false, error: error.message });
    }
  }

  // Cleanup
  await browser.close();

  // Summary
  console.log('\n====================================');
  console.log('Screenshot Summary');
  console.log('====================================');
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`  Total:     ${results.length}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Output:    ${OUTPUT_DIR}/`);

  if (failed > 0) {
    console.log('\nFailed screenshots:');
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  }

  console.log('\nDone!');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

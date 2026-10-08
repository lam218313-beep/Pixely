/**
 * Not a test: `VITRINA=1 npx playwright test vitrina` takes the desktop screenshots shown on pixely.pe,
 * with the demo brand "Casa Norte" (no real client) at 2× resolution, into e2e-vitrina/.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { IMG, VITRINA_IMG_DIR } from '../../app/e2e/mock-api';

test.skip(!process.env.VITRINA, 'solo con VITRINA=1');
test.use({ scenario: 'vitrina', deviceScaleFactor: 2 });

test('computadora', async ({ page, api: _ }) => {
  await page.route(`${IMG}/vitrina/**`, (r) => r.fulfill({ contentType: 'image/jpeg', body: readFileSync(new URL(`${r.request().url().split('/').pop()}.jpg`, VITRINA_IMG_DIR)) }));
  await page.addInitScript(() => {
    const u = JSON.parse(localStorage.getItem('pixely_user') ?? '{}'); u.user_email = 'ana@casanorte.pe'; localStorage.setItem('pixely_user', JSON.stringify(u));
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Ir a Inicio/ })).toBeVisible({ timeout: 15000 });
  for (const [label, file] of [['Mercado', 'mercado'], ['Estrategia', 'estrategia'], ['Planificación', 'planificacion'], ['Validación', 'validacion'], ['Publicaciones', 'publicaciones'], ['Voz de marca', 'voz']]) {
    await page.getByRole('button', { name: new RegExp(`^Ir a ${label}`) }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `e2e-vitrina/d-${file}.png` });
    await page.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach((el) => { el.scrollTop = 420; }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e-vitrina/d-${file}-2.png` });
  }
});

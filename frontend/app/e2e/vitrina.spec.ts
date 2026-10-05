/**
 * Not a test: `VITRINA=1 npx playwright test vitrina --project=android` takes the screenshots shown
 * on pixely.pe, with the demo brand "Casa Norte" (no real client) at 3× resolution, into e2e-vitrina/.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { IMG } from './mock-api';

const MEDIA = process.env.VITRINA_MEDIA ?? '/home/user/pixely_web/public/media';
test.skip(!process.env.VITRINA, 'solo con VITRINA=1');
test.use({ scenario: 'vitrina', deviceScaleFactor: 3 });

const OUT = 'e2e-vitrina';
const card = (page: import('@playwright/test').Page) => page.locator('article').first();

test.beforeEach(async ({ page, api: _ }) => {
  // The demo client is "Ana" from Casa Norte (runs after the fixture's sign-in, so it wins).
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('pixely_app_session') ?? '{}'); s.email = 'ana@casanorte.pe'; localStorage.setItem('pixely_app_session', JSON.stringify(s)); });
  await page.route(`${IMG}/vitrina/**`, (r) => r.fulfill({ contentType: 'image/jpeg', body: readFileSync(`${MEDIA}/${r.request().url().split('/').pop()}-1600.jpg`) }));
});

async function shot(page: import('@playwright/test').Page, name: string, full = false) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/m-${name}.png`, fullPage: full });
}

test('móvil', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Casa Norte/ })).toBeVisible();
  await shot(page, 'inicio');

  await page.goto('./plan');
  await shot(page, 'plan');
  await shot(page, 'plan-largo', true);
  await page.goto('./plan/i1');
  await shot(page, 'idea');
  await shot(page, 'idea-larga', true);

  await page.goto('./validar');
  await expect(card(page)).toHaveAccessibleName('Tres formas de llevar el negro');
  await shot(page, 'validar');
  // Mid-swipe: the finger is still down, the card leans and shows "Aprobar".
  const box = (await card(page).boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 3;
  for (const [name, dx] of [['validar-aprobar', 150], ['validar-cambios', -150]] as const) {
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(x + (dx * i) / 6, y + 4 * i);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/m-${name}.png` });
    await page.mouse.move(x, y); await page.mouse.up(); await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Pedir cambios' }).click();
  await page.getByRole('radio', { name: 'Imagen' }).click();
  await page.getByRole('button', { name: 'Más luz' }).click();
  await shot(page, 'cambios');
  await page.keyboard.press('Escape');

  await page.goto('./validar/v1');
  await shot(page, 'pieza');
  await shot(page, 'pieza-larga', true);

  await page.goto('./marca');
  await shot(page, 'marca');
  await page.goto('./marca/mercado');
  await shot(page, 'mercado');
  await shot(page, 'mercado-largo', true);
  await page.goto('./marca/voz');
  await shot(page, 'voz');

  await page.goto('./resultados/p1');
  await shot(page, 'resultado');
  await page.goto('./resultados');
  await shot(page, 'proximas');
});

/**
 * Not a test: `VITRINA=1 npx playwright test vitrina --project=android` takes the screenshots shown
 * on pixely.pe, with the demo brand "Casa Norte" (no real client) at 3× resolution, into e2e-vitrina/.
 */
import { readFileSync, writeFileSync } from 'node:fs';
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

/** Where things are on each screenshot, in % of the image (so pixely.pe can animate a finger on them). */
const spots: Record<string, { x: number; y: number; w: number; h: number }> = {};
async function spot(page: import('@playwright/test').Page, key: string, el: import('@playwright/test').Locator, full = false) {
  const b = (await el.boundingBox())!;
  const vw = page.viewportSize()!.width;
  const H = full ? await page.evaluate(() => document.documentElement.scrollHeight) : page.viewportSize()!.height;
  const sy = full ? await page.evaluate(() => window.scrollY) : 0;
  spots[key] = { x: +(((b.x + b.width / 2) / vw) * 100).toFixed(2), y: +(((b.y + sy + b.height / 2) / H) * 100).toFixed(2), w: +((b.width / vw) * 100).toFixed(2), h: +((b.height / H) * 100).toFixed(2) };
}

async function shot(page: import('@playwright/test').Page, name: string, full = false) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  // Long captures leave out what is pinned to the screen (tab bar, footer buttons): pixely.pe lays it on top.
  const hide = full ? await page.addStyleTag({ content: '.fixed { visibility: hidden !important; }' }) : null;
  await page.screenshot({ path: `${OUT}/m-${name}.png`, fullPage: full });
  if (hide) await hide.evaluate((el) => el.remove());
}

test('móvil', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Casa Norte/ })).toBeVisible();
  await shot(page, 'inicio');
  await spot(page, 'inicio.revisar', page.getByRole('link', { name: /Revisar ahora/ }));
  await spot(page, 'inicio.ideas', page.getByRole('link', { name: /ideas de .* por aprobar/ }));

  await page.goto('./plan');
  await shot(page, 'plan');
  await shot(page, 'plan-largo', true);
  await spot(page, 'plan.idea', page.getByRole('link', { name: /Cómo elegir tu talla/ }).first(), true);
  await page.goto('./plan/i1');
  await shot(page, 'idea');
  await shot(page, 'idea-larga', true);
  await spot(page, 'idea.aprobar', page.getByRole('button', { name: 'Aprobar idea' }));
  await spot(page, 'idea.dato', page.getByText('El dato de mercado detrás').locator('xpath=ancestor::div[contains(@class, "rounded")][1]'), true);

  await page.goto('./validar');
  await expect(card(page)).toHaveAccessibleName('Tres formas de llevar el negro');
  await shot(page, 'validar');
  await spot(page, 'validar.card', card(page));
  await spot(page, 'validar.aprobar', page.getByRole('button', { name: 'Aprobar' }));
  await spot(page, 'validar.cambios', page.getByRole('button', { name: 'Pedir cambios' }));
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
  await shot(page, 'cambios-vacio');
  await spot(page, 'cambios.imagen', page.getByRole('radio', { name: 'Imagen' }));
  await spot(page, 'cambios.luz', page.getByRole('button', { name: 'Más luz' }));
  await spot(page, 'cambios.enviar', page.getByRole('button', { name: 'Enviar al equipo' }));
  await page.getByRole('radio', { name: 'Imagen' }).click();
  await page.getByRole('button', { name: 'Más luz' }).click();
  await shot(page, 'cambios');
  await page.keyboard.press('Escape');
  // After approving: the next card and the "Deshacer" bar.
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect(card(page)).toHaveAccessibleName('La zapatilla blanca que va con todo');
  await shot(page, 'validar-siguiente');

  await page.goto('./validar/v1');
  await shot(page, 'pieza');
  await shot(page, 'pieza-larga', true);

  await page.goto('./marca');
  await shot(page, 'marca');
  await spot(page, 'marca.voz', page.getByRole('link', { name: /^Voz/ }));
  await spot(page, 'marca.mercado', page.getByRole('link', { name: /^Mercado/ }));
  await page.goto('./marca/mercado');
  await shot(page, 'mercado');
  await shot(page, 'mercado-largo', true);
  await page.goto('./marca/voz');
  await shot(page, 'voz');

  await page.goto('./resultados/p1');
  await shot(page, 'resultado');
  await page.goto('./resultados');
  await shot(page, 'proximas');
  writeFileSync(`${OUT}/hotspots.json`, JSON.stringify(spots, null, 2));
});

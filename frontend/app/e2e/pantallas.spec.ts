/** Opens every screen with full data and with an empty account: none may break. */
import { test, expect } from './fixtures';
import { day } from './mock-api';

const month = day(0).slice(0, 7);
const ROUTES = [
  '/', '/plan', `/plan?mes=${month}`, '/plan/mezcla', '/validar', '/resultados', '/resultados/publicadas', '/marca',
  '/validar/v1', '/validar/v3', '/validar/a1', '/validar/c1p', '/validar/x1',
  '/plan/i1', '/plan/i2', '/plan/i3', '/plan/x1', '/plan/no-existe',
  '/resultados/p1', '/resultados/p2', '/resultados/no-existe',
  '/marca/voz', '/marca/estrategia', '/marca/mercado', '/marca/ficha', '/cuenta',
  '/privacidad', '/eliminar-cuenta', '/esto-no-existe',
];

for (const scenario of ['full', 'empty'] as const) {
  test.describe(`cuenta ${scenario === 'full' ? 'con datos' : 'vacía'}`, () => {
    test.use({ scenario });
    for (const route of ROUTES) {
      test(`abre ${route}`, async ({ page, api: _ }) => {
        await page.goto(`.${route}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#root')).not.toBeEmpty();
        // Nothing may stick out sideways on a phone.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'sin scroll horizontal').toBeLessThanOrEqual(1);
      });
    }
  });
}

test('las pestañas navegan y muestran sus pendientes', async ({ page, api: _ }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Principal' });
  await expect(nav.getByRole('link', { name: 'Validar 3 pendientes' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Plan 3 pendientes' })).toBeVisible(); // i1, i2 y x1 (plan sin estado = pendiente)
  for (const [label, url] of [['Plan', /\/plan/], ['Validar', /\/validar/], ['Resultados', /\/resultados/], ['Marca', /\/marca/], ['Inicio', /\/m\/?$/]] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(url);
  }
});

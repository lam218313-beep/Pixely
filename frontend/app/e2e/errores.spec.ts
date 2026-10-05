/** When the server fails, the app explains it and lets the client retry; it never breaks. */
import { test, expect } from './fixtures';

test('si el servidor falla, se puede reintentar', async ({ page, api }) => {
  api.fail(/\/pieces$/, 500);
  await page.goto('./validar');
  await expect(page.getByRole('button', { name: 'Intentar de nuevo' })).toBeVisible({ timeout: 15000 });
  api.failures.clear();
  await page.getByRole('button', { name: 'Intentar de nuevo' }).click();
  await expect(page.locator('article').first()).toHaveAccessibleName('El viaje del grano');
});

test('si una decisión falla, la pieza vuelve y se avisa', async ({ page, api }) => {
  api.fail(/\/review$/, 500);
  await page.goto('./validar');
  await page.getByRole('button', { name: 'Pedir cambios' }).click();
  await page.getByRole('radio', { name: 'Texto' }).click();
  await page.getByLabel('Cuéntanos qué cambiar').fill('Cambiar el texto');
  await page.getByRole('button', { name: 'Enviar al equipo' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('si la sesión vence, vuelve a Entrar', async ({ page, api }) => {
  api.fail(/\/pieces$/, 401);
  api.fail(/\/auth\/refresh$/, 401);
  await page.goto('./');
  await expect(page).toHaveURL(/\/entrar$/, { timeout: 15000 });
});

test('cada pantalla de Marca sobrevive a un error del servidor', async ({ page, api }) => {
  api.fail(/\/(brand|strategy|market|clients)\//, 500);
  api.fail(/\/brand\/[^/]+$/, 500);
  for (const r of ['/marca', '/marca/voz', '/marca/estrategia', '/marca/mercado', '/marca/ficha', '/']) {
    await page.goto(`.${r}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).not.toBeEmpty();
  }
});

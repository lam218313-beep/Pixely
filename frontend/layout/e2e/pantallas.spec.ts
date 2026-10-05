/** Opens every desktop screen for a client and for the team; `CAPTURAS=1` also saves a picture of each. */
import { test, expect } from './fixtures';

const CLIENTE = ['Inicio', 'Ficha', 'Voz de marca', 'Mercado', 'Estrategia', 'Planificación', 'Validación', 'Publicaciones'];

async function visit(page: import('@playwright/test').Page, label: string, file: string) {
  await page.getByRole('button', { name: new RegExp(`^Ir a ${label}`) }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  if (process.env.CAPTURAS) await page.screenshot({ path: `e2e-capturas/${file}.png`, fullPage: false });
}

test('el cliente recorre todas sus pantallas', async ({ page, api: _ }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Ir a Inicio/ })).toBeVisible({ timeout: 15000 });
  for (const label of CLIENTE) await visit(page, label, `cliente-${label}`);
});

test.describe('equipo', () => {
  test.use({ cuenta: 'equipo' });
  test('el equipo ve su panel y las pantallas de una marca', async ({ page, api: _ }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^Ir a Panel del equipo/ })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);
    const shot = async (name: string) => { await page.waitForTimeout(700); if (process.env.CAPTURAS) await page.screenshot({ path: `e2e-capturas/equipo-${name}.png` }); };
    await shot('panel');
    await page.getByRole('button', { name: 'Nueva marca' }).click();
    await shot('nueva-marca');
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: /Café Prueba/ }).first().click();
    await shot('marca-resumen');
    const tabs = page.getByRole('navigation', { name: 'Páginas de la marca' });
    for (const label of ['Configuración', 'Ficha', 'Voz', 'Mercado', 'Estrategia', 'Planificación', 'Validación', 'Publicaciones']) {
      const tab = tabs.getByRole('button', { name: label, exact: true });
      if (await tab.count()) { await tab.click(); await page.waitForLoadState('networkidle'); await shot(`marca-${label}`); }
    }
  });
});

test.describe('sin sesión', () => {
  test('login', async ({ page, api: _ }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.waitForTimeout(800);
    if (process.env.CAPTURAS) await page.screenshot({ path: 'e2e-capturas/login.png' });
  });
});

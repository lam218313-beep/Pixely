import { test, expect } from './fixtures';

test('aprobar la voz de marca', async ({ page, api }) => {
  await page.goto('./marca/voz');
  await page.getByRole('button', { name: 'Aprobar voz' }).click();
  await expect.poll(() => api.sent('PATCH', /voice\/review$/).length).toBe(1);
});

test('aprobar la estrategia', async ({ page, api }) => {
  await page.goto('./marca/estrategia');
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect.poll(() => api.sent('PATCH', /strategy\/[^/]+\/review$/).length).toBe(1);
});

test('descargar el estudio de mercado en PDF', async ({ page, api: _ }) => {
  await page.goto('./marca');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Estudio de mercado en PDF/ }).click();
  expect((await download).suggestedFilename()).toBe('mercado-cafe-prueba.pdf');
});

test('cerrar sesión vuelve a Entrar', async ({ page, api: _ }) => {
  await page.goto('./cuenta');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.reload();
  await expect(page).toHaveURL(/\/entrar$/);
});

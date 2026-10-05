import { test, expect, swipe } from './fixtures';

const card = (page: import('@playwright/test').Page) => page.locator('article').first();

test('deslizar a la derecha aprueba (y se puede deshacer)', async ({ page, api }) => {
  await page.goto('./validar');
  await expect(card(page)).toHaveAccessibleName('El viaje del grano');
  await swipe(page, card(page), 260, 0);
  await expect(page.getByRole('status')).toContainText('Aprobada');
  await expect(card(page)).toHaveAccessibleName('Detrás de la barra');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(card(page)).toHaveAccessibleName('El viaje del grano');
  await page.waitForTimeout(4500);
  expect(api.sent('PATCH', /\/review$/)).toHaveLength(0);
});

test('la aprobación se envía a los 4 segundos', async ({ page, api }) => {
  await page.goto('./validar');
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect.poll(() => api.sent('PATCH', /pieces\/v1\/review$/).length, { timeout: 7000 }).toBe(1);
  expect(api.sent('PATCH', /pieces\/v1\/review$/)[0].body).toMatchObject({ estado: 'Aprobado' });
});

test('deslizar a la izquierda pide cambios', async ({ page, api }) => {
  await page.goto('./validar');
  await swipe(page, card(page), -260, 0);
  await expect(page.getByRole('heading', { name: '¿Qué cambiamos?' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar al equipo' }).click();
  await expect(page.getByRole('alert')).toHaveText('Elige qué hay que cambiar.');
  await page.getByRole('radio', { name: 'Imagen' }).click();
  await page.getByRole('button', { name: 'Más luz' }).click();
  await page.getByRole('button', { name: 'Enviar al equipo' }).click();
  await expect(card(page)).toHaveAccessibleName('Detrás de la barra');
  expect(api.sent('PATCH', /pieces\/v1\/review$/)[0].body).toEqual({ estado: 'Cambios solicitados', comentario: 'Más luz', cambio_tipo: 'imagen' });
});

test('deslizar hacia arriba abre el detalle', async ({ page, api: _ }) => {
  await page.goto('./validar');
  await swipe(page, card(page), 0, -200);
  await expect(page).toHaveURL(/\/validar\/v1$/);
});

test('toques y arrastres cortos no rompen nada', async ({ page, api: _ }) => {
  await page.goto('./validar');
  for (const [dx, dy] of [[0, 0], [30, 5], [-40, 10], [5, 60], [100, -20]]) await swipe(page, card(page), dx, dy);
  await expect(card(page)).toHaveAccessibleName('El viaje del grano');
});

test('revisar todas lleva a "Todo al día"', async ({ page, api: _ }) => {
  await page.goto('./validar');
  for (const next of ['Detrás de la barra', 'Tu primer espresso']) {
    await swipe(page, card(page), 260, 0);
    await expect(card(page)).toHaveAccessibleName(next);
  }
  await swipe(page, card(page), 260, 0);
  await expect(page.getByRole('heading', { name: /Todo al día/ })).toBeVisible();
  await expect(page.getByText(/Aprobaste 3 piezas/)).toBeVisible();
});

test('aprobar desde el detalle', async ({ page, api }) => {
  await page.goto('./validar/v2');
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
  await expect(page.getByText('Texto para LinkedIn')).toBeVisible();
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect.poll(() => api.sent('PATCH', /pieces\/v2\/review$/).length).toBe(1);
});

test('dos deslizamientos seguidos muy rápidos no cuentan la pieza dos veces', async ({ page, api }) => {
  await page.goto('./validar');
  await swipe(page, card(page), 260, 0);
  await swipe(page, card(page), 260, 0);
  await expect(card(page)).toHaveAccessibleName(/Detrás de la barra|Tu primer espresso/);
  const header = page.getByText(/^\d+ de \d+$/);
  const [n, total] = (await header.innerText()).split(' de ').map(Number);
  expect(total, 'el total no cambia').toBe(3);
  expect(n).toBeLessThanOrEqual(3);
  await page.waitForTimeout(4500);
  const sent = api.sent('PATCH', /\/review$/).map((c) => c.path);
  expect(new Set(sent).size, 'cada pieza se envía una sola vez').toBe(sent.length);
});

test('en computadora se valida con el teclado', async ({ page, api }, info) => {
  test.skip(info.project.name !== 'computadora', 'solo en computadora');
  await page.goto('./validar');
  await expect(card(page)).toHaveAccessibleName('El viaje del grano');
  await page.keyboard.press('ArrowRight');
  await expect(card(page)).toHaveAccessibleName('Detrás de la barra');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: '¿Qué cambiamos?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/\/validar\/v2$/);
  await expect.poll(() => api.sent('PATCH', /pieces\/v1\/review$/).length).toBe(1);
});

import { test, expect } from './fixtures';

test('aprobar una idea pasa a la siguiente pendiente', async ({ page, api }) => {
  await page.goto('./plan/i1');
  await expect(page.getByRole('heading', { name: 'Idea con estructura' })).toBeVisible();
  await expect(page.getByText('El origen')).toBeVisible();
  await page.getByRole('button', { name: 'Aprobar idea' }).click();
  await expect(page.getByRole('heading', { name: 'Idea sencilla' })).toBeVisible();
  expect(api.sent('PATCH', /pieces\/i1\/plan-review$/)[0].body).toEqual({ estado: 'Aprobada', comentario: null });
});

test('pedir cambios en una idea', async ({ page, api }) => {
  await page.goto('./plan/i2');
  await page.getByRole('button', { name: 'Cambios' }).click();
  await page.getByLabel('Cuéntanos qué cambiar').fill('Mejor el viernes');
  await page.getByRole('button', { name: 'Enviar al equipo' }).click();
  await expect.poll(() => api.sent('PATCH', /pieces\/i2\/plan-review$/).length).toBe(1);
  expect(api.sent('PATCH', /pieces\/i2\/plan-review$/)[0].body).toEqual({ estado: 'Cambios solicitados', comentario: 'Mejor el viernes' });
});

test('aprobar todas las pendientes del mes', async ({ page, api }) => {
  await page.goto('./plan');
  await page.getByRole('button', { name: /Aprobar las \d+ pendientes/ }).click();
  await page.getByRole('button', { name: 'Sí, aprobarlas' }).click();
  await expect(page.getByText('Nada pendiente')).toBeVisible();
  expect(api.sent('POST', /approve-pending\?month=/)).toHaveLength(1);
});

test('cambiar de mes y ver la mezcla', async ({ page, api: _ }) => {
  await page.goto('./plan');
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await expect(page.getByText(/Sin plan para/)).toBeVisible();
  await page.getByRole('link', { name: 'Mezcla' }).click();
  await expect(page).toHaveURL(/\/plan\/mezcla\?mes=/);
});

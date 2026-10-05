import { test, expect } from './fixtures';

test('en el teléfono invita a instalar Pixely y se puede cerrar', async ({ page, api: _ }, info) => {
  test.skip(info.project.name === 'computadora', 'solo en teléfono');
  await page.goto('./');
  await expect(page.getByText('Instala Pixely en tu teléfono')).toBeVisible();
  await page.getByRole('button', { name: 'Instalar' }).click();
  await expect(page.getByText(/Agregar a pantalla de inicio/)).toBeVisible();
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.getByText('Instala Pixely en tu teléfono')).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Café Prueba/ })).toBeVisible();
  await expect(page.getByText('Instala Pixely en tu teléfono')).toBeHidden();
  await page.goto('./cuenta');
  await expect(page.getByText('Instala Pixely en tu teléfono')).toBeVisible();
});

test('en computadora no invita a instalar', async ({ page, api: _ }, info) => {
  test.skip(info.project.name !== 'computadora', 'solo en computadora');
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Café Prueba/ })).toBeVisible();
  await expect(page.getByText('Instala Pixely en tu teléfono')).toBeHidden();
});

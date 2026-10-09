import { test, expect } from './fixtures';

test.use({ signedIn: false });

test('sin sesión, cualquier pantalla lleva a Entrar', async ({ page, api: _ }) => {
  await page.goto('./validar');
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('heading', { name: /Tu marca se decide aquí/ })).toBeVisible();
});

test('entrar con contraseña, y error si está mal', async ({ page, api: _ }) => {
  await page.goto('./entrar');
  await page.getByLabel('Tu correo').fill('prueba@pixely.pe');
  await page.getByLabel('Contraseña').fill('equivocada');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();

  await page.getByLabel('Contraseña').fill('clave-correcta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Café Prueba/ })).toBeVisible();
});

test('sin servidor muestra "Sin conexión"', async ({ page, api: _ }) => {
  await page.route('http://api.pixely.test/token', (r) => r.abort('internetdisconnected'));
  await page.goto('./entrar');
  await page.getByLabel('Tu correo').fill('prueba@pixely.pe');
  await page.getByLabel('Contraseña').fill('clave-correcta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Sin conexión. Revisa tu internet.')).toBeVisible();
});

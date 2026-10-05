import { test, expect } from './fixtures';

test.use({ signedIn: false });

test('sin sesión, cualquier pantalla lleva a Entrar', async ({ page, api: _ }) => {
  await page.goto('./validar');
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('heading', { name: /Tu marca se decide aquí/ })).toBeVisible();
});

test('entrar con código', async ({ page, api }) => {
  await page.goto('./entrar');
  await page.getByLabel('Tu correo').fill('prueba@pixely.pe');
  await page.getByRole('button', { name: 'Recibir mi código' }).click();
  await expect(page.getByRole('heading', { name: /Revisa tu correo/ })).toBeVisible();
  expect(api.sent('POST', /\/auth\/code\/send$/)[0].body).toEqual({ email: 'prueba@pixely.pe' });

  await page.getByLabel('Código de 6 dígitos').fill('999999');
  await expect(page.getByRole('alert')).toHaveText('Código incorrecto o vencido.');

  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await expect(page).toHaveURL(/\/m\/?$/);
  await expect(page.getByRole('heading', { name: /Café Prueba/ })).toBeVisible();
});

test('entrar con contraseña, y error si está mal', async ({ page, api: _ }) => {
  await page.goto('./entrar');
  await page.getByRole('button', { name: 'Entrar con contraseña' }).click();
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
  await page.getByRole('button', { name: 'Entrar con contraseña' }).click();
  await page.getByLabel('Tu correo').fill('prueba@pixely.pe');
  await page.getByLabel('Contraseña').fill('clave-correcta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Sin conexión. Revisa tu internet.')).toBeVisible();
});

test('una cuenta del equipo pasa al panel del equipo con la sesión abierta', async ({ page, api: _ }) => {
  await page.route(/localhost:\d+\/$/, (r) => r.fulfill({ contentType: 'text/html', body: '<p>Panel del equipo</p>' }));
  await page.goto('./entrar');
  await page.getByRole('button', { name: 'Entrar con contraseña' }).click();
  await page.getByLabel('Tu correo').fill('equipo@pixely.pe');
  await page.getByLabel('Contraseña').fill('clave-correcta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Panel del equipo')).toBeVisible();
  const stored = await page.evaluate(() => ({ token: localStorage.getItem('pixely_access_token'), user: JSON.parse(localStorage.getItem('pixely_user') ?? '{}'), app: localStorage.getItem('pixely_app_session') }));
  expect(stored.token).toBe('token-de-prueba');
  expect(stored.user).toMatchObject({ role: 'admin', user_email: 'equipo@pixely.pe', tenant_id: 'tenant-default' });
  expect(stored.app, 'la app no guarda sesión para el equipo').toBeNull();
});

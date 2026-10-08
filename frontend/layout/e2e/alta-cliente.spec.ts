/** The team gives a new client a brand, a plan and access in one guided flow, and gets the welcome message. */
import { test, expect } from './fixtures';

test.use({ cuenta: 'equipo' });

test('alta de cliente paso a paso', async ({ page, api: _ }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo cliente' });

  const next = dialog.getByRole('button', { name: 'Siguiente' });
  await expect(next).toBeDisabled();
  await dialog.getByLabel('Nombre de la marca').fill('Café Andino');
  await dialog.getByLabel('Rubro').fill('Cafetería');
  await dialog.getByLabel('Ciudad').fill('Arequipa');
  await page.mouse.click(8, 8); // a stray click outside must not close it
  await expect(dialog.getByLabel('Nombre de la marca')).toHaveValue('Café Andino');
  await next.click();

  await expect(next).toBeDisabled(); // no plan yet
  await dialog.getByRole('radio', { name: /Basic/ }).click();
  await dialog.getByLabel('Fotos y carruseles al mes').fill('12');
  await dialog.getByLabel('Reels al mes').fill('4');
  await next.click();

  await dialog.getByLabel('Nombre del contacto').fill('Rosa Quispe');
  await dialog.getByLabel('Correo', { exact: true }).fill('rosa@cafeandino.pe');
  await dialog.getByLabel('WhatsApp').fill('999 888 777');
  await next.click();

  await expect(dialog.getByLabel('Correo para entrar')).toHaveValue('rosa@cafeandino.pe');
  await expect(dialog.getByText('Basic · 12 fotos y 4 reels al mes')).toBeVisible();
  if (process.env.CAPTURAS) await page.screenshot({ path: 'e2e-capturas/equipo-alta-acceso.png' });
  await dialog.getByRole('button', { name: 'Crear cliente' }).click();

  const done = page.getByRole('dialog', { name: 'Nuevo cliente' });
  await expect(done.getByRole('heading', { name: 'Café Andino ya está en Partners' })).toBeVisible();
  await expect(done.getByText(/Hola Rosa 👋 ¡te damos la bienvenida a Pixely! 🎉/)).toBeVisible();
  const wa = done.getByRole('link', { name: 'Abrir en WhatsApp' });
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/51999888777\?text=/);
  if (process.env.CAPTURAS) await page.screenshot({ path: 'e2e-capturas/equipo-alta-listo.png' });
  await done.getByRole('button', { name: 'Abrir la marca' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

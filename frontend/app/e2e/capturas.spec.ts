/** Not a test: `CAPTURAS=1 npm run test:e2e -- capturas` saves a picture of each screen in e2e-capturas/ to review the design. */
import { test } from './fixtures';

test.skip(!process.env.CAPTURAS, 'solo con CAPTURAS=1');

for (const route of ['/', '/plan', '/plan/i1', '/validar', '/validar/v1', '/resultados', '/resultados/publicadas', '/resultados/p1', '/marca', '/marca/voz', '/marca/estrategia', '/marca/mercado', '/marca/ficha', '/cuenta']) {
  test(`captura ${route}`, async ({ page, api: _ }, info) => {
    await page.goto(`.${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `e2e-capturas/${info.project.name}${route.replace(/\//g, '_') || '_'}.png`, fullPage: true });
  });
}

test.describe('sin sesión', () => {
  test.use({ signedIn: false });
  test('captura /entrar', async ({ page, api: _ }, info) => {
    await page.goto('./entrar');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e-capturas/${info.project.name}_entrar.png` });
  });
});

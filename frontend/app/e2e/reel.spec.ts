/**
 * Not a test: `REEL=1 npx playwright test reel --project=android` saves the pieces of the reel
 * "Así funciona Pixely Partners" (demo brand Casa Norte, no real client, 3×) into e2e-reel/:
 * every screen and state the video shows, small captures of the parts that move (typed email,
 * code boxes, the top card, the changes sheet) and piezas.json with where each element sits,
 * in CSS px of a 412-wide screen, so the video can animate exactly on top of them.
 * Copy the folder to pixely_marca/videos/public/manual-reel.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { API, IMG, VITRINA_IMG_DIR } from './mock-api';

const OUT = process.env.REEL_OUT ?? 'e2e-reel';
test.skip(!process.env.REEL, 'solo con REEL=1');
// Starts signed out (to film the sign-in); the code is typed for ana@casanorte.pe, the demo client.
test.use({ scenario: 'vitrina', deviceScaleFactor: 3, signedIn: false });

type Caja = { x: number; y: number; w: number; h: number };
const piezas: Record<string, Caja | Record<string, unknown>> = {};

async function caja(key: string, el: Locator) {
  const b = (await el.boundingBox())!;
  piezas[key] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  return piezas[key] as Caja;
}
async function foto(page: Page, name: string, espera = 500) {
  await page.waitForTimeout(espera);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
/** Box of the closest rounded block around a text (cards have no role of their own). */
const bloque = (page: Page, texto: string) =>
  page.getByText(texto, { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]');

test('piezas del reel', async ({ page, api: _ }) => {
  test.setTimeout(120_000); // it walks through the whole app
  mkdirSync(OUT, { recursive: true });
  await page.route(`${IMG}/vitrina/**`, (r) =>
    r.fulfill({ contentType: 'image/jpeg', body: readFileSync(new URL(`${r.request().url().split('/').pop()}.jpg`, VITRINA_IMG_DIR)) }));
  piezas.pantalla = { ancho: page.viewportSize()!.width, alto: page.viewportSize()!.height, escala: 3 };

  // 1. Entrar: the email is typed letter by letter.
  await page.goto('./entrar');
  await foto(page, 'entrar', 3500); // the entrance animation ends
  const correo = page.getByLabel('Tu correo');
  await caja('entrar.correo', correo);
  await caja('entrar.boton', page.getByRole('button', { name: 'Recibir mi código' }));
  await correo.click();
  const email = 'ana@casanorte.pe';
  for (let i = 0; i <= email.length; i++) {
    await correo.fill(email.slice(0, i));
    await correo.screenshot({ path: `${OUT}/entrar-correo-${String(i).padStart(2, '0')}.png` });
  }
  await foto(page, 'entrar-lleno', 200);

  // 2. Código: six digits, then "Verificando" (the server answer is held back to film it).
  await page.route(`${API}/auth/code/verify`, async (r) => { await new Promise((ok) => setTimeout(ok, 3000)); await r.fallback(); });
  await page.getByRole('button', { name: 'Recibir mi código' }).click();
  await expect(page.getByRole('heading', { name: /Revisa tu correo/ })).toBeVisible();
  await foto(page, 'codigo', 700);
  const casillas = await caja('codigo.casillas', page.getByLabel('Código de 6 dígitos'));
  const clip = { x: casillas.x - 6, y: casillas.y - 6, width: casillas.w + 12, height: casillas.h + 12 };
  piezas['codigo.recorte'] = { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
  await page.screenshot({ path: `${OUT}/codigo-casillas-0.png`, clip });
  for (const [i, d] of [...'123456'].entries()) {
    await page.keyboard.type(d);
    if (i < 5) { await page.waitForTimeout(120); await page.screenshot({ path: `${OUT}/codigo-casillas-${i + 1}.png`, clip }); }
  }
  await foto(page, 'codigo-verificando', 300);
  const orbe = page.locator('canvas').first();
  if (await orbe.count()) await caja('codigo.orbe', orbe);

  // 3. Inicio.
  await expect(page.getByRole('heading', { name: /Casa Norte/ })).toBeVisible({ timeout: 10000 });
  await foto(page, 'inicio', 900);
  const tarjeta = page.getByRole('link', { name: /TE TOCA A TI/i });
  await caja('inicio.tarjeta', tarjeta);
  await caja('inicio.revisar', page.getByText('Revisar ahora'));
  await tarjeta.screenshot({ path: `${OUT}/inicio-tarjeta.png` });
  await caja('nav.plan', page.getByRole('link', { name: /^Plan/ }));
  await caja('nav.validar', page.getByRole('link', { name: /^Validar/ }));
  await caja('nav.resultados', page.getByRole('link', { name: /^Resultados/ }));

  // 4. Plan: the month, one idea, approve it, and the count goes up.
  await page.goto('./plan');
  await foto(page, 'plan', 900);
  await caja('plan.resumen', bloque(page, 'ideas aprobadas'));
  await caja('plan.dia', page.getByRole('button', { name: /^17:/ }));
  await caja('plan.aprobar-todas', page.getByRole('button', { name: /Aprobar las/ }));
  await page.getByRole('button', { name: /^17:/ }).click();
  await page.waitForTimeout(600);
  await foto(page, 'plan-dia', 300);
  await page.goto('./plan/i1');
  await foto(page, 'idea', 900);
  await caja('idea.titulo', page.getByRole('heading', { level: 1 }));
  await caja('idea.cambios', page.getByRole('button', { name: 'Cambios' }));
  await caja('idea.aprobar', page.getByRole('button', { name: 'Aprobar idea' }));
  await page.getByRole('button', { name: 'Aprobar idea' }).click();
  await page.waitForTimeout(900);
  await foto(page, 'idea-aprobada', 200);
  await page.goto('./plan');
  await foto(page, 'plan-despues', 900);

  // 5. Validar: the top card on its own (it is swiped in the video), what is under it, Deshacer, the changes sheet.
  await page.goto('./validar');
  const carta = page.locator('article').first();
  await expect(carta).toHaveAccessibleName('Tres formas de llevar el negro');
  await foto(page, 'validar', 900);
  await caja('validar.tarjeta', carta);
  await caja('validar.aprobar', page.getByRole('button', { name: 'Aprobar' }));
  await caja('validar.cambios', page.getByRole('button', { name: 'Pedir cambios' }));
  await carta.screenshot({ path: `${OUT}/validar-tarjeta.png`, omitBackground: true });
  await carta.evaluate((el) => { (el as HTMLElement).style.visibility = 'hidden'; });
  await foto(page, 'validar-debajo', 200);
  await carta.evaluate((el) => { (el as HTMLElement).style.visibility = ''; });
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect(carta).toHaveAccessibleName('La zapatilla blanca que va con todo');
  await foto(page, 'validar-siguiente', 700);
  await caja('validar.deshacer', page.getByRole('button', { name: 'Deshacer' }));
  await page.waitForTimeout(4500); // Deshacer goes away
  await foto(page, 'validar-segunda', 300);
  await page.getByRole('button', { name: 'Pedir cambios' }).click();
  const hoja = page.getByRole('dialog');
  await expect(hoja).toBeVisible();
  await foto(page, 'cambios-vacio', 700);
  await caja('cambios.hoja', hoja);
  await hoja.screenshot({ path: `${OUT}/cambios-hoja.png`, omitBackground: true });
  await caja('cambios.imagen', page.getByRole('radio', { name: 'Imagen' }));
  await caja('cambios.luz', page.getByRole('button', { name: 'Más luz' }));
  await caja('cambios.enviar', page.getByRole('button', { name: 'Enviar al equipo' }));
  await page.getByRole('radio', { name: 'Imagen' }).click();
  await foto(page, 'cambios-imagen', 300);
  await page.getByRole('button', { name: 'Más luz' }).click();
  await foto(page, 'cambios-luz', 300);
  await hoja.screenshot({ path: `${OUT}/cambios-hoja-luz.png`, omitBackground: true });

  // 6. Resultados: the numbers, plus the same screen without them (the video counts them up).
  await page.goto('./resultados/p1');
  await foto(page, 'resultado', 900);
  const numeros = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter((e) => e.children.length === 0 && /^\d{1,3}(,\d{3})+$|^\d+$/.test((e.textContent ?? '').trim()) && (e as HTMLElement).offsetHeight > 20)
    .map((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return { texto: e.textContent!.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fuente: s.fontFamily, tam: s.fontSize, peso: s.fontWeight, color: s.color, espaciado: s.letterSpacing }; })
    .filter((n) => n.y < 839));
  piezas['resultado.numeros'] = { lista: numeros };
  await page.evaluate((textos) => document.querySelectorAll('*').forEach((e) => {
    if (e.children.length === 0 && textos.includes((e.textContent ?? '').trim())) (e as HTMLElement).style.color = 'transparent';
  }), numeros.map((n) => n.texto));
  await foto(page, 'resultado-sin-numeros', 200);

  writeFileSync(`${OUT}/piezas.json`, JSON.stringify(piezas, null, 2));
});

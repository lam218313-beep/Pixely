/**
 * Every test gets: the fake backend, a signed-in client (unless it opts out) and a guard
 * that fails the test if the app throws, logs an error or shows "Algo salió mal".
 */
import { test as base, expect, type Page } from '@playwright/test';
import { MockApi, SIGNED_IN, type Scenario } from './mock-api';

interface Options { scenario: Scenario; signedIn: boolean }

export const test = base.extend<Options & { api: MockApi }>({
  scenario: ['full', { option: true }],
  signedIn: [true, { option: true }],
  api: async ({ page, scenario, signedIn }, use) => {
    const api = new MockApi(scenario);
    await api.install(page);
    if (signedIn) await page.addInitScript((s) => { if (!sessionStorage.getItem('e2e-started')) { sessionStorage.setItem('e2e-started', '1'); localStorage.setItem('pixely_app_session', s); } }, SIGNED_IN);

    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`Error de la app: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !expectedConsole(m.text())) problems.push(`console.error: ${m.text()}`); });

    await use(api);

    const broken = await page.getByText('Algo salió mal').count();
    if (broken) problems.push('Se mostró la pantalla "Algo salió mal"');
    expect(problems, 'La app no debe romperse').toEqual([]);
  },
});

/** Errors the browser logs on purpose in some tests (a request the fake backend fails). */
const expectedConsole = (t: string) => /Failed to load resource: (the server responded with a status of [45]\d\d|net::ERR_INTERNET_DISCONNECTED)/.test(t);

export { expect };

/** Drags with a finger-like pointer: press, several moves, release. */
export async function swipe(page: Page, target: ReturnType<Page['locator']>, dx: number, dy: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error('No se ve la tarjeta');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 3;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await page.mouse.up();
}

/**
 * Every test gets the fake backend and a signed-in account: a client by default, or the team
 * (`test.use({ cuenta: 'equipo' })`). Fails if the page throws.
 */
import { test as base, expect } from '@playwright/test';
import { MockApi, CLIENT, type Scenario } from '../../app/e2e/mock-api';

type Cuenta = 'cliente' | 'equipo';

export const test = base.extend<{ cuenta: Cuenta; scenario: Scenario; api: MockApi }>({
  cuenta: ['cliente', { option: true }],
  scenario: ['full', { option: true }],
  api: async ({ page, cuenta, scenario }, use) => {
    const api = new MockApi(scenario);
    await api.install(page);
    // Outside services the desktop loads (CDN styles, fonts) still come from the internet; nothing else does.
    await page.addInitScript(({ cuenta, client }) => {
      const team = cuenta === 'equipo';
      localStorage.setItem('pixely_access_token', 'token-de-prueba');
      localStorage.setItem('pixely_user', JSON.stringify({ access_token: 'token-de-prueba', token_type: 'bearer', user_email: team ? 'equipo@pixely.pe' : 'prueba@pixely.pe', tenant_id: 'tenant-default', ficha_cliente_id: team ? null : client, logo_url: null, role: team ? 'admin' : 'analyst' }));
      if (!team) localStorage.setItem('clientId', client);
      localStorage.setItem('pixely_tutorial_seen_v2', 'true');
    }, { cuenta, client: CLIENT });
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`Error de la página: ${e.message}`));
    await use(api);
    expect(problems, 'La página no debe romperse').toEqual([]);
  },
});

export { expect };

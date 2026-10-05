/**
 * On the web, Pixely has one front door: this app's sign-in. Clients stay here on any screen;
 * team accounts (admins) are handed to the team panel (frontend/layout, at /) already signed in,
 * using the same keys that panel reads (frontend/layout/services/api.ts).
 */
import type { TokenResponse } from './api';

export function openTeamPanel(res: TokenResponse): void {
  localStorage.setItem('pixely_access_token', res.access_token);
  localStorage.setItem('pixely_user', JSON.stringify({ token_type: 'bearer', ...res }));
  if (res.ficha_cliente_id) localStorage.setItem('clientId', res.ficha_cliente_id);
  else localStorage.removeItem('clientId');
  window.location.replace('/');
}

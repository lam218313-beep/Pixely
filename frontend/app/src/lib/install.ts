/**
 * "Instalar Pixely": on the web the browser can add the app to the home screen, and from
 * there it opens full screen, without the address bar or the browser's buttons.
 * Android (Chrome, Brave, Edge, Samsung) offers a native prompt; iPhone needs the share menu.
 */
import { useEffect, useState } from 'react';
import { isNative } from './native';

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPrompt; listeners.forEach((l) => l()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()); });
}

export const isStandalone = () =>
  isNative || window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const ua = () => navigator.userAgent;
export const isIOS = () => /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isPhone = () => window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;

export type InstallWay = 'prompt' | 'ios' | 'menu';

/** How this phone can install the app, or null when it is already installed / not a phone. */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const way: InstallWay | null = isStandalone() || !isPhone() ? null : deferred ? 'prompt' : isIOS() ? 'ios' : 'menu';
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    return outcome === 'accepted';
  };
  return { way, install };
}

const KEY = 'pixely_instalar_oculto';
export const installHidden = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const hideInstall = () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } };

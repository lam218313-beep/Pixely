/**
 * What only exists inside the store app (Capacitor): the phone's secure storage, Face ID /
 * fingerprint, the Android back button, the status bar and sharing files. On the web every
 * function here quietly does nothing, so screens never need to ask where they run.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/** Dark status bar, splash hidden once the first screen is ready, back button = go back. */
export async function startNativeShell(goBack: () => boolean): Promise<void> {
  if (!isNative) return;
  // Each piece on its own: if one fails, the others (and the app) keep working.
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) { console.error('[pixely] splash', e); }
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') await StatusBar.setBackgroundColor({ color: '#0A0A0C' });
  } catch (e) { console.error('[pixely] status bar', e); }
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', () => { if (!goBack()) void App.minimizeApp(); });
  } catch (e) { console.error('[pixely] back button', e); }
}

/** Shares (or saves) a file the backend sent, through the phone's share sheet. */
export async function shareFile(blob: Blob, fileName: string, title: string): Promise<boolean> {
  if (!isNative) return false;
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const { uri } = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  await Share.share({ title, files: [uri] });
  return true;
}

// --- Face ID / fingerprint ---

export interface Biometry { available: boolean; label: string }

export async function checkBiometry(): Promise<Biometry> {
  if (!isNative) return { available: false, label: '' };
  const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth');
  const r = await BiometricAuth.checkBiometry().catch(() => null);
  if (!r?.isAvailable) return { available: false, label: '' };
  const label = r.biometryType === BiometryType.faceId ? 'Face ID'
    : r.biometryType === BiometryType.touchId ? 'Touch ID'
    : r.biometryType === BiometryType.faceAuthentication ? 'tu rostro'
    : 'tu huella';
  return { available: true, label };
}

/** Resolves true when the person proved it's them (or used the phone's PIN as backup). */
export async function verifyIdentity(): Promise<boolean> {
  if (!isNative) return true;
  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
  try {
    await BiometricAuth.authenticate({
      reason: 'Entra a Pixely',
      cancelTitle: 'Cancelar',
      allowDeviceCredential: true,
      androidTitle: 'Entrar a Pixely',
      androidSubtitle: 'Usa tu huella, tu rostro o el PIN del teléfono',
    });
    return true;
  } catch {
    return false;
  }
}

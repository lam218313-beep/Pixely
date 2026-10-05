import type { CapacitorConfig } from '@capacitor/cli';

// The store app wraps the same build (dist/) as the mobile web.
const config: CapacitorConfig = {
  appId: 'pe.pixely.app',
  appName: 'Pixely',
  webDir: 'dist',
  backgroundColor: '#0A0A0C',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never', backgroundColor: '#0A0A0C' },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#0A0A0C', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#0A0A0C', overlaysWebView: false },
  },
};

export default config;

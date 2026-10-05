import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// The client app: the mobile version of Partners on the web (served under /m/ next to the
// desktop site, see frontend/layout/vercel.json). Capacitor, when we go to the stores, serves it from the root.
const base = process.env.PIXELY_BASE ?? '/';

export default defineConfig({
  base,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by hand in main.tsx, only on the web: the store app already carries its files.
      injectRegister: false,
      includeAssets: ['favicon-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pixely',
        short_name: 'Pixely',
        description: 'Aprueba tu contenido, revisa tus piezas y mira cómo le va a tu marca.',
        lang: 'es-PE',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0C',
        theme_color: '#0A0A0C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        // API responses are never cached by the service worker: TanStack Query owns that cache.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});

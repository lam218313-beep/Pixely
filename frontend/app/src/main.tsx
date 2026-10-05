import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query';
import { AuthProvider } from './lib/auth';
import { App } from './App';
import { hydrateSession } from './lib/session';
import { isNative } from './lib/native';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './styles.css';

// Installable web app (works offline, opens fast). Not needed inside the store app.
if (!isNative) void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));

// The session is read from the phone's secure storage (or localStorage) before the first screen.
// Whatever happens there, the app always draws.
const root = createRoot(document.getElementById('root')!);
void hydrateSession()
  .catch((e) => console.error('[pixely] sesión', e))
  .finally(() => root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  ));


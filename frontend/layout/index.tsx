import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installSessionGuard } from './services/api';
import { reloadForNewBuild } from './utils/staleBuild';

installSessionGuard();

// After a deploy, an open tab still points at the previous build's files, which no
// longer exist. Reload once to pick up the new build instead of showing an error.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Global Error Boundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#e11d48' }}>¡Algo salió mal!</h1>
          <p style={{ color: '#475569' }}>La aplicación ha encontrado un error inesperado.</p>
          <pre style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f1f5f9',
            borderRadius: '0.5rem',
            overflowX: 'auto',
            textAlign: 'left',
            fontSize: '0.875rem'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
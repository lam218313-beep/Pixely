import React from 'react';
import { useRouteError } from 'react-router';

/** If a screen breaks, show what happened and a way out instead of a blank (black) screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[pixely] pantalla rota', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <BootError message={this.state.error.message} />;
  }
}

export const BootError: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 28, background: '#0A0A0C', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
    <p style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Algo salió mal<span style={{ color: '#EB0C6E' }}>.</span></p>
    <p style={{ margin: 0, fontSize: 15, color: '#B4B4BE', lineHeight: 1.5 }}>No pudimos abrir esta pantalla. Intenta de nuevo; si sigue pasando, avísanos.</p>
    {message && <p style={{ margin: 0, fontSize: 12, color: '#8A8A96', wordBreak: 'break-word' }}>{message}</p>}
    <button type="button" onClick={() => window.location.replace(import.meta.env.BASE_URL)} style={{ height: 52, borderRadius: 16, border: 'none', background: '#D90B66', color: '#fff', fontSize: 15, fontWeight: 800 }}>Volver a empezar</button>
  </div>
);

/** The router's own error screen: same friendly message instead of React Router's developer page. */
export const RouteError: React.FC = () => {
  const error = useRouteError();
  console.error('[pixely] pantalla rota', error);
  return <BootError message={error instanceof Error ? error.message : undefined} />;
};

/**
 * Every screen has its own address, so the phone's back button works and a
 * notification can open the exact screen (e.g. /validar).
 */
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { RequireAuth } from './layouts/RequireAuth';
import { TabsLayout, DetailLayout } from './layouts/TabsLayout';
import { EntrarScreen } from './features/entrar/EntrarScreen';
import { CodigoScreen } from './features/entrar/CodigoScreen';
import { InicioScreen } from './features/inicio/InicioScreen';
import { PlanScreen, PlanMezclaScreen } from './features/plan/PlanScreens';
import { PlanIdea } from './features/plan/PlanIdea';
import { ValidarScreen } from './features/validar/ValidarScreen';
import { ValidarPieza } from './features/validar/ValidarPieza';
import { ProximasScreen, PublicadasScreen } from './features/resultados/ResultadosScreens';
import { ResultadosPieza } from './features/resultados/ResultadosPieza';
import { MarcaScreen } from './features/marca/MarcaScreens';
import { MarcaVoz } from './features/marca/MarcaVoz';
import { MarcaEstrategia } from './features/marca/MarcaEstrategia';
import { MarcaMercado } from './features/marca/MarcaMercado';
import { MarcaFicha } from './features/marca/MarcaFicha';
import { CuentaScreen } from './features/cuenta/CuentaScreen';
import { NotFound } from './features/NotFound';
import { PrivacidadScreen, EliminarCuentaScreen } from './features/legal/LegalScreens';
import { startNativeShell } from './lib/native';

const router = createBrowserRouter([
  { path: '/entrar', element: <EntrarScreen /> },
  { path: '/entrar/codigo', element: <CodigoScreen /> },
  { path: '/privacidad', element: <PrivacidadScreen /> },
  { path: '/eliminar-cuenta', element: <EliminarCuentaScreen /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <TabsLayout />,
        children: [
          { index: true, element: <InicioScreen /> },
          { path: 'plan', element: <PlanScreen /> },
          { path: 'plan/mezcla', element: <PlanMezclaScreen /> },
          { path: 'validar', element: <ValidarScreen /> },
          { path: 'resultados', element: <ProximasScreen /> },
          { path: 'resultados/publicadas', element: <PublicadasScreen /> },
          { path: 'marca', element: <MarcaScreen /> },
        ],
      },
      {
        element: <DetailLayout />,
        children: [
          { path: 'validar/:id', element: <ValidarPieza /> },
          { path: 'plan/:id', element: <PlanIdea /> },
          { path: 'resultados/:id', element: <ResultadosPieza /> },
          { path: 'marca/voz', element: <MarcaVoz /> },
          { path: 'marca/estrategia', element: <MarcaEstrategia /> },
          { path: 'marca/mercado', element: <MarcaMercado /> },
          { path: 'marca/ficha', element: <MarcaFicha /> },
          { path: 'cuenta', element: <CuentaScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

// Android back button: go back inside the app; on a tab's main screen, leave the app.
const ROOTS = new Set(['/', '/plan', '/validar', '/resultados', '/marca', '/entrar']);
void startNativeShell(() => {
  if (ROOTS.has(router.state.location.pathname)) return false;
  void router.navigate(-1);
  return true;
});

export const App: React.FC = () => <RouterProvider router={router} />;

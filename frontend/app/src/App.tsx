/**
 * Every screen has its own address, so the phone's back button works and a
 * notification can open the exact screen (e.g. /validar).
 */
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { RequireAuth } from './layouts/RequireAuth';
import { TabsLayout, DetailLayout } from './layouts/TabsLayout';
import { EntrarScreen } from './features/entrar/EntrarScreen';
import { InicioScreen } from './features/inicio/InicioScreen';
import { PlanScreen, PlanMezclaScreen } from './features/plan/PlanScreens';
import { ValidarScreen } from './features/validar/ValidarScreen';
import { ProximasScreen, PublicadasScreen } from './features/resultados/ResultadosScreens';
import { MarcaScreen, MarcaDetail } from './features/marca/MarcaScreens';
import { CuentaScreen } from './features/cuenta/CuentaScreen';
import { NotFound } from './features/NotFound';

const router = createBrowserRouter([
  { path: '/entrar', element: <EntrarScreen /> },
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
          { path: 'marca/voz', element: <MarcaDetail text="Tu arquetipo, cómo suena tu marca y las palabras que usa y evita. Aquí la apruebas." /> },
          { path: 'marca/estrategia', element: <MarcaDetail text="Tus objetivos, sus estrategias y los conceptos de donde nacen tus ideas." /> },
          { path: 'marca/mercado', element: <MarcaDetail text="El tamaño de tu mercado, lo último de tu competencia y el estudio en PDF." /> },
          { path: 'marca/ficha', element: <MarcaDetail text="La información de tu negocio, tal como nos la contaste." /> },
          { path: 'cuenta', element: <CuentaScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export const App: React.FC = () => <RouterProvider router={router} />;

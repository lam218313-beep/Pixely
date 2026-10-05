import React from 'react';
import { Screen, Segmented } from '@/ui';
import { Pronto } from '../Pronto';

const views = [{ to: '/resultados', label: 'Próximas' }, { to: '/resultados/publicadas', label: 'Publicadas' }];

export const ProximasScreen: React.FC = () => (
  <Screen title="Resultados">
    <Segmented label="Vista de resultados" items={views} />
    <Pronto text="Lo que sale hoy y en los próximos días, con su hora y sus redes." />
  </Screen>
);

export const PublicadasScreen: React.FC = () => (
  <Screen title="Resultados">
    <Segmented label="Vista de resultados" items={views} />
    <Pronto text="Cómo le fue a tu mes: alcance, interacciones y la comparación con tu competencia." />
  </Screen>
);

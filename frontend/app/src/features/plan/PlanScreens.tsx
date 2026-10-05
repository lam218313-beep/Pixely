import React from 'react';
import { Screen, Segmented } from '@/ui';
import { Pronto } from '../Pronto';

const views = [{ to: '/plan', label: 'Ideas' }, { to: '/plan/mezcla', label: 'Mezcla' }];

export const PlanScreen: React.FC = () => (
  <Screen title="Plan">
    <Segmented label="Vista del plan" items={views} />
    <Pronto text="Las ideas del mes por semana, con su estado, para aprobarlas una por una o todas de una vez." />
  </Screen>
);

export const PlanMezclaScreen: React.FC = () => (
  <Screen title="Plan">
    <Segmented label="Vista del plan" items={views} />
    <Pronto text="Cómo se reparten las piezas del mes: ruta estratégica, ritmo por semana, pilares y formatos." />
  </Screen>
);

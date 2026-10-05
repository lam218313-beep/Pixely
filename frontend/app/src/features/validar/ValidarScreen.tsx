import React from 'react';
import { Screen } from '@/ui';
import { Pronto } from '../Pronto';

export const ValidarScreen: React.FC = () => (
  <Screen title="Validar">
    <Pronto text="Tus piezas terminadas en un mazo: desliza a la derecha para aprobar y a la izquierda para pedir cambios." />
  </Screen>
);

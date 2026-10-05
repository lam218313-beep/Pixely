import React from 'react';
import { MessageSquare, Target, Search, FileText } from 'lucide-react';
import { Screen, ListRow, DetailScreen } from '@/ui';
import { Pronto } from '../Pronto';

export const MarcaScreen: React.FC = () => (
  <Screen title="Marca">
    <ListRow to="/marca/voz" icon={<MessageSquare size={20} />} title="Voz" detail="Cómo habla tu marca" />
    <ListRow to="/marca/estrategia" icon={<Target size={20} />} title="Estrategia" detail="Tus objetivos y conceptos" />
    <ListRow to="/marca/mercado" icon={<Search size={20} />} title="Mercado" detail="Tu competencia y el estudio en PDF" />
    <ListRow to="/marca/ficha" icon={<FileText size={20} />} title="Ficha" detail="Tu negocio, como nos lo contaste" />
  </Screen>
);

export const MarcaDetail: React.FC<{ text: string }> = ({ text }) => (
  <DetailScreen back="/marca"><Pronto text={text} /></DetailScreen>
);

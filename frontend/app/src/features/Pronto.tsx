import React from 'react';
import { Hammer } from 'lucide-react';
import { EmptyState } from '@/ui';

/** Placeholder while a screen is being built. Says what will live here. */
export const Pronto: React.FC<{ text: string }> = ({ text }) => (
  <EmptyState icon={<Hammer size={26} />} title="En construcción" text={text} />
);

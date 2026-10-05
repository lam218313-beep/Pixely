import React from 'react';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@/ui';

export const NotFound: React.FC = () => (
  <div className="mx-auto max-w-[480px] min-h-full flex items-center justify-center">
    <EmptyState icon={<Compass size={26} />} title="Esta pantalla no existe" text="Puede que el enlace sea antiguo." action={<Button to="/" size="sm">Ir al inicio</Button>} />
  </div>
);

import React from 'react';
import { Outlet } from 'react-router';
import { TabBar } from '@/ui';
import { useTabBadges } from '@/lib/content';

/** The five tabs share this frame: content scrolls, the bar floats on top. */
export const TabsLayout: React.FC = () => (
  <div className="mx-auto max-w-[480px] min-h-full">
    <Outlet />
    <TabBar badges={useTabBadges()} />
  </div>
);

/** Detail screens (an idea, a piece, the voice) cover the bar. */
export const DetailLayout: React.FC = () => (
  <div className="mx-auto max-w-[480px] min-h-full">
    <Outlet />
  </div>
);

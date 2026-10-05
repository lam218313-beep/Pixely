import React from 'react';
import { Outlet } from 'react-router';
import { SideNav, TabBar, Wordmark } from '@/ui';
import { useAuth } from '@/lib/auth';
import { useTabBadges } from '@/lib/content';

/**
 * The frame every signed-in screen shares. Phone: one column with the floating tab bar.
 * Computer (lg, 1024px+): the tabs become a column on the left and the content gets more room.
 */
const Shell: React.FC<{ wide: boolean; tabs: boolean }> = ({ wide, tabs }) => {
  const badges = useTabBadges();
  const { session } = useAuth();
  return (
    <div className="min-h-full lg:pl-[260px]">
      <SideNav badges={badges} account={session?.email ?? ''} wordmark={<Wordmark />} />
      <div className={`mx-auto max-w-[480px] min-h-full lg:px-6 ${wide ? 'lg:max-w-[960px]' : 'lg:max-w-[760px]'}`}>
        <Outlet />
      </div>
      {tabs && <TabBar badges={badges} />}
    </div>
  );
};

/** The five tabs: content scrolls, the bar floats on top (phone). */
export const TabsLayout: React.FC = () => <Shell wide tabs />;

/** Detail screens (an idea, a piece, the voice) cover the bar on the phone; on a computer the side column stays. */
export const DetailLayout: React.FC = () => <Shell wide={false} tabs={false} />;

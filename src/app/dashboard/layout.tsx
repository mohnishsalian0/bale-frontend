'use client';

import { ReactNode } from 'react';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* TopBar - Fixed at top */}
      <TopBar
        warehouseName="SwiftLog Depot"
        onMenuClick={() => console.log('Menu clicked')}
        onWarehouseClick={() => console.log('Warehouse clicked')}
        onProfileClick={() => console.log('Profile clicked')}
      />

      {/* Main Content - With padding for fixed top and bottom bars */}
      <main className="flex-1 pt-[68px] pb-16 overflow-y-auto">
        {children}
      </main>

      {/* BottomNav - Fixed at bottom */}
      <BottomNav />
    </div>
  );
}

'use client';

import { ReactNode, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import WarehouseSelector from '@/components/layout/WarehouseSelector';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState('warehouse-1');

  // TODO: Replace with actual warehouses from database
  const warehouses = [
    {
      id: 'warehouse-1',
      name: 'SwiftLog Depot',
      address: '123 Main St, Downtown'
    },
    {
      id: 'warehouse-2',
      name: 'Central Storage',
      address: '456 Commerce Ave, Midtown'
    },
    {
      id: 'warehouse-3',
      name: 'East Branch',
      address: '789 Industrial Park, Eastside'
    },
  ];

  const selectedWarehouse = warehouses.find((w) => w.id === currentWarehouse);

  const handleWarehouseSelect = (warehouseId: string) => {
    setCurrentWarehouse(warehouseId);
    // TODO: Update warehouse context/state management
    // TODO: Redirect to warehouse-scoped route if needed
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* TopBar - Fixed at top */}
      <TopBar
        warehouseName={selectedWarehouse?.name || 'Select Warehouse'}
        onMenuClick={() => console.log('Menu clicked')}
        onWarehouseClick={() => setIsSelectorOpen(!isSelectorOpen)}
        onProfileClick={() => console.log('Profile clicked')}
        isWarehouseSelectorOpen={isSelectorOpen}
      />

      {/* Warehouse Selector Dropdown */}
      <WarehouseSelector
        warehouses={warehouses}
        currentWarehouse={currentWarehouse}
        onSelect={handleWarehouseSelect}
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
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

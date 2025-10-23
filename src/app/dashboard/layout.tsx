'use client';

import { ReactNode, useState } from 'react';
import TopBar from '@/components/layouts/TopBar';
import BottomNav from '@/components/layouts/BottomNav';
import WarehouseSelector from '@/components/layouts/WarehouseSelector';
import { AppSidebar } from '@/components/layouts/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

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
		<SidebarProvider >
			<AppSidebar />

			<SidebarInset>
				<TopBar
					warehouseName={selectedWarehouse?.name || 'Select Warehouse'}
					onWarehouseClick={() => setIsSelectorOpen(!isSelectorOpen)}
					onProfileClick={() => console.log('Profile clicked')}
					isWarehouseSelectorOpen={isSelectorOpen}
				/>

				<WarehouseSelector
					warehouses={warehouses}
					currentWarehouse={currentWarehouse}
					onSelect={handleWarehouseSelect}
					isOpen={isSelectorOpen}
					onClose={() => setIsSelectorOpen(false)}
				/>

				<div className="flex-1 pb-16 overflow-y-auto">
					{children}
				</div >

				<BottomNav />
			</SidebarInset >
		</SidebarProvider >
	);
}

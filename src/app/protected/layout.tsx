'use client';

import { ReactNode, useState, useEffect } from 'react';
import TopBar from '@/components/layouts/TopBar';
import BottomNav from '@/components/layouts/BottomNav';
import WarehouseSelector from '@/components/layouts/WarehouseSelector';
import { AppSidebar } from '@/components/layouts/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getCurrentUser } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const [isSelectorOpen, setIsSelectorOpen] = useState(false);
	const [currentWarehouse, setCurrentWarehouse] = useState<string>('');
	const [warehouses, setWarehouses] = useState<Tables<'warehouses'>[]>([]);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);

	const supabase = createClient();

	useEffect(() => {
		fetchUserAndWarehouses();
	}, []);

	const fetchUserAndWarehouses = async () => {
		try {
			setLoading(true);

			// Get current user
			const currentUser = await getCurrentUser();
			if (!currentUser) {
				console.error('No user found');
				return;
			}

			// Set admin status
			setIsAdmin(currentUser.role === 'admin');

			// Fetch warehouses
			const { data: warehousesData, error } = await supabase
				.from('warehouses')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;

			setWarehouses(warehousesData || []);

			// Set current warehouse
			if (warehousesData && warehousesData.length > 0) {
				// For staff, use their assigned warehouse; for admin, use first warehouse
				if (currentUser.role === 'staff' && currentUser.warehouse_id) {
					setCurrentWarehouse(currentUser.warehouse_id);
				} else {
					setCurrentWarehouse(warehousesData[0].id);
				}
			}
		} catch (error) {
			console.error('Error fetching user and warehouses:', error);
		} finally {
			setLoading(false);
		}
	};

	const selectedWarehouse = warehouses.find((w) => w.id === currentWarehouse);

	const handleWarehouseSelect = (warehouseId: string) => {
		setCurrentWarehouse(warehouseId);
		// TODO: Update warehouse context/state management
		// TODO: Redirect to warehouse-scoped route if needed
	};

	if (loading) {
		return null; // Or a loading spinner
	}

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

				{isSelectorOpen && (
					<WarehouseSelector
						open={isSelectorOpen}
						currentWarehouse={currentWarehouse}
						onSelect={handleWarehouseSelect}
						onOpenChange={setIsSelectorOpen}
						isAdmin={isAdmin}
					/>
				)}

				<div className="flex-1 pb-16 overflow-y-auto">
					{children}
				</div >

				<BottomNav />
			</SidebarInset >
		</SidebarProvider >
	);
}

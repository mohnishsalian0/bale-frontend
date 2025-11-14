'use client';

import { ReactNode, useState } from 'react';
import TopBar from '@/components/layouts/TopBar';
import BottomNav from '@/components/layouts/BottomNav';
import WarehouseSelector from '@/components/layouts/WarehouseSelector';
import { AppSidebar } from '@/components/layouts/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useSession } from '@/contexts/warehouse-context';

/**
 * App layout for regular warehouse pages
 * Includes TopBar, Sidebar, and BottomNav
 */
export default function AppLayout({ children }: { children: ReactNode }) {
	const { warehouse } = useSession();
	const [isSelectorOpen, setIsSelectorOpen] = useState(false);

	return (
		<SidebarProvider>
			<AppSidebar />

			<SidebarInset>
				<TopBar
					warehouseName={warehouse.name}
					onWarehouseClick={() => setIsSelectorOpen(!isSelectorOpen)}
					onProfileClick={() => console.log('Profile clicked')}
					isWarehouseSelectorOpen={isSelectorOpen}
				/>

				{isSelectorOpen && (
					<WarehouseSelector
						open={isSelectorOpen}
						currentWarehouse={warehouse.id}
						onOpenChange={setIsSelectorOpen}
					/>
				)}

				<div className="flex-1 pb-16 overflow-y-auto">
					{children}
				</div>

				<BottomNav />
			</SidebarInset>
		</SidebarProvider>
	);
}

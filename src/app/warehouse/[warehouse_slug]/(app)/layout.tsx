'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/layouts/topbar';
import BottomNav from '@/components/layouts/bottom-nav';
import WarehouseSelector from '@/components/layouts/warehouse-selector';
import { AppSidebar } from '@/components/layouts/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useSession } from '@/contexts/session-context';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * App layout for regular warehouse pages
 * Includes TopBar, Sidebar, and BottomNav
 */
export default function AppLayout({ children }: { children: ReactNode }) {
	const { warehouse } = useSession();
	const [isSelectorOpen, setIsSelectorOpen] = useState(false);
	const router = useRouter();

	const handleLogout = async () => {
		try {
			const supabase = createClient();
			const { error } = await supabase.auth.signOut();

			if (error) {
				throw error;
			}

			router.push('/auth/login');
		} catch (error: any) {
			console.error('Error logging out:', error);
			toast.error(error.message || 'Failed to log out');
		}
	};

	return (
		<SidebarProvider defaultOpen={false}>
			<AppSidebar />

			<SidebarInset>
				<TopBar
					warehouseName={warehouse.name}
					onWarehouseClick={() => setIsSelectorOpen(!isSelectorOpen)}
					onLogoutClick={handleLogout}
					isWarehouseSelectorOpen={isSelectorOpen}
				/>

				{isSelectorOpen && (
					<WarehouseSelector
						open={isSelectorOpen}
						currentWarehouse={warehouse.id}
						onOpenChange={setIsSelectorOpen}
					/>
				)}

				<div className="relative flex flex-col flex-1 overflow-hidden">
					{children}
				</div>

				<BottomNav />
			</SidebarInset>
		</SidebarProvider>
	);
}

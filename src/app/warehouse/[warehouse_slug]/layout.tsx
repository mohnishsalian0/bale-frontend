'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/layouts/TopBar';
import BottomNav from '@/components/layouts/BottomNav';
import WarehouseSelector from '@/components/layouts/WarehouseSelector';
import { AppSidebar } from '@/components/layouts/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SessionProvider } from '@/contexts/warehouse-context';
import { getCurrentUser } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/client';
import { LoadingState } from '@/components/layouts/loading-state';
import type { Tables } from '@/types/database/supabase';

type Warehouse = Tables<'warehouses'>;
type User = Tables<'users'>;

export default function WarehouseLayout({ children }: { children: ReactNode }) {
	const params = useParams();
	const router = useRouter();
	const warehouseSlug = params.warehouse_slug as string;

	const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [isSelectorOpen, setIsSelectorOpen] = useState(false);
	const [loading, setLoading] = useState(true);

	const supabase = createClient();

	useEffect(() => {
		validateAndLoadWarehouse();
	}, [warehouseSlug]);

	const validateAndLoadWarehouse = async () => {
		try {
			setLoading(true);

			// Get current user
			const currentUser = await getCurrentUser();
			if (!currentUser) {
				router.push('/auth/login');
				return;
			}

			setUser(currentUser);

			// Fetch warehouse by slug
			const { data: warehouseData, error: warehouseError } = await supabase
				.from('warehouses')
				.select('*')
				.eq('slug', warehouseSlug)
				.single();

			if (warehouseError || !warehouseData) {
				console.error('Warehouse not found:', warehouseError);
				router.push('/warehouse');
				return;
			}

			// Validate user has access to this warehouse by checking if they can read it via RLS
			// RLS will filter warehouses based on user's all_warehouses_access flag or user_warehouses
			const { data: accessCheck, error: accessError } = await supabase
				.from('warehouses')
				.select('id')
				.eq('id', warehouseData.id)
				.single();

			if (accessError || !accessCheck) {
				console.error('Access denied to warehouse:', accessError);
				router.push('/warehouse');
				return;
			}

			// Check if user's selected warehouse matches the URL
			// If not, update user profile to match URL (user manually navigated/bookmarked)
			if (currentUser.warehouse_id !== warehouseData.id) {
				await supabase
					.from('users')
					.update({ warehouse_id: warehouseData.id })
					.eq('id', currentUser.id);
			}

			// Set warehouse
			setWarehouse(warehouseData);
		} catch (error) {
			console.error('Error validating warehouse:', error);
			router.push('/warehouse');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <LoadingState />;
	}

	if (!warehouse || !user) {
		return null; // Redirecting
	}

	return (
		<SessionProvider
			warehouse={warehouse}
			user={user}
		>
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
		</SessionProvider>
	);
}

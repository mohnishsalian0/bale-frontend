'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import { LoadingState } from '@/components/layouts/loading-state';

type Warehouse = Tables<'warehouses'>;

export default function WarehouseSelectionPage() {
	const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		fetchWarehousesAndUser();
	}, []);

	const fetchWarehousesAndUser = async () => {
		try {
			setLoading(true);

			// Get current user
			const currentUser = await getCurrentUser();
			if (!currentUser) {
				router.push('/auth/login');
				return;
			}

			// Fetch warehouses based on role
			if (currentUser.role === 'admin') {
				// Admin: fetch all company warehouses
				const { data, error } = await supabase
					.from('warehouses')
					.select('*')
					.order('created_at');

				if (error) throw error;
				setWarehouses(data || []);
			} else {
				// Staff: fetch only assigned warehouses
				const { data, error } = await supabase
					.from('user_warehouses')
					.select(`
						warehouse_id,
						warehouses (*)
					`)
					.eq('user_id', currentUser.id);

				if (error) throw error;

				// Extract warehouses from the join result
				const userWarehouses = (data || [])
					.map((uw: any) => uw.warehouses)
					.filter(Boolean) as Warehouse[];

				setWarehouses(userWarehouses);
			}
		} catch (error) {
			console.error('Error fetching warehouses:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleWarehouseSelect = async (warehouse: Warehouse) => {
		try {
			// Get current user
			const currentUser = await getCurrentUser();
			if (!currentUser) {
				console.error('No user found');
				return;
			}

			// Update user's selected warehouse
			const { error } = await supabase
				.from('users')
				.update({ warehouse_id: warehouse.id })
				.eq('id', currentUser.id);

			if (error) {
				console.error('Error updating warehouse:', error);
				return;
			}

			// Redirect to warehouse dashboard
			router.push(`/warehouse/${warehouse.slug}/dashboard`);
		} catch (error) {
			console.error('Error selecting warehouse:', error);
		}
	};

	if (loading) {
		return <LoadingState />;
	}

	return (
		<div className="min-h-dvh flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Header with illustration */}
				<div className="flex flex-row items-end justify-between mb-6">
					<h1 className="text-3xl font-semibold text-gray-900">Select Warehouse</h1>
					<div className="relative size-25">
						<Image
							src="/illustrations/warehouse.png"
							alt="Warehouse"
							fill
							sizes="100px"
							className="object-contain"
						/>
					</div>
				</div>

				{/* Warehouse Cards */}
				{warehouses.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-gray-500 text-lg mb-2">No warehouses assigned</p>
						<p className="text-gray-400 text-sm">Contact your admin to assign warehouses</p>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{warehouses.map((warehouse) => {
							// Build address string
							const addressParts = [
								warehouse.address_line1,
								warehouse.address_line2,
								warehouse.city && warehouse.state ? `${warehouse.city}, ${warehouse.state}` : warehouse.city || warehouse.state,
								warehouse.pin_code,
							].filter(Boolean);
							const addressString = addressParts.join(', ') || 'No address';

							return (
								<div
									key={warehouse.id}
									onClick={() => handleWarehouseSelect(warehouse)}
									className="flex gap-3 p-4 rounded-lg cursor-pointer transition-all bg-background border border-border shadow-gray-md hover:border-primary-500 hover:shadow-primary-md"
								>
									{/* Icon */}
									<div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center bg-gray-100">
										{warehouse.image_url ? (
											<Image
												src={warehouse.image_url}
												alt={warehouse.name}
												width={56}
												height={56}
												className="rounded-lg object-cover"
											/>
										) : (
											<IconBuildingWarehouse className="size-6 text-gray-500" />
										)}
									</div>

									{/* Content */}
									<div className="flex-1 min-w-0 flex flex-col gap-1">
										<div className="text-base font-medium text-gray-900 truncate" title={warehouse.name}>
											{warehouse.name}
										</div>
										<div className="text-sm text-gray-500 truncate" title={addressString}>
											{addressString}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

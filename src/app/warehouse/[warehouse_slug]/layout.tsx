'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SessionProvider } from '@/contexts/session-context';
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
	const [permissions, setPermissions] = useState<string[]>([]);
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

			// Load user permissions from database
			const { data: roleData } = await supabase
				.from('roles')
				.select('id')
				.eq('name', currentUser.role)
				.single();

			if (roleData) {
				const { data: permData } = await supabase
					.from('role_permissions')
					.select('permissions!inner(permission_path)')
					.eq('role_id', roleData.id);

				const userPermissions = (permData || [])
					.map((rp: any) => rp.permissions?.permission_path)
					.filter(Boolean);

				setPermissions(userPermissions);
			}
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
			permissions={permissions}
		>
			{children}
		</SessionProvider>
	);
}

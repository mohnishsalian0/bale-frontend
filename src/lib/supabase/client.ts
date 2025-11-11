import { createBrowserClient } from "@supabase/ssr";
import { Session } from "@supabase/supabase-js";
import { UserRole } from '@/types/database/enums';
import type { Tables } from '@/types/database/supabase';

type User = Tables<'users'>;

/**
 * Creates a Supabase client for use in Client Components
 */
export function createClient() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);
}

/**
 * Get the current authenticated user with their profile (client-side)
 * Use inside React components or other client code.
 */
export async function getCurrentUser(): Promise<User | null> {
	const supabase = createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);

	// 1. Get authenticated user from Supabase Auth
	const {
		data: { user: authUser },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !authUser) {
		console.warn('Auth error or no user:', authError?.message);
		return null;
	}

	// 2. Fetch user profile from `users` table
	const { data: user, error: userError } = await supabase
		.from('users')
		.select('*')
		.eq('auth_user_id', authUser.id)
		.single();

	if (userError) {
		console.error('Error fetching user profile:', userError.message);
		return null;
	}

	return user;
}

export async function getSession(): Promise<Session | null> {
	const supabase = createClient();

	const { data, error } = await supabase.auth.getSession();
	if (error) {
		console.error('Error fetching session:', error.message);
		return null;
	}

	return data.session;
}


export async function isAdmin(): Promise<boolean> {
	const user = await getCurrentUser();
	return user?.role === 'admin';
}

export async function isStaff(): Promise<boolean> {
	const user = await getCurrentUser();
	return user?.role === 'staff';
}

export async function getUserRole(): Promise<UserRole | null> {
	const user = await getCurrentUser();
	return user?.role as UserRole | null;
}

export async function getCompanyId(): Promise<string | null> {
	const user = await getCurrentUser();
	return user?.company_id || null;
}

export async function getWarehouseId(): Promise<string | null> {
	const user = await getCurrentUser();
	return user?.warehouse_id || null;
}

/**
 * Get all warehouse IDs assigned to the current user
 * Returns all warehouses for admin, assigned warehouses for staff
 */
export async function getUserWarehouseIds(): Promise<string[]> {
	const user = await getCurrentUser();
	if (!user) return [];

	const supabase = createClient();

	// Admin has access to all warehouses
	if (user.role === 'admin') {
		const { data, error } = await supabase
			.from('warehouses')
			.select('id')
			.eq('company_id', user.company_id);

		if (error) {
			console.error('Error fetching warehouses:', error.message);
			return [];
		}

		return (data || []).map(w => w.id);
	}

	// Staff has access to assigned warehouses only
	const { data, error } = await supabase
		.from('user_warehouses')
		.select('warehouse_id')
		.eq('user_id', user.id);

	if (error) {
		console.error('Error fetching user warehouses:', error.message);
		return [];
	}

	return (data || []).map(uw => uw.warehouse_id);
}

export async function requireAdmin() {
	const admin = await isAdmin();
	if (!admin) {
		throw new Error('Admin access required');
	}
}

export async function requireAuth() {
	const user = await getCurrentUser();
	if (!user) {
		throw new Error('Authentication required');
	}
	return user;
}

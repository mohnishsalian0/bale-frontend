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

	console.log(user);

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

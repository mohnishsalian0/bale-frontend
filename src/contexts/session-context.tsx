'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Tables } from '@/types/database/supabase';
import { hasPermission as checkPermission } from '@/lib/utils/permissions';

type User = Tables<'users'>;
type Warehouse = Tables<'warehouses'>;

interface SessionContextType {
	warehouse: Warehouse;
	user: User;
	permissions: string[];
	hasPermission: (permission: string) => boolean;
	hasAnyPermission: (...permissions: string[]) => boolean;
	hasAllPermissions: (...permissions: string[]) => boolean;
}

const SessionContext = createContext<SessionContextType | null>(null);

interface SessionProviderProps {
	children: ReactNode;
	warehouse: Warehouse;
	user: User;
	permissions: string[];
}

export function SessionProvider({
	children,
	warehouse,
	user,
	permissions,
}: SessionProviderProps) {
	const hasPermission = (permission: string): boolean => {
		return checkPermission(permission, permissions);
	};

	const hasAnyPermission = (...perms: string[]): boolean => {
		return perms.some(perm => hasPermission(perm));
	};

	const hasAllPermissions = (...perms: string[]): boolean => {
		return perms.every(perm => hasPermission(perm));
	};

	return (
		<SessionContext.Provider
			value={{
				warehouse,
				user,
				permissions,
				hasPermission,
				hasAnyPermission,
				hasAllPermissions,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}

/**
 * Hook to access current session context (warehouse + user info + permissions)
 *
 * @throws Error if used outside of SessionProvider
 * @returns Current session information including warehouse, user data, and permission checks
 */
export function useSession(): SessionContextType {
	const context = useContext(SessionContext);

	if (!context) {
		throw new Error('useSession must be used within a SessionProvider');
	}

	return context;
}

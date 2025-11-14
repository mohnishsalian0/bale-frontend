'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Tables } from '@/types/database/supabase';

type User = Tables<'users'>;
type Warehouse = Tables<'warehouses'>;

interface SessionContextType {
	warehouse: Warehouse;
	user: User;
	permissions: Set<string>;
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

/**
 * Wildcard matcher using backtracking algorithm
 * Matches required permission against granted permission pattern
 * Supports greedy wildcards: 'inventory.*' or 'inventory.*.view'
 */
function matchesWildcard(requiredPermission: string, grantedPattern: string): boolean {
	const requiredParts = requiredPermission.split('.');
	const grantedParts = grantedPattern.split('.');

	let reqIdx = 0;
	let grantIdx = 0;
	let lastStarGrant = -1;
	let lastStarReq = -1;

	while (reqIdx < requiredParts.length) {
		if (grantIdx < grantedParts.length && grantedParts[grantIdx] === '*') {
			// Record wildcard positions
			lastStarGrant = grantIdx;
			lastStarReq = reqIdx;
			grantIdx++; // move past '*'
		} else if (
			grantIdx < grantedParts.length &&
			grantedParts[grantIdx] === requiredParts[reqIdx]
		) {
			// Direct match
			grantIdx++;
			reqIdx++;
		} else if (lastStarGrant >= 0) {
			// Backtrack: extend '*' to include this segment
			lastStarReq++;
			reqIdx = lastStarReq;
			grantIdx = lastStarGrant + 1;
		} else {
			// No match possible
			return false;
		}
	}

	// After consuming required parts, remaining granted parts must be '*' only
	while (grantIdx < grantedParts.length && grantedParts[grantIdx] === '*') {
		grantIdx++;
	}

	return grantIdx >= grantedParts.length;
}

export function SessionProvider({
	children,
	warehouse,
	user,
	permissions: permissionsArray,
}: SessionProviderProps) {
	const permissions = new Set(permissionsArray);

	const hasPermission = (permission: string): boolean => {
		// Check for exact match first (most common, fastest)
		if (permissions.has(permission)) {
			return true;
		}

		// Check for wildcard matches
		for (const userPerm of permissions) {
			if (userPerm.includes('*') && matchesWildcard(permission, userPerm)) {
				return true;
			}
		}

		return false;
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

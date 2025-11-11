'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Tables } from '@/types/database/supabase';

type User = Tables<'users'>;
type Warehouse = Tables<'warehouses'>;

interface SessionContextType {
	warehouse: Warehouse;
	user: User;
}

const SessionContext = createContext<SessionContextType | null>(null);

interface SessionProviderProps {
	children: ReactNode;
	warehouse: Warehouse;
	user: User;
}

export function SessionProvider({
	children,
	warehouse,
	user,
}: SessionProviderProps) {
	return (
		<SessionContext.Provider
			value={{
				warehouse,
				user,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}

/**
 * Hook to access current session context (warehouse + user info)
 *
 * @throws Error if used outside of SessionProvider
 * @returns Current session information including warehouse and user data
 */
export function useSession(): SessionContextType {
	const context = useContext(SessionContext);

	if (!context) {
		throw new Error('useSession must be used within a SessionProvider');
	}

	return context;
}

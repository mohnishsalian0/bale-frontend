'use client';

import { createContext, useContext, ReactNode } from 'react';

interface WarehouseContextType {
	warehouseId: string;
	warehouseSlug: string;
	warehouseName: string;
}

const WarehouseContext = createContext<WarehouseContextType | null>(null);

interface WarehouseProviderProps {
	children: ReactNode;
	warehouseId: string;
	warehouseSlug: string;
	warehouseName: string;
}

export function WarehouseProvider({
	children,
	warehouseId,
	warehouseSlug,
	warehouseName,
}: WarehouseProviderProps) {
	return (
		<WarehouseContext.Provider
			value={{
				warehouseId,
				warehouseSlug,
				warehouseName,
			}}
		>
			{children}
		</WarehouseContext.Provider>
	);
}

/**
 * Hook to access current warehouse context
 *
 * @throws Error if used outside of WarehouseProvider
 * @returns Current warehouse information
 */
export function useWarehouse(): WarehouseContextType {
	const context = useContext(WarehouseContext);

	if (!context) {
		throw new Error('useWarehouse must be used within a WarehouseProvider');
	}

	return context;
}

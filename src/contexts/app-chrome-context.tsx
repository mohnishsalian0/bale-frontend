'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AppChromeContextType {
	showChrome: boolean;
	hideChrome: () => void;
	showChromeUI: () => void;
}

const AppChromeContext = createContext<AppChromeContextType | null>(null);

interface AppChromeProviderProps {
	children: ReactNode;
}

export function AppChromeProvider({ children }: AppChromeProviderProps) {
	const [showChrome, setShowChrome] = useState(true);

	const hideChrome = () => {
		setShowChrome(false);
	};

	const showChromeUI = () => {
		setShowChrome(true);
	};

	return (
		<AppChromeContext.Provider
			value={{
				showChrome,
				hideChrome,
				showChromeUI,
			}}
		>
			{children}
		</AppChromeContext.Provider>
	);
}

/**
 * Hook to control app chrome visibility (TopBar, BottomNav, Sidebar)
 *
 * @throws Error if used outside of AppChromeProvider
 * @returns Chrome visibility state and control methods
 */
export function useAppChrome(): AppChromeContextType {
	const context = useContext(AppChromeContext);

	if (!context) {
		throw new Error('useAppChrome must be used within an AppChromeProvider');
	}

	return context;
}

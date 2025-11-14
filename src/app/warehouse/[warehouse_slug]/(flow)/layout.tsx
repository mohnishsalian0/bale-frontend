import { ReactNode } from 'react';

/**
 * Flow layout for focused multi-step processes
 * Minimal wrapper without TopBar, Sidebar, or BottomNav
 * Used for: creation flows, selection flows, wizards, etc.
 */
export default function FlowLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

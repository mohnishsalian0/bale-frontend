import { ReactNode } from 'react';

/**
 * Flow layout for focused multi-step processes
 * Minimal wrapper without TopBar, Sidebar, or BottomNav
 * Used for: creation flows, selection flows, wizards, etc.
 */
export default function FlowLayout({ children }: { children: ReactNode }) {
	return (
		<div className="container max-w-3xl h-dvh mx-auto border-x border-border">
			{children}
		</div>
	);
}

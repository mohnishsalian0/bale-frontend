import { ReactNode } from "react";

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Public Layout
 * Minimal wrapper for public routes (auth, invites, catalog)
 * No authentication or session management required
 * Ensures proper scrolling and responsive behavior
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return <div className="min-h-screen w-full overflow-x-hidden">{children}</div>;
}

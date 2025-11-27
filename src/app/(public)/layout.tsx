import { ReactNode } from "react";

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Public Layout
 * Minimal wrapper for public routes (auth, invites, catalog)
 * No authentication or session management required
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return <>{children}</>;
}

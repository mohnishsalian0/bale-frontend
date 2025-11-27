"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "./client";
import { ReactNode } from "react";

/**
 * Query Provider Component
 *
 * Wraps the app with TanStack Query's QueryClientProvider.
 * Creates a new QueryClient instance per request on the server,
 * and reuses the same instance on the client.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only show in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

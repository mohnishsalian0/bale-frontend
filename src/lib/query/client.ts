import { QueryClient } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "./config";
import { toast } from "sonner";

/**
 * Create a new QueryClient instance with default configuration
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...DEFAULT_QUERY_OPTIONS,
        // Avoid showing error toasts for every failed query
        // Individual queries can override this behavior
        throwOnError: false,
      },
      mutations: {
        // Global mutation error handler
        onError: (error) => {
          console.error("Mutation error:", error);

          const errorMessage =
            error instanceof Error
              ? error.message
              : "An unexpected error occurred";

          toast.error(errorMessage);
        },
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

/**
 * Global QueryClient instance for client-side usage
 * Note: For Next.js App Router, we create a new instance per request on the server
 */
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return makeQueryClient();
  } else {
    // Browser: reuse the same QueryClient instance
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

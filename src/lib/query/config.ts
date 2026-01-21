/**
 * TanStack Query Cache Configuration
 *
 * Centralized staleTime configuration for all queries.
 * staleTime = how long data is considered "fresh" before refetching
 * gcTime = how long unused data stays in cache before garbage collection
 */

export const STALE_TIME = {
  // Master Data - Changes infrequently
  PRODUCTS: 5 * 60 * 1000, // 5 minutes
  PARTNERS: 5 * 60 * 1000, // 5 minutes
  WAREHOUSES: 10 * 60 * 1000, // 10 minutes
  LEDGERS: 5 * 60 * 1000, // 5 minutes (ledgers are master data)
  PARENT_GROUPS: 30 * 60 * 1000, // 30 minutes (static system data, rarely changes)

  // Transactional Data - Changes more frequently
  STOCK_UNITS: 2 * 60 * 1000, // 2 minutes
  SALES_ORDERS: 3 * 60 * 1000, // 3 minutes
  PURCHASE_ORDERS: 3 * 60 * 1000, // 3 minutes
  STOCK_FLOW: 3 * 60 * 1000, // 3 minutes (goods inward/outward)
  INVOICES: 3 * 60 * 1000, // 3 minutes
  PAYMENTS: 3 * 60 * 1000, // 3 minutes
  ADJUSTMENT_NOTES: 3 * 60 * 1000, // 3 minutes

  // Real-time Data - Needs frequent updates
  DASHBOARD: 30 * 1000, // 30 seconds

  // Aggregate Data - Calculated summaries that change less frequently
  AGGREGATES: 5 * 60 * 1000, // 5 minutes

  // Public Data
  CATALOG: 5 * 60 * 1000, // 5 minutes
  QR_BATCHES: 5 * 60 * 1000, // 5 minutes (historical data)

  // Session Data - Rarely changes
  COMPANY: 15 * 60 * 1000, // 15 minutes
  USER: 15 * 60 * 1000, // 15 minutes
  INVITES: 5 * 60 * 1000, // 5 minutes
} as const;

export const GC_TIME = {
  // How long to keep unused data in cache
  DEFAULT: 10 * 60 * 1000, // 10 minutes
  MASTER_DATA: 30 * 60 * 1000, // 30 minutes (products, partners, warehouses)
  TRANSACTIONAL: 5 * 60 * 1000, // 5 minutes (stock, orders)
  AGGREGATES: 10 * 60 * 1000, // 10 minutes (aggregate summaries)
  REALTIME: 2 * 60 * 1000, // 2 minutes (dashboard)
} as const;

/**
 * Default query options applied to all queries
 */
export const DEFAULT_QUERY_OPTIONS = {
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 1, // Retry failed queries once
  staleTime: 0, // Default to always stale (individual queries override this)
  gcTime: GC_TIME.DEFAULT,
};

/**
 * Helper to get query options for a specific entity type
 */
export function getQueryOptions(
  staleTime: number,
  gcTime: number = GC_TIME.DEFAULT,
) {
  return {
    ...DEFAULT_QUERY_OPTIONS,
    staleTime,
    gcTime,
  };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getInvoiceAggregates,
  getSalesOrderAggregates,
  getPurchaseOrderAggregates,
  getInventoryAggregates,
  getProductAggregates,
} from "@/lib/queries/aggregates";
import type { InvoiceAggregateFilters } from "@/types/aggregates.types";

// =====================================================
// INVOICE AGGREGATES
// =====================================================

export function useInvoiceAggregates({
  filters,
  enabled = true,
}: {
  filters: InvoiceAggregateFilters;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.dashboard.invoices(filters),
    queryFn: () => getInvoiceAggregates(filters),
    ...getQueryOptions(STALE_TIME.AGGREGATES, GC_TIME.AGGREGATES),
    enabled: enabled && !!filters.warehouse_id && !!filters.invoice_type,
  });
}

// =====================================================
// SALES ORDER AGGREGATES
// =====================================================

export function useSalesOrderAggregates({
  warehouseId,
  enabled = true,
}: {
  warehouseId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.dashboard.salesOrderStats(warehouseId),
    queryFn: () =>
      getSalesOrderAggregates({
        order_type: "sales",
        warehouse_id: warehouseId,
      }),
    ...getQueryOptions(STALE_TIME.AGGREGATES, GC_TIME.AGGREGATES),
    enabled: enabled && !!warehouseId,
  });
}

// =====================================================
// PURCHASE ORDER AGGREGATES
// =====================================================

export function usePurchaseOrderAggregates({
  warehouseId,
  enabled = true,
}: {
  warehouseId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.dashboard.purchaseOrderStats(warehouseId),
    queryFn: () =>
      getPurchaseOrderAggregates({
        order_type: "purchase",
        warehouse_id: warehouseId,
      }),
    ...getQueryOptions(STALE_TIME.AGGREGATES, GC_TIME.AGGREGATES),
    enabled: enabled && !!warehouseId,
  });
}

// =====================================================
// INVENTORY AGGREGATES
// =====================================================

export function useInventoryAggregates({
  warehouseId,
  enabled = true,
}: {
  warehouseId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.dashboard.inventoryStats(warehouseId),
    queryFn: () =>
      getInventoryAggregates({
        warehouse_id: warehouseId,
      }),
    ...getQueryOptions(STALE_TIME.AGGREGATES, GC_TIME.AGGREGATES),
    enabled: enabled && !!warehouseId,
  });
}

// =====================================================
// PRODUCT AGGREGATES
// =====================================================

export function useProductAggregates({
  enabled = true,
}: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.products.aggregates(),
    queryFn: () => getProductAggregates(),
    ...getQueryOptions(STALE_TIME.AGGREGATES, GC_TIME.AGGREGATES),
    enabled,
  });
}

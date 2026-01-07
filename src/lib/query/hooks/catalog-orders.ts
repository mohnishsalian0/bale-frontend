"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  createCatalogOrder,
  getSalesOrderById,
  type CreateCatalogOrderParams,
} from "@/lib/queries/catalog-orders";

/**
 * Fetch sales order by ID (for confirmation page)
 * Anonymous access for guest customers to view their order
 *
 * Used in: order confirmation page after checkout
 */
export function usePublicOrder(
  companyId: string | null,
  orderId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.catalog.order(orderId || ""),
    queryFn: () => getSalesOrderById(companyId!, orderId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!companyId && !!orderId,
  });
}

/**
 * Create sales order from catalog checkout
 * Handles guest customer creation and order submission
 *
 * Used in: catalog checkout form submission
 */
export function useCreateCatalogOrder() {
  return useMutation({
    mutationFn: (params: CreateCatalogOrderParams) =>
      createCatalogOrder(params),
    // No cache invalidation needed (anonymous users don't see order lists)
  });
}

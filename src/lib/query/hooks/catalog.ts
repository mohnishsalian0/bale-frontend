"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getCompanyBySlug,
  getCatalogConfiguration,
  getPublicProducts,
} from "@/lib/queries/catalog";
import {
  createCatalogOrder,
  getSalesOrderById,
} from "@/lib/queries/catalog-orders";

/**
 * Fetch company by slug (for public catalog)
 */
export function useCatalogCompany(slug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.company(slug),
    queryFn: () => getCompanyBySlug(slug),
    ...getQueryOptions(STALE_TIME.CATALOG, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch catalog configuration
 */
export function useCatalogConfiguration(companyId: string) {
  return useQuery({
    queryKey: queryKeys.catalog.config(companyId),
    queryFn: () => getCatalogConfiguration(companyId),
    ...getQueryOptions(STALE_TIME.CATALOG, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch public products for catalog
 */
export function usePublicProducts(companySlug: string) {
  return useQuery({
    queryKey: queryKeys.catalog.products(companySlug),
    queryFn: () => getPublicProducts(companySlug),
    ...getQueryOptions(STALE_TIME.CATALOG, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch catalog order by ID
 */
export function useCatalogOrder(companyId: string, orderId: string | null) {
  return useQuery({
    queryKey: queryKeys.catalog.order(orderId || ""),
    queryFn: () => getSalesOrderById(companyId, orderId!),
    ...getQueryOptions(STALE_TIME.CATALOG, GC_TIME.DEFAULT),
    enabled: !!orderId,
  });
}

/**
 * Catalog order mutations (create order)
 */
export function useCatalogOrderMutations() {
  const queryClient = useQueryClient();

  const createOrder = useMutation({
    mutationFn: createCatalogOrder,
    onSuccess: () => {
      // Invalidate relevant queries after order creation
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });

  return {
    createOrder,
  };
}

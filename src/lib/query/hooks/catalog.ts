"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getCompanyBySlug,
  getCatalogConfiguration,
  getPublicProducts,
} from "@/lib/queries/catalog";

/**
 * Fetch company by slug (public access)
 * Used in: catalog landing page, public store front
 */
export function usePublicCompany(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.catalog.company(slug || ""),
    queryFn: () => getCompanyBySlug(slug!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!slug,
  });
}

/**
 * Fetch catalog configuration for a company
 * Used in: catalog pages to check if accepting orders, get branding settings
 */
export function usePublicCatalogConfig(companyId: string | null) {
  return useQuery({
    queryKey: queryKeys.catalog.config(companyId || ""),
    queryFn: () => getCatalogConfiguration(companyId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!companyId,
  });
}

/**
 * Fetch public products for catalog
 * Includes stock status and optional warehouse filtering
 *
 * Examples:
 * - All products across warehouses: usePublicProducts(companyId)
 * - Products for specific warehouse: usePublicProducts(companyId, warehouseId)
 *
 * Used in: catalog product list, shopping cart, checkout
 */
export function usePublicProducts(
  companyId: string | null,
  warehouseId?: string,
) {
  return useQuery({
    queryKey: queryKeys.catalog.products(companyId || ""),
    queryFn: () => getPublicProducts(companyId!, warehouseId),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!companyId,
  });
}

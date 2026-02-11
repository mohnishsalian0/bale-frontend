"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import { getProductActivity } from "@/lib/queries/product-activity";
import type { ProductActivityTypeFilter } from "@/types/products.types";

/**
 * Fetch paginated activity events for a product in a warehouse.
 * Calls the get_product_activity RPC (migration 0071).
 */
export function useProductActivity(
  productId: string | null | undefined,
  warehouseId: string,
  typeFilter: ProductActivityTypeFilter = "all",
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: queryKeys.productActivity.byProduct(
      productId ?? "",
      warehouseId,
      typeFilter,
      page,
    ),
    queryFn: () =>
      getProductActivity(productId!, warehouseId, typeFilter, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: !!productId && !!warehouseId,
  });
}

import { createClient } from "@/lib/supabase/browser";
import type {
  ProductActivityEvent,
  ProductActivityTypeFilter,
} from "@/types/products.types";

/**
 * Fetch paginated activity events for a product in a warehouse.
 * Calls the get_product_activity RPC (migration 0071).
 *
 * Event types: inward | outward | transfer_out | transfer_in | convert_in | convert_out
 */
export async function getProductActivity(
  productId: string,
  warehouseId: string,
  typeFilter: ProductActivityTypeFilter = "all",
  page: number = 1,
  pageSize: number = 20,
): Promise<{ data: ProductActivityEvent[]; totalCount: number }> {
  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("get_product_activity", {
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_type_filter: typeFilter,
    p_limit: pageSize,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data as ProductActivityEvent[]) || [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return { data: rows, totalCount };
}

import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductListView } from "@/types/products.types";
import { transformProductListView } from "./products";

export interface PendingQRProduct extends ProductListView {
  pending_qr_count: number;
}

/**
 * Query builder for fetching products with pending QR codes
 */
export const buildPendingQRProductsQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
) => {
  return supabase
    .from("product_inventory_aggregates")
    .select(
      `
      pending_qr_units,
      product:products(
        id,
        sequence_number,
        product_code,
        name,
        show_on_catalog,
        is_active,
        stock_type,
        measuring_unit,
        cost_price_per_unit,
        selling_price_per_unit,
        product_images,
        min_stock_alert,
        min_stock_threshold,
        tax_type,
        gst_rate,
        attributes:product_attributes!inner(id, name, group_name, color_hex)
      )
    `,
    )
    .eq("warehouse_id", warehouseId)
    .gt("pending_qr_units", 0)
    .order("pending_qr_units", { ascending: false })
    .limit(5);
};

/**
 * Fetch products with pending QR code generation
 * Uses product_inventory_aggregates for efficient querying
 * Limited to 5 products
 */
export async function getPendingQRProducts(
  warehouseId: string,
): Promise<PendingQRProduct[]> {
  const supabase = createClient();
  const { data: aggregates, error: aggError } =
    await buildPendingQRProductsQuery(supabase, warehouseId);

  if (aggError) {
    console.error("Error fetching pending QR products:", aggError);
    throw aggError;
  }

  if (!aggregates || aggregates.length === 0) {
    return [];
  }

  // Transform to PendingQRProduct format
  const pendingQRProducts: PendingQRProduct[] = (aggregates || []).map(
    (agg) => ({
      ...transformProductListView(agg.product),
      pending_qr_count: agg.pending_qr_units || 0,
    }),
  );

  return pendingQRProducts;
}

import { createClient } from "@/lib/supabase/browser";
import type { ProductInventory, ProductListView } from "@/types/products.types";
import {
  PRODUCT_LIST_VIEW_SELECT,
  ProductListViewRaw,
  transformProductListView,
} from "./products";

export interface PendingQRProduct extends ProductListView {
  pending_qr_count: number;
}

type PendingQRListViewRaw = Pick<ProductInventory, "pending_qr_units"> & {
  product: ProductListViewRaw;
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

  // Query aggregates table for products with pending QR codes
  const { data: aggregates, error: aggError } = await supabase
    .from("product_inventory_aggregates")
    .select(
      `
				pending_qr_units,
				product:products(
					${PRODUCT_LIST_VIEW_SELECT}
				)
		`,
    )
    .eq("warehouse_id", warehouseId)
    .gt("pending_qr_units", 0)
    .order("pending_qr_units", { ascending: false })
    .limit(5);

  if (aggError) {
    console.error("Error fetching pending QR products:", aggError);
    throw aggError;
  }

  if (!aggregates || aggregates.length === 0) {
    return [];
  }

  // Transform to PendingQRProduct format
  const pendingQRProducts: PendingQRProduct[] = (
    (aggregates as unknown as PendingQRListViewRaw[]) || []
  ).map((agg) => ({
    ...transformProductListView(agg.product),
    pending_qr_count: agg.pending_qr_units || 0,
  }));

  return pendingQRProducts;
}

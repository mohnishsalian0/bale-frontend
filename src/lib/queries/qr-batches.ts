import { createClient } from "@/lib/supabase/browser";
import type { Database, Tables } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  QRBatchListView,
  QRBatchDetailView,
  QRBatchFilters,
  CreateQRBatchParams,
  QRBatchProductSummary,
  QRBatchListViewRaw,
  QRBatchDetailViewRaw,
} from "@/types/qr-batches.types";
import {
  transformProductListView,
  transformProductDetailView,
} from "@/lib/queries/products";

// Local type aliases
type QRBatchItem = Tables<"qr_batch_items">;

// Re-export types for convenience
export type { QRBatchFilters, CreateQRBatchParams };

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching QR batches with product summaries
 */
export const buildQRBatchesQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: QRBatchFilters,
) => {
  let query = supabase
    .from("qr_batches")
    .select(
      `
      id,
      batch_name,
      image_url,
      page_size,
      created_at,
      qr_batch_items!inner (
        stock_unit:stock_units!inner (
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
        )
      )
    `,
    )
    .eq("warehouse_id", warehouseId)
    .order("created_at", { ascending: false });

  // Apply product filter at database level
  if (filters?.product_id) {
    query = query.eq(
      "qr_batch_items.stock_unit.product_id",
      filters.product_id,
    );
  }

  return query;
};

/**
 * Query builder for fetching a single QR batch with full details
 */
export const buildQRBatchByIdQuery = (
  supabase: SupabaseClient<Database>,
  batchId: string,
) => {
  return supabase
    .from("qr_batches")
    .select(
      `
      *,
      qr_batch_items (
        *,
        stock_unit:stock_units (
          *,
          product:products(
            *,
            attributes:product_attributes!inner(id, name, group_name, color_hex)
          )
        )
      )
    `,
    )
    .eq("id", batchId)
    .single();
};

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform raw QR batch list data to QRBatchListView
 */
function transformQRBatchListView(raw: QRBatchListViewRaw): QRBatchListView {
  const { qr_batch_items: rawItems, ...batch } = raw;

  // Group by product to get distinct products and their counts
  const productMap = new Map<string, QRBatchProductSummary>();

  rawItems.forEach((item) => {
    const rawProduct = item.stock_unit.product;
    const productId = rawProduct.id;

    if (productMap.has(productId)) {
      productMap.get(productId)!.unit_count++;
    } else {
      productMap.set(productId, {
        product: transformProductListView(rawProduct),
        unit_count: 1,
      });
    }
  });

  return {
    ...batch,
    item_count: rawItems.length,
    distinct_products: Array.from(productMap.values()),
  };
}

/**
 * Transform raw QR batch detail data to QRBatchDetailView
 */
function transformQRBatchDetailView(
  raw: QRBatchDetailViewRaw,
): QRBatchDetailView {
  const { qr_batch_items: rawItems, ...batch } = raw;

  return {
    ...batch,
    qr_batch_items: rawItems.map((item) => ({
      ...item,
      stock_unit: item.stock_unit
        ? {
            ...item.stock_unit,
            product: item.stock_unit.product
              ? transformProductDetailView(item.stock_unit.product)
              : null,
          }
        : null,
    })),
  };
}

/**
 * Fetch all QR batches for a warehouse
 */
export async function getQRBatches(
  warehouseId: string,
  filters?: QRBatchFilters,
): Promise<QRBatchListView[]> {
  const supabase = createClient();
  const { data, error } = await buildQRBatchesQuery(
    supabase,
    warehouseId,
    filters,
  );

  if (error) {
    console.error("Error fetching QR batches:", error);
    throw error;
  }

  return data?.map(transformQRBatchListView) || [];
}

/**
 * Fetch a single QR batch with full details
 * Used for PDF generation
 */
export async function getQRBatchById(
  batchId: string,
): Promise<QRBatchDetailView> {
  const supabase = createClient();
  const { data, error } = await buildQRBatchByIdQuery(supabase, batchId);

  if (error) throw error;
  if (!data) throw new Error("No batch returned");

  return transformQRBatchDetailView(data);
}

/**
 * Fetch batch items (for filtering)
 */
export async function getQRBatchItems(batchId: string): Promise<QRBatchItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("qr_batch_items")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching QR batch items:", error);
    throw error;
  }

  return (data as QRBatchItem[]) || [];
}

/**
 * Create a new QR batch with stock units atomically
 * Uses RPC function for atomic operation
 * Returns the created batch ID
 */
export async function createQRBatch({
  batchData,
  stockUnitIds,
}: CreateQRBatchParams): Promise<string> {
  const supabase = createClient();

  const { data: batchId, error } = await supabase.rpc(
    "create_qr_batch_with_items",
    {
      p_batch_data: batchData,
      p_stock_unit_ids: stockUnitIds,
    },
  );

  if (error) throw error;
  if (!batchId) throw new Error("No order ID returned");

  return batchId as string;
}

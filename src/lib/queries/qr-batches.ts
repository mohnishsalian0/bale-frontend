import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";
import type {
  QRBatchListView,
  QRBatchDetailView,
  QRBatchFilters,
  CreateQRBatchParams,
  QRBatchProductSummary,
} from "@/types/qr-batches.types";
import {
  PRODUCT_LIST_VIEW_SELECT,
  PRODUCT_DETAIL_VIEW_SELECT,
  transformProductListView,
  transformProductDetailView,
  type ProductListViewRaw,
  type ProductDetailViewRaw,
} from "@/lib/queries/products";

// Local type aliases
type QRBatchItem = Tables<"qr_batch_items">;

// Re-export types for convenience
export type { QRBatchFilters, CreateQRBatchParams };

// ============================================================================
// RAW TYPES - For Supabase responses
// ============================================================================

type QRBatchListViewRaw = Omit<
  QRBatchListView,
  "item_count" | "distinct_products"
> & {
  qr_batch_items: Array<{
    stock_unit: {
      product: ProductListViewRaw;
    };
  }>;
};

type QRBatchDetailViewRaw = Omit<QRBatchDetailView, "qr_batch_items"> & {
  qr_batch_items: Array<
    Tables<"qr_batch_items"> & {
      stock_unit:
        | (Tables<"stock_units"> & {
            product: ProductDetailViewRaw | null;
          })
        | null;
    }
  >;
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

  let query = supabase
    .from("qr_batches")
    .select(
      `
      id,
      batch_name,
      image_url,
      created_at,
      qr_batch_items!inner (
        stock_unit:stock_units!inner (
          product:products(${PRODUCT_LIST_VIEW_SELECT})
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

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching QR batches:", error);
    throw error;
  }

  return (
    (data as unknown as QRBatchListViewRaw[])?.map(transformQRBatchListView) ||
    []
  );
}

/**
 * Fetch a single QR batch with full details
 * Used for PDF generation
 */
export async function getQRBatchById(
  batchId: string,
): Promise<QRBatchDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("qr_batches")
    .select(
      `
      *,
      qr_batch_items (
        *,
        stock_unit:stock_units (
          *,
          product:products(${PRODUCT_DETAIL_VIEW_SELECT})
        )
      )
    `,
    )
    .eq("id", batchId)
    .single<QRBatchDetailViewRaw>();

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

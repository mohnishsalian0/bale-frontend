import { createClient } from "@/lib/supabase/browser";
import type { Tables, TablesInsert } from "@/types/database/supabase";

type QRBatch = Tables<"qr_batches">;
type QRBatchItem = Tables<"qr_batch_items">;

export interface QRBatchWithItems extends QRBatch {
  qr_batch_items: QRBatchItem[];
}

export interface QRBatchFilters extends Record<string, unknown> {
  product_id?: string;
}

export interface CreateQRBatchParams {
  batchData: TablesInsert<"qr_batches">;
  stockUnitIds: string[];
}

/**
 * Fetch all QR batches for a warehouse
 */
export async function getQRBatches(
  warehouseId: string,
  filters?: QRBatchFilters,
): Promise<QRBatchWithItems[]> {
  const supabase = createClient();

  let query = supabase
    .from("qr_batches")
    .select(
      `
      id,
      batch_name,
      image_url,
      created_at,
      qr_batch_items (
        id,
        stock_unit_id
      )
    `,
    )
    .eq("warehouse_id", warehouseId)
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching QR batches:", error);
    throw error;
  }

  let batches = (data as any[]) || [];

  // Filter by product if specified
  if (filters?.product_id) {
    const { data: batchItemsData, error: itemsError } = await supabase
      .from("qr_batch_items")
      .select(
        `
        batch_id,
        stock_units (
          product_id
        )
      `,
      )
      .eq("stock_units.product_id", filters.product_id);

    if (itemsError) {
      console.error("Error filtering QR batches by product:", itemsError);
      throw itemsError;
    }

    const batchIds = new Set(
      batchItemsData?.map((item: any) => item.batch_id) || [],
    );
    batches = batches.filter((batch) => batchIds.has(batch.id));
  }

  return batches;
}

/**
 * Fetch a single QR batch with full details
 * Used for PDF generation
 */
export async function getQRBatchById(batchId: string): Promise<any> {
  const supabase = createClient();

  // Fetch batch info
  const { data: batch, error: batchError } = await supabase
    .from("qr_batches")
    .select("batch_name, fields_selected")
    .eq("id", batchId)
    .single();

  if (batchError) {
    console.error("Error fetching QR batch:", batchError);
    throw batchError;
  }

  if (!batch) {
    throw new Error("Batch not found");
  }

  // Fetch stock units with full product data
  const { data: batchItems, error: itemsError } = await supabase
    .from("qr_batch_items")
    .select(
      `
      stock_unit_id,
      stock_units (
        id,
        sequence_number,
        manufacturing_date,
        initial_quantity,
        quality_grade,
        warehouse_location,
        products (
          name,
          sequence_number,
          hsn_code,
          stock_type,
          gsm,
          selling_price_per_unit,
          product_material_assignments (
            material:product_materials (
              id,
              name
            )
          ),
          product_color_assignments (
            color:product_colors (
              id,
              name
            )
          )
        )
      )
    `,
    )
    .eq("batch_id", batchId);

  if (itemsError) {
    console.error("Error fetching QR batch items:", itemsError);
    throw itemsError;
  }

  if (!batchItems || batchItems.length === 0) {
    throw new Error("No stock units found in batch");
  }

  return {
    ...batch,
    items: batchItems,
  };
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

  return data || [];
}

/**
 * Create a new QR batch with stock units atomically
 * Uses RPC function for atomic operation
 */
export async function createQRBatch({
  batchData,
  stockUnitIds,
}: CreateQRBatchParams): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("create_qr_batch_with_items", {
    p_batch_data: batchData,
    p_stock_unit_ids: stockUnitIds,
  });

  if (error) {
    console.error("Error creating QR batch:", error);
    throw error;
  }
}

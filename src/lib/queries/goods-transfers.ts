import { createClient } from "@/lib/supabase/browser";
import type { TablesInsert, Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TransferFilters,
  TransferListView,
  TransferDetailView,
  UpdateTransferData,
  CompleteTransferData,
  CancelTransferData,
} from "@/types/goods-transfers.types";

// Re-export types for convenience
export type {
  TransferFilters,
  TransferListView,
  TransferDetailView,
  UpdateTransferData,
  CompleteTransferData,
  CancelTransferData,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching goods transfers with optional filters
 */
export const buildGoodsTransfersQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: TransferFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("goods_transfers")
    .select(
      `
      *,
      from_warehouse:warehouses!goods_transfers_from_warehouse_id_fkey(id, name),
      to_warehouse:warehouses!goods_transfers_to_warehouse_id_fkey(id, name),
      goods_transfer_items!inner(
        *,
        stock_unit:stock_units!inner(
          id,
          initial_quantity,
          product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number)
        )
      )
    `,
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("transfer_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Filter by warehouse (either from or to)
  query = query.or(
    `from_warehouse_id.eq.${warehouseId},to_warehouse_id.eq.${warehouseId}`,
  );

  if (filters?.from_warehouse_id) {
    query = query.eq("from_warehouse_id", filters.from_warehouse_id);
  }

  if (filters?.to_warehouse_id) {
    query = query.eq("to_warehouse_id", filters.to_warehouse_id);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.date_from) {
    query = query.gte("transfer_date", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("transfer_date", filters.date_to);
  }

  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  return query;
};

/**
 * Query builder for fetching a single goods transfer by sequence number
 */
export const buildGoodsTransferByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("goods_transfers")
    .select(
      `
      *,
      from_warehouse:warehouses!goods_transfers_from_warehouse_id_fkey(id, name, address_line1, address_line2, city, state, pin_code, country),
      to_warehouse:warehouses!goods_transfers_to_warehouse_id_fkey(id, name, address_line1, address_line2, city, state, pin_code, country),
      goods_transfer_items!inner(
        *,
        stock_unit:stock_units!inner(
          *,
          product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number, hsn_code, gsm, gst_rate)
        )
      )
    `,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .single();
};

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch goods transfers for a warehouse with optional filters
 */
export async function getGoodsTransfers(
  warehouseId: string,
  filters?: TransferFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: TransferListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildGoodsTransfersQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching goods transfers:", error);
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single goods transfer by sequence number
 */
export async function getGoodsTransferByNumber(
  sequenceNumber: string,
): Promise<TransferDetailView | null> {
  const supabase = createClient();
  const { data, error } = await buildGoodsTransferByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("No goods transfer found");

  return data;
}

/**
 * Create a new goods transfer with items atomically using RPC
 */
export async function createGoodsTransferWithItems(
  transferData: Omit<
    TablesInsert<"goods_transfers">,
    "created_by" | "sequence_number"
  >,
  stockUnitIds: string[],
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc(
    "create_goods_transfer_with_items",
    {
      p_transfer_data: transferData as unknown as Json,
      p_stock_unit_ids: stockUnitIds,
    },
  );

  if (error) {
    console.error("Error creating goods transfer:", error);
    throw error;
  }

  return data as string;
}

/**
 * Update goods transfer metadata (dates, transport, notes)
 * Warehouses and stock units remain locked
 */
export async function updateGoodsTransfer(
  transferId: string,
  updateData: UpdateTransferData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_transfers")
    .update(updateData)
    .eq("id", transferId);

  if (error) {
    console.error("Error updating goods transfer:", error);
    throw error;
  }
}

/**
 * Complete a goods transfer
 * Changes status from 'in_transit' to 'completed'
 * Triggers will update stock unit locations
 */
export async function completeGoodsTransfer(transferId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_transfers")
    .update({ status: "completed" })
    .eq("id", transferId);

  if (error) {
    console.error("Error completing goods transfer:", error);
    throw error;
  }
}

/**
 * Cancel a goods transfer
 * Sets status to 'cancelled' with cancellation reason
 * Can only cancel if no subsequent movements exist
 */
export async function cancelGoodsTransfer(
  transferId: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_transfers")
    .update({
      status: "cancelled",
      cancellation_reason: cancellationReason,
    })
    .eq("id", transferId);

  if (error) {
    console.error("Error cancelling goods transfer:", error);
    throw error;
  }
}

/**
 * Delete a goods transfer (soft delete)
 * Sets deleted_at timestamp
 */
export async function deleteGoodsTransfer(transferId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_transfers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", transferId);

  if (error) {
    console.error("Error deleting goods transfer:", error);
    throw error;
  }
}

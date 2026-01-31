import type { Tables, TablesUpdate } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildGoodsTransfersQuery,
  buildGoodsTransferByNumberQuery,
} from "@/lib/queries/goods-transfers";

// Base types from database
export type GoodsTransfer = Tables<"goods_transfers">;
export type GoodsTransferItem = Tables<"goods_transfer_items">;

// =====================================================
// FILTERS
// =====================================================

export interface TransferFilters extends Record<string, unknown> {
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  status?: "in_transit" | "completed" | "cancelled";
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

// =====================================================
// UPDATE TYPES
// =====================================================

/**
 * Data for updating goods transfer metadata (dates, transport, notes)
 * Warehouses and stock units remain locked
 */
export type UpdateTransferData = Pick<
  TablesUpdate<"goods_transfers">,
  | "transfer_date"
  | "expected_delivery_date"
  | "transport_type"
  | "transport_reference_number"
  | "notes"
>;

/**
 * Data for completing a goods transfer
 */
export interface CompleteTransferData {
  status: "completed";
}

/**
 * Data for cancelling a goods transfer
 */
export interface CancelTransferData {
  status: "cancelled";
  cancellation_reason: string;
}

// =====================================================
// LIST VIEW TYPES (for list pages)
// =====================================================

/**
 * Goods transfer with warehouses and stock unit count for list views
 * Type inferred from buildGoodsTransfersQuery
 * Used in: transfer list page, stock-flow page
 */
export type TransferListView = QueryData<
  ReturnType<typeof buildGoodsTransfersQuery>
>[number];

// =====================================================
// DETAIL VIEW TYPES (for detail pages)
// =====================================================

/**
 * Goods transfer with complete details including items
 * Type inferred from buildGoodsTransferByNumberQuery
 * Used in: transfer detail page
 */
export type TransferDetailView = QueryData<
  ReturnType<typeof buildGoodsTransferByNumberQuery>
>;

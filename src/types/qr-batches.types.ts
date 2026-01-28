import type { Tables, TablesInsert } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildQRBatchesQuery,
  buildQRBatchByIdQuery,
} from "@/lib/queries/qr-batches";
import type { StockUnitWithProductDetailView } from "./stock-units.types";
import type { ProductListView } from "./products.types";

type QRBatch = Tables<"qr_batches">;
type QRBatchItem = Tables<"qr_batch_items">;

// ============================================================================
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw type inferred from buildQRBatchesQuery
 * Used as bridge between Supabase response and QRBatchListView
 */
export type QRBatchListViewRaw = QueryData<
  ReturnType<typeof buildQRBatchesQuery>
>[number];

/**
 * Raw type inferred from buildQRBatchByIdQuery
 * Used as bridge between Supabase response and QRBatchDetailView
 */
export type QRBatchDetailViewRaw = QueryData<
  ReturnType<typeof buildQRBatchByIdQuery>
>;

// =====================================================
// FILTERS
// =====================================================

export interface QRBatchFilters extends Record<string, unknown> {
  product_id?: string;
}

// =====================================================
// LIST VIEW TYPES (for list pages)
// =====================================================

/**
 * Product summary for QR batch list view
 * Shows which products are included in the batch
 */
export interface QRBatchProductSummary {
  product: ProductListView;
  unit_count: number;
}

/**
 * QR batch with minimal details for list views
 * Used in: QR batches list page
 */
export interface QRBatchListView extends Pick<
  QRBatch,
  "id" | "batch_name" | "image_url" | "page_size" | "created_at"
> {
  item_count: number;
  distinct_products: QRBatchProductSummary[];
}

// =====================================================
// DETAIL VIEW TYPES (for detail pages, PDF generation)
// =====================================================

/**
 * QR batch item with full stock unit and product details
 * Used in: PDF generation
 */
export interface QRBatchItemWithStockUnitDetailView extends QRBatchItem {
  stock_unit: StockUnitWithProductDetailView | null;
}

/**
 * QR batch with all related data for detail views and PDF generation
 * This is the canonical type used by both queries and components
 */
export interface QRBatchDetailView extends QRBatch {
  qr_batch_items: QRBatchItemWithStockUnitDetailView[];
}

// =====================================================
// MUTATION TYPES
// =====================================================

/**
 * Parameters for creating a new QR batch
 */
export interface CreateQRBatchParams {
  batchData: TablesInsert<"qr_batches">;
  stockUnitIds: string[];
}

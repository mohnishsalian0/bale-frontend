import type { Tables } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildGoodsConvertsQuery,
  buildGoodsConvertByNumberQuery,
  buildGoodsConvertOutputUnitsQuery,
  buildGoodsConvertByIdQuery,
} from "@/lib/queries/goods-converts";

// Base type from database (still needed for non-query uses)
export type GoodsConvert = Tables<"goods_converts">;

// =====================================================
// FILTERS
// =====================================================

export interface ConvertFilters extends Record<string, unknown> {
  status?: string; // 'all' | 'in_progress' | 'completed' | 'cancelled'
  vendor_id?: string;
  product_id?: string; // Filter by output product
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

// =====================================================
// LIST VIEW TYPES (for list pages)
// =====================================================

/**
 * Goods convert with input items for list views
 * Type inferred from buildGoodsConvertsQuery
 * Used in: convert list page
 */
export type ConvertListView = QueryData<
  ReturnType<typeof buildGoodsConvertsQuery>
>[number];

// =====================================================
// DETAIL VIEW TYPES (for detail pages)
// =====================================================

/**
 * Base goods convert data without output stock units
 * Type inferred from buildGoodsConvertByNumberQuery
 */
type ConvertDetailBaseView = QueryData<
  ReturnType<typeof buildGoodsConvertByNumberQuery>
>;

/**
 * Output stock units for a goods convert
 * Type inferred from buildGoodsConvertOutputUnitsQuery
 */
type ConvertOutputStockUnits = QueryData<
  ReturnType<typeof buildGoodsConvertOutputUnitsQuery>
>;

/**
 * Goods convert with complete details including input and output units
 * Combines base convert data with output stock units
 * Used in: convert detail page
 * Note: output_stock_units is always present but may be empty for non-completed converts
 */
export type ConvertDetailView = ConvertDetailBaseView & {
  output_stock_units: ConvertOutputStockUnits;
};

/**
 * Goods convert for editing
 * Type inferred from buildGoodsConvertByIdQuery
 * Used in: convert edit page
 */
export type ConvertEditView = QueryData<
  ReturnType<typeof buildGoodsConvertByIdQuery>
>;

// =====================================================
// CREATE TYPES
// =====================================================

/**
 * Data for creating goods convert header
 */
export interface CreateConvertData {
  warehouse_id: string;
  service_type: string;
  output_product_id: string;
  vendor_id: string;
  agent_id?: string;
  reference_number?: string;
  job_work_id?: string;
  start_date: string; // ISO date
  notes?: string;
}

/**
 * Data for creating goods convert input items
 */
export interface CreateConvertInputItem {
  stock_unit_id: string;
  quantity_consumed: number;
}

/**
 * Data for creating output stock units during completion
 */
export interface CreateConvertOutputUnit {
  initial_quantity: number;
  quality_grade?: string;
  stock_number?: string;
  lot_number?: string;
  warehouse_location?: string;
  manufacturing_date?: string; // ISO date
  notes?: string;
  wastage_quantity?: number;
  wastage_reason?: string;
}

// =====================================================
// UPDATE TYPES
// =====================================================

/**
 * Data for updating goods convert (only editable fields)
 * Cannot change: warehouse_id, output_product_id
 */
export interface UpdateConvertData {
  service_type?: string; // UUID reference to attributes table
  vendor_id?: string;
  agent_id?: string;
  reference_number?: string;
  start_date?: string; // ISO date
  notes?: string;
}

/**
 * Data for completing goods convert
 */
export interface CompleteConvertData {
  completion_date: string; // ISO date
}

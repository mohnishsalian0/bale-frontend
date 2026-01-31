import { createClient } from "@/lib/supabase/browser";
import type { Database, TablesUpdate } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  StockUnitFilters,
  StockUnitWithProductListView,
  StockUnitWithInwardListView,
  StockUnitWithProductDetailView,
  StockUnitWithProductListViewRaw,
  StockUnitWithInwardListViewRaw,
  StockUnitWithProductDetailViewRaw,
  StockUnitActivity,
} from "@/types/stock-units.types";
import {
  transformProductListView,
  transformProductDetailView,
} from "@/lib/queries/products";
import { StockUnitStatus } from "@/types/database/enums";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching stock units with product details
 */
export const buildStockUnitsQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: StockUnitFilters,
) => {
  let query = supabase
    .from("stock_units")
    .select(
      `
      id,
      sequence_number,
      initial_quantity,
      remaining_quantity,
      quality_grade,
      warehouse_location,
      manufacturing_date,
      status,
      qr_generated_at,
      created_at,
      created_from_inward_id,
      supplier_number,
			warehouse:warehouses(id, name),
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
    .eq("current_warehouse_id", warehouseId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.product_id) {
    query = query.eq("product_id", filters.product_id);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters?.qr_generated_at === "null") {
    query = query.is("qr_generated_at", null);
  } else if (filters?.qr_generated_at === "not_null") {
    query = query.not("qr_generated_at", "is", null);
  }

  if (filters?.created_from_inward_id !== undefined) {
    if (filters.created_from_inward_id === null) {
      query = query.is("created_from_inward_id", null);
    } else {
      query = query.eq(
        "created_from_inward_id",
        filters.created_from_inward_id,
      );
    }
  }

  return query;
};

/**
 * Query builder for fetching stock units with inward details
 */
export const buildStockUnitsWithInwardQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: StockUnitFilters,
  page: number = 1,
  pageSize: number = 20,
) => {
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  let query = supabase
    .from("stock_units")
    .select(
      `
      id,
      sequence_number,
      initial_quantity,
      remaining_quantity,
      quality_grade,
      warehouse_location,
      manufacturing_date,
      status,
      qr_generated_at,
      created_at,
      created_from_inward_id,
      supplier_number,
			warehouse:warehouses(id, name),
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
      ),
      goods_inward:goods_inwards!created_from_inward_id(
        id, sequence_number, inward_date, inward_type,
        partner:partners!goods_inwards_partner_id_fkey(
          id, first_name, last_name, display_name, company_name
        )
      )
    `,
      { count: "exact" },
    )
    .eq("current_warehouse_id", warehouseId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (filters?.product_id) {
    query = query.eq("product_id", filters.product_id);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters?.qr_generated_at === "null") {
    query = query.is("qr_generated_at", null);
  } else if (filters?.qr_generated_at === "not_null") {
    query = query.not("qr_generated_at", "is", null);
  }

  if (filters?.created_from_inward_id !== undefined) {
    if (filters.created_from_inward_id === null) {
      query = query.is("created_from_inward_id", null);
    } else {
      query = query.eq(
        "created_from_inward_id",
        filters.created_from_inward_id,
      );
    }
  }

  return query;
};

/**
 * Query builder for fetching a single stock unit with product detail
 */
export const buildStockUnitWithProductDetailQuery = (
  supabase: SupabaseClient<Database>,
  stockUnitId: string,
  filters?: {
    warehouseId?: string;
    status?: StockUnitStatus | StockUnitStatus[];
  },
) => {
  let query = supabase
    .from("stock_units")
    .select(
      `
      *,
			warehouse:warehouses(id, name),
      product:products(
        *,
        attributes:product_attributes!inner(id, name, group_name, color_hex)
      )
    `,
    )
    .eq("id", stockUnitId)
    .is("deleted_at", null);

  // Apply optional filters
  if (filters?.warehouseId) {
    query = query.eq("current_warehouse_id", filters.warehouseId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  return query.single();
};

/**
 * Query builder for fetching stock unit activity history
 * Uses RPC function to get complete activity timeline including:
 * - Creation (goods inward)
 * - Transfers between warehouses
 * - Outward dispatches
 * - Quantity adjustments
 */
export const buildStockUnitActivityQuery = (
  supabase: SupabaseClient<Database>,
  stockUnitId: string,
) => {
  return supabase.rpc("get_stock_unit_activity", {
    p_stock_unit_id: stockUnitId,
  });
};

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform raw stock unit data with product to StockUnitWithProductListView
 */
function transformStockUnitWithProductListView(
  raw: StockUnitWithProductListViewRaw,
): StockUnitWithProductListView {
  const { product: rawProduct, ...stockUnit } = raw;

  return {
    ...stockUnit,
    product: rawProduct ? transformProductListView(rawProduct) : null,
  };
}

/**
 * Transform raw stock unit data with inward to StockUnitWithInwardListView
 */
function transformStockUnitWithInwardListView(
  raw: StockUnitWithInwardListViewRaw,
): StockUnitWithInwardListView {
  const { product: rawProduct, goods_inward, ...stockUnit } = raw;

  return {
    ...stockUnit,
    product: rawProduct ? transformProductListView(rawProduct) : null,
    goods_inward: goods_inward,
  };
}

/**
 * Transform raw stock unit data with product detail to StockUnitWithProductDetailView
 */
function transformStockUnitWithProductDetailView(
  raw: StockUnitWithProductDetailViewRaw,
): StockUnitWithProductDetailView {
  const { product: rawProduct, ...stockUnit } = raw;

  return {
    ...stockUnit,
    product: rawProduct ? transformProductDetailView(rawProduct) : null,
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch stock units for a warehouse with optional filters
 */
export async function getStockUnits(
  warehouseId: string,
  filters?: StockUnitFilters,
): Promise<StockUnitWithProductListView[]> {
  const supabase = createClient();
  const { data, error } = await buildStockUnitsQuery(
    supabase,
    warehouseId,
    filters,
  );

  if (error) {
    console.error("Error fetching stock units:", error);
    throw error;
  }

  return data?.map(transformStockUnitWithProductListView) || [];
}

/**
 * Fetch stock units for a product with full inward details
 * Useful for product detail page to show stock flow history
 */
export async function getStockUnitsWithInward(
  warehouseId: string,
  filters?: StockUnitFilters,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ data: StockUnitWithInwardListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildStockUnitsWithInwardQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching stock units with inward details:", error);
    throw error;
  }

  const transformedData = data?.map(transformStockUnitWithInwardListView) || [];

  return {
    data: transformedData,
    totalCount: count || 0,
  };
}

/**
 * Fetch a single stock unit by ID with full product details
 * Used for: stock unit detail modal, detail pages
 */
export async function getStockUnitWithProductDetail(
  stockUnitId: string,
  filters?: {
    warehouseId?: string;
    status?: StockUnitStatus | StockUnitStatus[];
  },
): Promise<StockUnitWithProductDetailView> {
  const supabase = createClient();
  const { data, error } = await buildStockUnitWithProductDetailQuery(
    supabase,
    stockUnitId,
    filters,
  );

  if (error) {
    console.error("Error fetching stock unit with product detail:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Stock unit not found");
  }

  return transformStockUnitWithProductDetailView(data);
}

/**
 * Update a single stock unit
 */
export async function updateStockUnit(
  id: string,
  updates: TablesUpdate<"stock_units">,
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_units")
    .update(updates)
    .eq("id", id)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("Error updating stock unit:", error);
    throw error;
  }

  return data.id;
}

/**
 * Batch update multiple stock units
 * Useful for bulk status changes or QR code generation
 */
export async function updateStockUnits(
  updates: Array<{ id: string; data: TablesUpdate<"stock_units"> }>,
): Promise<void> {
  const supabase = createClient();

  // Execute updates in parallel
  const promises = updates.map(({ id, data }) =>
    supabase.from("stock_units").update(data).eq("id", id),
  );

  const results = await Promise.all(promises);

  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    console.error("Error updating stock units:", errors);
    throw new Error(`Failed to update ${errors.length} stock units`);
  }
}

/**
 * Delete a stock unit (soft delete)
 * Note: Hard delete is blocked by database trigger if has_outward = true
 */
export async function deleteStockUnit(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("stock_units")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting stock unit:", error);
    throw error;
  }
}

/**
 * Fetch complete activity history for a stock unit
 * Returns chronological timeline of all events (newest first):
 * - Creation via goods inward
 * - Transfers between warehouses
 * - Outward dispatches to partners
 * - Quantity adjustments
 */
export async function getStockUnitActivity(
  stockUnitId: string,
): Promise<StockUnitActivity[]> {
  const supabase = createClient();
  const { data, error } = await buildStockUnitActivityQuery(
    supabase,
    stockUnitId,
  );

  if (error) {
    console.error("Error fetching stock unit activity:", error);
    throw error;
  }

  return data || [];
}

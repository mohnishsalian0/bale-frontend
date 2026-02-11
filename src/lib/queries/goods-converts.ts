import { createClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConvertFilters,
  ConvertListView,
  ConvertDetailView,
  ConvertEditView,
  CreateConvertData,
  CreateConvertInputItem,
  CreateConvertOutputUnit,
  UpdateConvertData,
} from "@/types/goods-converts.types";

// Re-export types for convenience
export type {
  ConvertFilters,
  ConvertListView,
  ConvertDetailView,
  ConvertEditView,
  CreateConvertData,
  CreateConvertInputItem,
  CreateConvertOutputUnit,
  UpdateConvertData,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching goods converts with optional filters
 */
export const buildGoodsConvertsQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: ConvertFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("goods_converts")
    .select(
      `
      id,
      sequence_number,
      start_date,
      completion_date,
      status,
      vendor:partners!goods_converts_vendor_id_fkey(first_name, last_name, display_name, company_name),
      warehouse:warehouses!goods_converts_warehouse_id_fkey(name),
      service_type:attributes!goods_converts_service_type_attribute_id_fkey(id, name),
      output_product:products!goods_converts_output_product_id_fkey(id, name, measuring_unit),
      input_items:goods_convert_input_items(
        quantity_consumed,
        stock_unit:stock_units(
          product:products(id, name, measuring_unit)
        )
      ),
      output_stock_units:stock_units!fk_stock_unit_origin_convert(
        initial_quantity,
        product:products(id, measuring_unit)
      )
    `,
      { count: "exact" },
    )
    .eq("warehouse_id", warehouseId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .order("sequence_number", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.vendor_id) {
    query = query.eq("vendor_id", filters.vendor_id);
  }

  if (filters?.product_id) {
    // Filter by output product
    query = query.eq("output_product_id", filters.product_id);
  }

  if (filters?.date_from) {
    query = query.gte("start_date", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("start_date", filters.date_to);
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
 * Query builder for fetching a single goods convert by sequence number
 * Note: Output stock units are fetched separately (only for completed converts)
 */
export const buildGoodsConvertByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("goods_converts")
    .select(
      `
      *,
      vendor:partners!goods_converts_vendor_id_fkey(id, first_name, last_name, display_name, company_name, phone_number),
      agent:partners!goods_converts_agent_id_fkey(id, first_name, last_name, display_name, company_name),
      warehouse:warehouses!goods_converts_warehouse_id_fkey(id, name, address_line1, address_line2, city, state, pin_code, country),
      service_type:attributes!service_type_attribute_id(id, name),
      output_product:products!output_product_id(id, name, measuring_unit, stock_type, product_images),
      job_work:job_works!job_work_id(id, sequence_number),
      input_items:goods_convert_input_items(
        *,
        stock_unit:stock_units(
          *,
          lot_number:attributes!lot_number_attribute_id(id, name, group_name),
          product:products(id, name, measuring_unit, stock_type, product_images, selling_price_per_unit),
          warehouse:warehouses(id, name)
        )
      ),
      wastage:stock_unit_adjustments!fk_adjustment_convert(id, quantity_adjusted)
    `,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching output stock units of a goods convert
 * Only relevant for completed converts
 */
export const buildGoodsConvertOutputUnitsQuery = (
  supabase: SupabaseClient<Database>,
  convertId: string,
) => {
  return supabase
    .from("stock_units")
    .select(
      `
      *,
      lot_number:attributes!lot_number_attribute_id(id, name, group_name),
      product:products(id, name, measuring_unit, stock_type, product_images),
      warehouse:warehouses(id, name)
    `,
    )
    .eq("origin_convert_id", convertId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
};

/**
 * Query builder for fetching goods convert by ID (for edit)
 */
export const buildGoodsConvertByIdQuery = (
  supabase: SupabaseClient<Database>,
  convertId: string,
) => {
  return supabase
    .from("goods_converts")
    .select(
      `
      *,
      service_type:attributes!goods_converts_service_type_attribute_id_fkey(id, name),
      output_product:products!goods_converts_output_product_id_fkey(id, name),
      input_items:goods_convert_input_items(
        id,
        quantity_consumed,
        stock_unit:stock_units(
          id,
          product_id,
          stock_number,
          remaining_quantity,
          product:products(id, name, stock_type, measuring_unit, product_images, selling_price_per_unit)
        )
      )
    `,
    )
    .eq("id", convertId)
    .is("deleted_at", null)
    .single();
};

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch goods converts for a warehouse with optional filters
 */
export async function getGoodsConverts(
  warehouseId: string,
  filters?: ConvertFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: ConvertListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildGoodsConvertsQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching goods converts:", error);
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single goods convert by sequence number
 * Conditionally fetches output stock units only if status is 'completed'
 */
export async function getGoodsConvertByNumber(
  sequenceNumber: string,
): Promise<ConvertDetailView> {
  const supabase = createClient();
  const { data, error } = await buildGoodsConvertByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("No goods convert found");

  // Only fetch output stock units if the convert is completed
  if (data.status === "completed") {
    const { data: outputUnits, error: outputError } =
      await buildGoodsConvertOutputUnitsQuery(supabase, data.id);

    if (outputError) {
      console.error("Error fetching output stock units:", outputError);
      throw outputError;
    }

    return {
      ...data,
      output_stock_units: outputUnits || [],
    };
  }

  return {
    ...data,
    output_stock_units: [],
  };
}

/**
 * Fetch a single goods convert by ID (for edit)
 */
export async function getGoodsConvertById(
  convertId: string,
): Promise<ConvertEditView> {
  const supabase = createClient();
  const { data, error } = await buildGoodsConvertByIdQuery(supabase, convertId);

  if (error) throw error;
  if (!data) throw new Error("No goods convert found");

  return data;
}

// ============================================================================
// MUTATIONS (RPC FUNCTIONS)
// ============================================================================

/**
 * Create a new goods convert with input items atomically using RPC
 */
export async function createGoodsConvertWithItems(
  convertData: CreateConvertData,
  inputItems: CreateConvertInputItem[],
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc(
    "create_goods_convert_with_items",
    {
      p_convert_data: convertData as unknown as Json,
      p_input_stock_units: inputItems as unknown as Json[],
    },
  );

  if (error) {
    console.error("Error creating goods convert:", error);
    throw error;
  }

  return data as string;
}

/**
 * Update goods convert with new input items atomically using RPC
 */
export async function updateGoodsConvertWithItems(
  convertId: string,
  convertData: UpdateConvertData,
  inputItems: CreateConvertInputItem[],
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("update_goods_convert_with_items", {
    p_convert_id: convertId,
    p_convert_data: convertData as unknown as Json,
    p_input_stock_units: inputItems as unknown as Json[],
  });

  if (error) {
    console.error("Error updating goods convert:", error);
    throw error;
  }
}

/**
 * Complete goods convert with output stock units using RPC
 */
export async function completeGoodsConvert(
  convertId: string,
  completionDate: string,
  outputUnits: CreateConvertOutputUnit[],
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("complete_goods_convert", {
    p_convert_id: convertId,
    p_completion_date: completionDate,
    p_output_stock_units: outputUnits as unknown as Json[],
  });

  if (error) {
    console.error("Error completing goods convert:", error);
    throw error;
  }
}

/**
 * Cancel a goods convert
 */
export async function cancelGoodsConvert(
  convertId: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("cancel_goods_convert", {
    p_convert_id: convertId,
    p_cancellation_reason: cancellationReason,
  });

  if (error) {
    console.error("Error cancelling goods convert:", error);
    throw error;
  }
}

/**
 * Delete a goods convert (soft delete)
 * Can only delete in_progress converts
 */
export async function deleteGoodsConvert(convertId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_converts")
    .delete()
    .eq("id", convertId);

  if (error) {
    console.error("Error deleting goods convert:", error);
    throw error;
  }
}

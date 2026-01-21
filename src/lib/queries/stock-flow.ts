import { createClient } from "@/lib/supabase/browser";
import type { TablesInsert, Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InwardFilters,
  OutwardFilters,
  InwardWithStockUnitListView,
  OutwardWithOutwardItemListView,
  InwardDetailView,
  OutwardDetailView,
  OutwardBySalesOrderView,
  InwardByPurchaseOrderView,
  OutwardItemWithOutwardDetailView,
  UpdateInwardData,
  UpdateOutwardData,
} from "@/types/stock-flow.types";

// Re-export types for convenience
export type {
  InwardFilters,
  OutwardFilters,
  InwardWithStockUnitListView,
  OutwardWithOutwardItemListView,
  InwardDetailView,
  OutwardDetailView,
  OutwardBySalesOrderView,
  InwardByPurchaseOrderView,
  OutwardItemWithOutwardDetailView,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching goods inwards with optional filters
 */
export const buildGoodsInwardsQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: InwardFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, display_name, company_name),
			from_warehouse:warehouses!from_warehouse_id(id, name),
      stock_units!inner(
        product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number),
        initial_quantity
      )
    `,
      { count: "exact" },
    )
    .eq("warehouse_id", warehouseId)
    .order("inward_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.partner_id) {
    query = query.eq("partner_id", filters.partner_id);
  }

  if (filters?.product_id) {
    query = query.eq("stock_units.product_id", filters.product_id);
  }

  if (filters?.date_from) {
    query = query.gte("inward_date", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("inward_date", filters.date_to);
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
 * Query builder for fetching goods outwards with optional filters
 */
export const buildGoodsOutwardsQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: OutwardFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, display_name, company_name),
			to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(id, name),
      goods_outward_items!inner(
        quantity_dispatched,
        stock_unit:stock_units!inner(
          product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number)
        )
      )
    `,
      { count: "exact" },
    )
    .eq("warehouse_id", warehouseId)
    .order("outward_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.partner_id) {
    query = query.eq("partner_id", filters.partner_id);
  }

  if (filters?.product_id) {
    query = query.eq(
      "goods_outward_items.stock_unit.product_id",
      filters.product_id,
    );
  }

  if (filters?.date_from) {
    query = query.gte("outward_date", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("outward_date", filters.date_to);
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
 * Query builder for fetching goods outwards by sales order
 */
export const buildGoodsOutwardsBySalesOrderQuery = (
  supabase: SupabaseClient<Database>,
  orderNumber: string,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  return supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, display_name, company_name),
			to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(id, name),
			sales_order:sales_orders!inner(id, sequence_number),
      goods_outward_items(
        quantity_dispatched,
        stock_unit:stock_units(
          product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number)
        )
      )
    `,
      { count: "exact" },
    )
    .eq("sales_order.sequence_number", orderNumber)
    .is("deleted_at", null)
    .order("outward_date", { ascending: false })
    .range(offset, offset + pageSize - 1);
};

/**
 * Query builder for fetching goods inwards by purchase order
 */
export const buildGoodsInwardsByPurchaseOrderQuery = (
  supabase: SupabaseClient<Database>,
  orderNumber: string,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  return supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, display_name, company_name),
			from_warehouse:warehouses!from_warehouse_id(id, name),
			purchase_order:purchase_orders!inner(id, sequence_number),
      stock_units(
        product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number),
        initial_quantity
      )
    `,
      { count: "exact" },
    )
    .eq("purchase_order.sequence_number", orderNumber)
    .is("deleted_at", null)
    .order("inward_date", { ascending: false })
    .range(offset, offset + pageSize - 1);
};

/**
 * Query builder for fetching a single goods inward by sequence number
 */
export const buildGoodsInwardByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, display_name, company_name, shipping_same_as_billing, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_pin_code, shipping_country, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_pin_code, billing_country),
      agent:partners!goods_inwards_agent_id_fkey(first_name, last_name, display_name, company_name),
      warehouse:warehouses!goods_inwards_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      from_warehouse:warehouses!goods_inwards_from_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      sales_order:sales_orders(sequence_number),
      job_work:job_works(sequence_number),
      stock_units(
        *,
        product:products(id, name, stock_type, measuring_unit, product_images, product_code, sequence_number, hsn_code, gsm, gst_rate)
      )
    `,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .single();
};

/**
 * Query builder for fetching a single goods outward by sequence number
 */
export const buildGoodsOutwardByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, display_name, company_name, shipping_same_as_billing, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_pin_code, shipping_country, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_pin_code, billing_country),
      agent:partners!goods_outwards_agent_id_fkey(first_name, last_name, display_name, company_name),
      warehouse:warehouses!goods_outwards_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      sales_order:sales_orders(sequence_number),
      job_work:job_works(sequence_number),
      goods_outward_items(
        *,
        stock_unit:stock_units(
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
 * Fetch goods inwards for a warehouse with optional filters
 */
export async function getGoodsInwards(
  warehouseId: string,
  filters?: InwardFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: InwardWithStockUnitListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildGoodsInwardsQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching goods inwards:", error);
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch goods outwards for a warehouse with optional filters
 */
export async function getGoodsOutwards(
  warehouseId: string,
  filters?: OutwardFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: OutwardWithOutwardItemListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildGoodsOutwardsQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching goods outwards:", error);
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch goods outwards list by sales order number
 */
export async function getGoodsOutwardsBySalesOrder(
  orderNumber: string,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: OutwardBySalesOrderView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildGoodsOutwardsBySalesOrderQuery(
    supabase,
    orderNumber,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching goods outwards:", error);
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch goods inwards list by purchase order number
 */
export async function getGoodsInwardsByPurchaseOrder(
  orderNumber: string,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: InwardByPurchaseOrderView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildGoodsInwardsByPurchaseOrderQuery(
    supabase,
    orderNumber,
    page,
    pageSize,
  );

  if (error) {
    console.error("Error fetching goods inwards:", error);
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single goods inward by sequence number
 */
export async function getGoodsInwardByNumber(
  sequenceNumber: string,
): Promise<InwardDetailView | null> {
  const supabase = createClient();
  const { data, error } = await buildGoodsInwardByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("No goods inward found");

  return data;
}

/**
 * Fetch a single goods outward by sequence number
 */
export async function getGoodsOutwardByNumber(
  sequenceNumber: string,
): Promise<OutwardDetailView> {
  const supabase = createClient();
  const { data, error } = await buildGoodsOutwardByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("No goods outward found");

  return data;
}

/**
 * Fetch outward items for a specific product
 * Useful for product detail page to show outward flow history
 */
export async function getOutwardItemsByProduct(
  productId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ data: OutwardItemWithOutwardDetailView[]; totalCount: number }> {
  const supabase = createClient();

  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const { data, error, count } = await supabase
    .from("goods_outward_items")
    .select(
      `
      *,
      stock_unit:stock_units!inner(product_id),
      outward:goods_outwards(
        id, sequence_number, outward_date, outward_type,
        partner:partners!goods_outwards_partner_id_fkey(
          id, first_name, last_name, display_name, company_name
        ),
        to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(
          id, name
        )
      )
    `,
      { count: "exact" },
    )
    .eq("stock_unit.product_id", productId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching outward items by product:", error);
    throw error;
  }

  return {
    data: (data as OutwardItemWithOutwardDetailView[]) || [],
    totalCount: count || 0,
  };
}

/**
 * Create a new goods inward with stock units atomically using RPC
 */
export async function createGoodsInwardWithUnits(
  inwardData: Omit<
    TablesInsert<"goods_inwards">,
    "created_by" | "sequence_number"
  >,
  stockUnits: Omit<
    TablesInsert<"stock_units">,
    "created_by" | "modified_by" | "sequence_number"
  >[],
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_goods_inward_with_units", {
    p_inward_data: inwardData as unknown as Json,
    p_stock_units: stockUnits,
  });

  if (error) {
    console.error("Error creating goods inward:", error);
    throw error;
  }

  return data as string;
}

/**
 * Create a new goods outward with items atomically using RPC
 */
export async function createGoodsOutwardWithItems(
  outwardData: Omit<
    TablesInsert<"goods_outwards">,
    "created_by" | "sequence_number"
  >,
  stockUnitItems: Array<{
    stock_unit_id: string;
    quantity: number;
  }>,
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc(
    "create_goods_outward_with_items",
    {
      p_outward_data: outwardData as unknown as Json,
      p_stock_unit_items: stockUnitItems,
    },
  );

  if (error) {
    console.error("Error creating goods outward:", error);
    throw error;
  }

  return data as string;
}

/**
 * Update goods inward metadata (dates, transport, notes)
 * Stock units and inward source remain locked
 */
export async function updateGoodsInward(
  inwardId: string,
  updateData: UpdateInwardData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_inwards")
    .update(updateData)
    .eq("id", inwardId);

  if (error) {
    console.error("Error updating goods inward:", error);
    throw error;
  }
}

/**
 * Cancel a goods inward
 * Sets is_cancelled = true with cancellation reason
 * Can only cancel if:
 * - Not already cancelled
 * - Not invoiced (has_invoice = false)
 */
export async function cancelGoodsInward(
  inwardId: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_inwards")
    .update({
      is_cancelled: true,
      cancellation_reason: cancellationReason,
    })
    .eq("id", inwardId);

  if (error) {
    console.error("Error cancelling goods inward:", error);
    throw error;
  }
}

/**
 * Delete a goods inward (soft delete)
 * Can only delete if not invoiced (has_invoice = false)
 * Sets deleted_at timestamp
 */
export async function deleteGoodsInward(inwardId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_inwards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", inwardId)
    .eq("has_invoice", false);

  if (error) {
    console.error("Error deleting goods inward:", error);
    throw error;
  }
}

// ============================================================================
// GOODS OUTWARD MUTATIONS
// ============================================================================

/**
 * Update goods outward metadata (dates, transport, notes)
 * Critical fields (partner, warehouse, type) remain locked
 * Can only update if:
 * - Not cancelled (is_cancelled = false)
 * - Not deleted (deleted_at = null)
 * - Not invoiced (has_invoice = false) for critical fields
 */
export async function updateGoodsOutward(
  outwardId: string,
  updateData: UpdateOutwardData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_outwards")
    .update(updateData)
    .eq("id", outwardId);

  if (error) {
    console.error("Error updating goods outward:", error);
    throw error;
  }
}

/**
 * Cancel a goods outward
 * Sets is_cancelled = true with cancellation reason
 * Can only cancel if:
 * - Not already cancelled
 * - Not invoiced (has_invoice = false)
 */
export async function cancelGoodsOutward(
  outwardId: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_outwards")
    .update({
      is_cancelled: true,
      cancellation_reason: cancellationReason,
    })
    .eq("id", outwardId);

  if (error) {
    console.error("Error cancelling goods outward:", error);
    throw error;
  }
}

/**
 * Delete a goods outward (soft delete)
 * Can only delete if not invoiced (has_invoice = false)
 * Sets deleted_at timestamp
 */
export async function deleteGoodsOutward(outwardId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("goods_outwards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", outwardId)
    .eq("has_invoice", false);

  if (error) {
    console.error("Error deleting goods outward:", error);
    throw error;
  }
}

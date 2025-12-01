import { createClient } from "@/lib/supabase/browser";
import type { Tables, TablesInsert } from "@/types/database/supabase";
import type {
  OutwardDetailView,
  InwardFilters,
  OutwardFilters,
  OutwardItemWithOutwardDetailView,
  InwardWithStockUnitListView,
  OutwardWithOutwardItemListView,
  InwardDetailView,
} from "@/types/stock-flow.types";
import {
  PRODUCT_LIST_VIEW_SELECT,
  PRODUCT_DETAIL_VIEW_SELECT,
  transformProductListView,
  transformProductDetailView,
  type ProductListViewRaw,
  type ProductDetailViewRaw,
} from "@/lib/queries/products";

// Re-export types for convenience
export type { InwardFilters, OutwardFilters };

// ============================================================================
// RAW TYPES - For Supabase responses
// ============================================================================

type InwardWithStockUnitListViewRaw = Omit<
  InwardWithStockUnitListView,
  "stock_units"
> & {
  stock_units: Array<{
    product: ProductListViewRaw | null;
    initial_quantity: number;
  }>;
};

type OutwardItemRaw = {
  quantity_dispatched: number;
  stock_unit: {
    product: ProductListViewRaw | null;
  } | null;
};

type OutwardWithOutwardItemListViewRaw = Omit<
  OutwardWithOutwardItemListView,
  "goods_outward_items"
> & {
  goods_outward_items: OutwardItemRaw[];
};

type InwardDetailViewRaw = Omit<InwardDetailView, "stock_units"> & {
  stock_units: Array<
    Tables<"stock_units"> & {
      product: ProductDetailViewRaw | null;
    }
  >;
};

type OutwardDetailViewRaw = Omit<OutwardDetailView, "goods_outward_items"> & {
  goods_outward_items: Array<
    Tables<"goods_outward_items"> & {
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
 * Transform raw inward data with stock units to InwardWithStockUnitListView
 */
function transformInwardWithStockUnitListView(
  raw: InwardWithStockUnitListViewRaw,
): InwardWithStockUnitListView {
  const { stock_units: rawStockUnits, ...inward } = raw;

  return {
    ...inward,
    stock_units: rawStockUnits.map((su) => ({
      ...su,
      product: su.product ? transformProductListView(su.product) : null,
    })),
  };
}

/**
 * Transform raw outward data with items to OutwardWithOutwardItemListView
 */
function transformOutwardWithItemListView(
  raw: OutwardWithOutwardItemListViewRaw,
): OutwardWithOutwardItemListView {
  const { goods_outward_items: rawItems, ...outward } = raw;

  return {
    ...outward,
    goods_outward_items: rawItems.map((item) => ({
      ...item,
      stock_unit: item.stock_unit
        ? {
            ...item.stock_unit,
            product: item.stock_unit.product
              ? transformProductListView(item.stock_unit.product)
              : null,
          }
        : null,
    })),
  };
}

/**
 * Transform raw inward detail data to InwardDetailView
 */
function transformInwardDetailView(raw: InwardDetailViewRaw): InwardDetailView {
  const { stock_units: rawStockUnits, ...inward } = raw;

  return {
    ...inward,
    stock_units: rawStockUnits.map((su) => ({
      ...su,
      product: su.product ? transformProductDetailView(su.product) : null,
    })),
  };
}

/**
 * Transform raw outward detail data to OutwardDetailView
 */
function transformOutwardDetailView(
  raw: OutwardDetailViewRaw,
): OutwardDetailView {
  const { goods_outward_items: rawItems, ...outward } = raw;

  return {
    ...outward,
    goods_outward_items: rawItems.map((item) => ({
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
 * Fetch goods inwards for a warehouse with optional filters
 */
export async function getGoodsInwards(
  warehouseId: string,
  filters?: InwardFilters,
): Promise<InwardWithStockUnitListView[]> {
  const supabase = createClient();

  let query = supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, company_name),
      stock_units(
        product:products(${PRODUCT_LIST_VIEW_SELECT}),
        initial_quantity
      )
    `,
    )
    .eq("warehouse_id", warehouseId)
    .order("inward_date", { ascending: false });

  // Apply filters
  if (filters?.partner_id) {
    query = query.eq("partner_id", filters.partner_id);
  }

  if (filters?.date_from) {
    query = query.gte("inward_date", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("inward_date", filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching goods inwards:", error);
    throw error;
  }

  return (
    (data as unknown as InwardWithStockUnitListViewRaw[])?.map(
      transformInwardWithStockUnitListView,
    ) || []
  );
}

/**
 * Fetch goods outwards for a warehouse with optional filters
 */
export async function getGoodsOutwards(
  warehouseId: string,
  filters?: OutwardFilters,
): Promise<OutwardWithOutwardItemListView[]> {
  const supabase = createClient();

  let query = supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, company_name),
      goods_outward_items(
        quantity_dispatched,
        stock_unit:stock_units(
          product:products(${PRODUCT_LIST_VIEW_SELECT})
        )
      )
    `,
    )
    .eq("warehouse_id", warehouseId)
    .order("outward_date", { ascending: false });

  // Apply filters
  if (filters?.partner_id) {
    query = query.eq("partner_id", filters.partner_id);
  }

  if (filters?.date_from) {
    query = query.gte("outward_date", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("outward_date", filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching goods outwards:", error);
    throw error;
  }

  return (
    (data as unknown as OutwardWithOutwardItemListViewRaw[])?.map(
      transformOutwardWithItemListView,
    ) || []
  );
}

/**
 * Fetch a single goods inward by sequence number
 */
export async function getGoodsInwardByNumber(
  sequenceNumber: string,
): Promise<InwardDetailView | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, company_name, address_line1, address_line2, city, state, pin_code, country),
      agent:partners!goods_inwards_agent_id_fkey(first_name, last_name, company_name),
      warehouse:warehouses!goods_inwards_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      from_warehouse:warehouses!goods_inwards_from_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      sales_order:sales_orders(sequence_number),
      job_work:job_works(sequence_number),
      stock_units(
        *,
        product:products(${PRODUCT_DETAIL_VIEW_SELECT})
      )
    `,
    )
    .eq("sequence_number", sequenceNumber)
    .single<InwardDetailViewRaw>();

  if (error) {
    console.error("Error fetching goods inward by sequence number:", error);
    return null;
  }

  return data ? transformInwardDetailView(data) : null;
}

/**
 * Fetch a single goods outward by sequence number
 */
export async function getGoodsOutwardByNumber(
  sequenceNumber: string,
): Promise<OutwardDetailView | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, company_name, address_line1, address_line2, city, state, pin_code, country),
      agent:partners!goods_outwards_agent_id_fkey(first_name, last_name, company_name),
      warehouse:warehouses!goods_outwards_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(name, address_line1, address_line2, city, state, pin_code, country),
      sales_order:sales_orders(sequence_number),
      job_work:job_works(sequence_number),
      goods_outward_items(
        *,
        stock_unit:stock_units(
          *,
          product:products(${PRODUCT_DETAIL_VIEW_SELECT})
        )
      )
    `,
    )
    .eq("sequence_number", sequenceNumber)
    .single<OutwardDetailViewRaw>();

  if (error) {
    console.error("Error fetching goods outward by sequence number:", error);
    return null;
  }

  return data ? transformOutwardDetailView(data) : null;
}

/**
 * Fetch outward items for a specific product
 * Useful for product detail page to show outward flow history
 */
export async function getOutwardItemsByProduct(
  productId: string,
): Promise<OutwardItemWithOutwardDetailView[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_outward_items")
    .select(
      `
      *,
      stock_unit:stock_units!inner(product_id),
      outward:goods_outwards(
        id, sequence_number, outward_date, outward_type,
        partner:partners!goods_outwards_partner_id_fkey(
          id, first_name, last_name, company_name
        ),
        to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(
          id, name
        )
      )
    `,
    )
    .eq("stock_unit.product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching outward items by product:", error);
    throw error;
  }

  return (data as OutwardItemWithOutwardDetailView[]) || [];
}

/**
 * Create a new goods inward
 * Note: For complex creation with stock units, use RPC function if available
 */
export async function createGoodsInward(
  inward: TablesInsert<"goods_inwards">,
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_inwards")
    .insert(inward)
    .select()
    .single<{ id: string }>();

  if (error) {
    console.error("Error creating goods inward:", error);
    throw error;
  }

  return data.id;
}

/**
 * Create a new goods outward
 * Note: For complex creation with items, use RPC function if available
 */
export async function createGoodsOutward(
  outward: TablesInsert<"goods_outwards">,
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_outwards")
    .insert(outward)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("Error creating goods outward:", error);
    throw error;
  }

  return data.id;
}

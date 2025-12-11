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

  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  let query = supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, company_name),
			from_warehouse:warehouses!from_warehouse_id(id, name),
      stock_units(
        product:products(${PRODUCT_LIST_VIEW_SELECT}),
        initial_quantity
      )
    `,
      { count: "exact" },
    )
    .eq("warehouse_id", warehouseId)
    .order("inward_date", { ascending: false })
    .range(offset, offset + limit - 1);

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

  // Apply full-text search filter
  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching goods inwards:", error);
    throw error;
  }

  const transformedData =
    (data as unknown as InwardWithStockUnitListViewRaw[])?.map(
      transformInwardWithStockUnitListView,
    ) || [];

  return {
    data: transformedData,
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

  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  let query = supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, company_name),
			from_warehouse:warehouses!to_warehouse_id(id, name),
      goods_outward_items(
        quantity_dispatched,
        stock_unit:stock_units(
          product:products(${PRODUCT_LIST_VIEW_SELECT})
        )
      )
    `,
      { count: "exact" },
    )
    .eq("warehouse_id", warehouseId)
    .order("outward_date", { ascending: false })
    .range(offset, offset + limit - 1);

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

  // Apply full-text search filter
  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching goods outwards:", error);
    throw error;
  }

  const transformedData =
    (data as unknown as OutwardWithOutwardItemListViewRaw[])?.map(
      transformOutwardWithItemListView,
    ) || [];

  return {
    data: transformedData,
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
): Promise<{ data: OutwardWithOutwardItemListView[]; totalCount: number }> {
  const supabase = createClient();

  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const { data, error, count } = await supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, company_name),
			from_warehouse:warehouses!to_warehouse_id(id, name),
			sales_order:sales_orders!inner(id, sequence_number),
      goods_outward_items(
        quantity_dispatched,
        stock_unit:stock_units(
          product:products(${PRODUCT_LIST_VIEW_SELECT})
        )
      )
    `,
      { count: "exact" },
    )
    .eq("sales_order.sequence_number", orderNumber)
    .is("deleted_at", null)
    .order("outward_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching goods outwards:", error);
    throw error;
  }

  const transformedData =
    (data as unknown as OutwardWithOutwardItemListViewRaw[])?.map(
      transformOutwardWithItemListView,
    ) || [];

  return {
    data: transformedData,
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
): Promise<{ data: InwardWithStockUnitListView[]; totalCount: number }> {
  const supabase = createClient();

  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const { data, error, count } = await supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, company_name),
			from_warehouse:warehouses!from_warehouse_id(id, name),
			purchase_order:purchase_orders!inner(id, sequence_number),
      stock_units(
        product:products(${PRODUCT_LIST_VIEW_SELECT}),
        initial_quantity
      )
    `,
      { count: "exact" },
    )
    .eq("purchase_order.sequence_number", orderNumber)
    .is("deleted_at", null)
    .order("inward_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching goods inwards:", error);
    throw error;
  }

  const transformedData =
    (data as unknown as InwardWithStockUnitListViewRaw[])?.map(
      transformInwardWithStockUnitListView,
    ) || [];

  return {
    data: transformedData,
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

  if (error) throw error;
  if (!data) throw new Error("No goods inward found");

  return transformInwardDetailView(data);
}

/**
 * Fetch a single goods outward by sequence number
 */
export async function getGoodsOutwardByNumber(
  sequenceNumber: string,
): Promise<OutwardDetailView> {
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

  if (error) throw error;
  if (!data) throw new Error("No goods outward found");

  return transformOutwardDetailView(data);
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
          id, first_name, last_name, company_name
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc("create_goods_inward_with_units", {
    p_inward_data: inwardData,
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc(
    "create_goods_outward_with_items",
    {
      p_outward_data: outwardData,
      p_stock_unit_items: stockUnitItems,
    },
  );

  if (error) {
    console.error("Error creating goods outward:", error);
    throw error;
  }

  return data as string;
}

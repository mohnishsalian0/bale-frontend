import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/types/database/supabase";

type GoodsInward = Tables<"goods_inwards">;
type GoodsOutward = Tables<"goods_outwards">;
type GoodsOutwardItem = Tables<"goods_outward_items">;
type StockUnit = Tables<"stock_units">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;
type Product = Tables<"products">;
type ProductMaterial = Tables<"product_materials">;
type ProductColor = Tables<"product_colors">;
type ProductTag = Tables<"product_tags">;

export interface GoodsInwardFilters extends Record<string, unknown> {
  partner_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface GoodsOutwardFilters extends Record<string, unknown> {
  partner_id?: string;
  date_from?: string;
  date_to?: string;
}

// List view types (simplified data)
export interface GoodsInwardListItem extends GoodsInward {
  partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  stock_units: Array<{
    initial_quantity: number;
    product: Pick<Product, "id" | "name" | "measuring_unit"> | null;
  }>;
}

export interface GoodsOutwardListItem extends GoodsOutward {
  partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  goods_outward_items: Array<{
    quantity_dispatched: number;
    stock_unit: {
      product: Pick<Product, "id" | "name" | "measuring_unit"> | null;
    } | null;
  }>;
}

// Detail view types (full data with relationships)
export interface ProductWithAssignments extends Product {
  product_material_assignments: Array<{
    material: ProductMaterial;
  }>;
  product_color_assignments: Array<{
    color: ProductColor;
  }>;
  product_tag_assignments: Array<{
    tag: ProductTag;
  }>;
}

export interface StockUnitWithDetailedProduct extends StockUnit {
  product: ProductWithAssignments | null;
}

export interface GoodsInwardWithDetails extends GoodsInward {
  partner: Partner | null;
  warehouse: Warehouse | null;
  stock_units: StockUnitWithDetailedProduct[];
}

export interface GoodsOutwardItemWithDetailedProduct extends GoodsOutwardItem {
  stock_unit: StockUnitWithDetailedProduct | null;
}

export interface GoodsOutwardWithDetails extends GoodsOutward {
  partner: Partner | null;
  warehouse: Warehouse | null;
  goods_outward_items: GoodsOutwardItemWithDetailedProduct[];
}

// Outward items for product detail page
export interface OutwardItemWithDetails extends GoodsOutwardItem {
  outward:
    | (GoodsOutward & {
        partner: Partner | null;
        to_warehouse: Warehouse | null;
      })
    | null;
}

/**
 * Fetch goods inwards for a warehouse with optional filters
 */
export async function getGoodsInwards(
  warehouseId: string,
  filters?: GoodsInwardFilters,
): Promise<GoodsInwardListItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, company_name),
      stock_units(
        product:products(id, name, measuring_unit),
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

  return data || [];
}

/**
 * Fetch goods outwards for a warehouse with optional filters
 */
export async function getGoodsOutwards(
  warehouseId: string,
  filters?: GoodsOutwardFilters,
): Promise<GoodsOutwardListItem[]> {
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
          product:products(id, name, measuring_unit)
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

  return data || [];
}

/**
 * Fetch a single goods inward by sequence number
 */
export async function getGoodsInwardBySequenceNumber(
  sequenceNumber: string,
): Promise<GoodsInwardWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(*),
      warehouse:warehouses!goods_inwards_warehouse_id_fkey(*),
      stock_units(
        *,
        product:products(
          *,
          product_material_assignments(
            material:product_materials(*)
          ),
          product_color_assignments(
            color:product_colors(*)
          ),
          product_tag_assignments(
            tag:product_tags(*)
          )
        )
      )
    `,
    )
    .eq("sequence_number", sequenceNumber)
    .single();

  if (error) {
    console.error("Error fetching goods inward by sequence number:", error);
    return null;
  }

  return data;
}

/**
 * Fetch a single goods outward by sequence number
 */
export async function getGoodsOutwardBySequenceNumber(
  sequenceNumber: string,
): Promise<GoodsOutwardWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(*),
      warehouse:warehouses!goods_outwards_warehouse_id_fkey(*),
      goods_outward_items(
        *,
        stock_unit:stock_units(
          *,
          product:products(
            *,
            product_material_assignments(
              material:product_materials(*)
            ),
            product_color_assignments(
              color:product_colors(*)
            ),
            product_tag_assignments(
              tag:product_tags(*)
            )
          )
        )
      )
    `,
    )
    .eq("sequence_number", sequenceNumber)
    .single();

  if (error) {
    console.error("Error fetching goods outward by sequence number:", error);
    return null;
  }

  return data;
}

/**
 * Fetch outward items for a specific product
 * Useful for product detail page to show outward flow history
 */
export async function getOutwardItemsByProduct(
  productId: string,
): Promise<OutwardItemWithDetails[]> {
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

  return data || [];
}

/**
 * Create a new goods inward
 * Note: For complex creation with stock units, use RPC function if available
 */
export async function createGoodsInward(
  inward: TablesInsert<"goods_inwards">,
): Promise<GoodsInward> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_inwards")
    .insert(inward)
    .select()
    .single();

  if (error) {
    console.error("Error creating goods inward:", error);
    throw error;
  }

  return data;
}

/**
 * Create a new goods outward
 * Note: For complex creation with items, use RPC function if available
 */
export async function createGoodsOutward(
  outward: TablesInsert<"goods_outwards">,
): Promise<GoodsOutward> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_outwards")
    .insert(outward)
    .select()
    .single();

  if (error) {
    console.error("Error creating goods outward:", error);
    throw error;
  }

  return data;
}

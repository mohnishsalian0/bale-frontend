import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/types/database/supabase";

type GoodsInward = Tables<"goods_inwards">;
type GoodsOutward = Tables<"goods_outwards">;

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

/**
 * Fetch goods inwards for a warehouse with optional filters
 */
export async function getGoodsInwards(
  warehouseId: string,
  filters?: GoodsInwardFilters,
): Promise<any[]> {
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
): Promise<any[]> {
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
): Promise<any | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_inwards")
    .select(
      `
      *,
      partner:partners!goods_inwards_partner_id_fkey(*),
      warehouse:warehouses(*),
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
): Promise<any | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goods_outwards")
    .select(
      `
      *,
      partner:partners!goods_outwards_partner_id_fkey(*),
      warehouse:warehouses(*),
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

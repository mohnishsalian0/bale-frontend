import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/types/database/supabase";

type StockUnit = Tables<"stock_units">;
type Product = Tables<"products">;
type GoodsInward = Tables<"goods_inwards">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;

export interface StockUnitWithProduct extends StockUnit {
  product: Product;
}

export interface StockUnitWithInwardDetails extends StockUnitWithProduct {
  goods_inward:
    | (GoodsInward & {
        partner: Partner | null;
        from_warehouse: Warehouse | null;
      })
    | null;
}

export interface StockUnitFilters extends Record<string, unknown> {
  status?: string;
  qr_generated_at?: "null" | "not_null";
  created_from_inward_id?: string | null;
}

/**
 * Fetch stock units for a warehouse with optional filters
 */
export async function getStockUnits(
  warehouseId: string,
  filters?: StockUnitFilters,
): Promise<StockUnitWithProduct[]> {
  const supabase = createClient();

  let query = supabase
    .from("stock_units")
    .select(
      `
      *,
      product:products(*)
    `,
    )
    .eq("warehouse_id", warehouseId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq("status", filters.status);
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

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching stock units:", error);
    throw error;
  }

  return (data as any[]) || [];
}

/**
 * Fetch stock units for a specific product in a warehouse
 * Useful for QR code generation selection
 */
export async function getStockUnitsByProduct(
  productId: string,
  warehouseId: string,
): Promise<StockUnitWithProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_units")
    .select(
      `
      *,
      product:products(*)
    `,
    )
    .eq("product_id", productId)
    .eq("warehouse_id", warehouseId)
    .eq("status", "in_stock")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock units by product:", error);
    throw error;
  }

  return (data as any[]) || [];
}

/**
 * Fetch stock units for a product with full inward details
 * Useful for product detail page to show stock flow history
 */
export async function getStockUnitsWithInwardDetails(
  productId: string,
  warehouseId: string,
): Promise<StockUnitWithInwardDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_units")
    .select(
      `
      *,
      goods_inward:goods_inwards!created_from_inward_id(
        id, sequence_number, inward_date, inward_type,
        partner:partners!goods_inwards_partner_id_fkey(
          id, first_name, last_name, company_name
        ),
        from_warehouse:warehouses!goods_inwards_from_warehouse_id_fkey(
          id, name
        )
      )
    `,
    )
    .eq("product_id", productId)
    .eq("warehouse_id", warehouseId)
    .eq("status", "in_stock")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock units with inward details:", error);
    throw error;
  }

  return (data as any[]) || [];
}

/**
 * Fetch stock units that need QR codes (for dashboard widget)
 * Returns all pending stock units without grouping
 */
export async function getPendingQRStockUnits(
  warehouseId: string,
): Promise<StockUnitWithProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_units")
    .select(
      `
      *,
      product:products(
        id, name, measuring_unit, product_images, sequence_number,
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
    `,
    )
    .eq("warehouse_id", warehouseId)
    .eq("status", "in_stock")
    .is("qr_generated_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending QR stock units:", error);
    throw error;
  }

  return (data as any[]) || [];
}

/**
 * Update a single stock unit
 */
export async function updateStockUnit(
  id: string,
  updates: TablesUpdate<"stock_units">,
): Promise<StockUnit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_units")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating stock unit:", error);
    throw error;
  }

  return data;
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

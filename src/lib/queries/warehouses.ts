import { createClient } from "@/lib/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database/supabase";

type Warehouse = Tables<"warehouses">;

/**
 * Fetch all warehouses for the current company
 * RLS automatically filters by company
 */
export async function getWarehouses(): Promise<Warehouse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching warehouses:", error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single warehouse by slug
 */
export async function getWarehouseBySlug(
  slug: string,
): Promise<Warehouse | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching warehouse by slug:", error);
    return null;
  }

  return data;
}

/**
 * Fetch a single warehouse by ID
 */
export async function getWarehouseById(id: string): Promise<Warehouse | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching warehouse by ID:", error);
    return null;
  }

  return data;
}

/**
 * Create a new warehouse
 */
export async function createWarehouse(
  warehouse: TablesInsert<"warehouses">,
): Promise<Warehouse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .insert(warehouse)
    .select()
    .single();

  if (error) {
    console.error("Error creating warehouse:", error);
    throw error;
  }

  return data;
}

/**
 * Update an existing warehouse
 */
export async function updateWarehouse(
  id: string,
  updates: TablesUpdate<"warehouses">,
): Promise<Warehouse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating warehouse:", error);
    throw error;
  }

  return data;
}

/**
 * Soft delete a warehouse
 */
export async function deleteWarehouse(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("warehouses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting warehouse:", error);
    throw error;
  }
}

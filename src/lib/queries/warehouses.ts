import { createClient } from "@/lib/supabase/browser";
import type { Database, TablesInsert } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Warehouse,
  WarehouseInsert,
  WarehouseUpdate,
} from "@/types/warehouses.types";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching all warehouses
 */
export const buildWarehousesQuery = (supabase: SupabaseClient<Database>) => {
  return supabase
    .from("warehouses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
};

/**
 * Query builder for fetching a single warehouse by slug
 */
export const buildWarehouseBySlugQuery = (
  supabase: SupabaseClient<Database>,
  slug: string,
) => {
  return supabase
    .from("warehouses")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching a single warehouse by ID
 */
export const buildWarehouseByIdQuery = (
  supabase: SupabaseClient<Database>,
  id: string,
) => {
  return supabase
    .from("warehouses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
};

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch all warehouses for the current company
 * RLS automatically filters by company
 */
export async function getWarehouses(): Promise<Warehouse[]> {
  const supabase = createClient();
  const { data, error } = await buildWarehousesQuery(supabase);

  if (error) {
    console.error("Error fetching warehouses:", error);
    throw error;
  }
  if (!data) return [];

  return data;
}

/**
 * Fetch a single warehouse by slug
 */
export async function getWarehouseBySlug(slug: string): Promise<Warehouse> {
  const supabase = createClient();
  const { data, error } = await buildWarehouseBySlugQuery(supabase, slug);

  if (error) {
    console.error("Error fetching warehouse by slug:", error);
  }

  if (!data) throw new Error("Warehouse not found");

  return data;
}

/**
 * Fetch a single warehouse by ID
 */
export async function getWarehouseById(id: string): Promise<Warehouse> {
  const supabase = createClient();
  const { data, error } = await buildWarehouseByIdQuery(supabase, id);

  if (error) {
    console.error("Error fetching warehouse by ID:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Warehouse not found");
  }

  return data;
}

/**
 * Create a new warehouse
 */
export async function createWarehouse(
  warehouse: WarehouseInsert,
): Promise<Warehouse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .insert(warehouse as TablesInsert<"warehouses">)
    .select()
    .single<Warehouse>();

  if (error) {
    console.error("Error creating warehouse:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create warehouse");
  }

  return data;
}

/**
 * Update an existing warehouse
 */
export async function updateWarehouse(
  id: string,
  updates: WarehouseUpdate,
): Promise<Warehouse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .update(updates)
    .eq("id", id)
    .select()
    .single<Warehouse>();

  if (error) {
    console.error("Error updating warehouse:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to update warehouse");
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

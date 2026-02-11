/**
 * Attribute Queries (Generalized)
 * Queries for the shared attributes table
 */

import { createClient } from "@/lib/supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import type { ProductAttributeGroup } from "@/types/database/enums";
import type { CreateAttributeData } from "@/types/attributes.types";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Build query for fetching attributes
 * Optionally filtered by single group_name
 */
export const buildAttributesQuery = (
  supabase: SupabaseClient<Database>,
  groupName?: string,
) => {
  let query = supabase
    .from("attributes")
    .select("id, name, group_name, color_hex")
    .order("name", { ascending: true });

  if (groupName) {
    query = query.eq("group_name", groupName);
  }

  return query;
};

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get attributes filtered by single group
 * @param groupName - Optional filter by single attribute group (material, color, product_tag)
 * @returns Array of attributes
 */
export async function getAttributes(groupName?: string) {
  const supabase = createClient();
  const { data, error } = await buildAttributesQuery(supabase, groupName);

  if (error) {
    console.error("Error fetching attributes:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Create a new attribute
 * @param name - Attribute name
 * @param groupName - Attribute group (material, color, tag)
 * @returns Created attribute ID
 */
export async function createAttribute(
  name: string,
  groupName: ProductAttributeGroup,
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("attributes")
    .insert({ name, group_name: groupName })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("Error creating attribute:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create attribute");
  }

  return data.id;
}

/**
 * Create multiple attributes in a single batch operation
 * @param attributes - Array of attributes to create
 * @returns Array of created attribute IDs
 */
export async function createAttributesBatch(
  attributes: CreateAttributeData[],
): Promise<string[]> {
  const supabase = createClient();

  const attributesToInsert = attributes.map((attr) => ({
    name: attr.name,
    group_name: attr.groupName,
  }));

  const { data, error } = await supabase
    .from("attributes")
    .insert(attributesToInsert)
    .select("id");

  if (error) {
    console.error("Error creating attributes batch:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create attributes batch");
  }

  return data.map((row: { id: string }) => row.id);
}

/**
 * Attributes Module
 * Handles creation of materials, colors, and tags
 * All functions are idempotent - safe to run multiple times
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialResult {
  id: string;
  name: string;
}

export interface ColorResult {
  id: string;
  name: string;
}

export interface TagResult {
  id: string;
  name: string;
}

export interface AttributesResult {
  materials: MaterialResult[];
  colors: ColorResult[];
  tags: TagResult[];
}

// ============================================================================
// ATTRIBUTE FUNCTIONS
// ============================================================================

/**
 * Ensure materials exist (idempotent with quantity handling)
 * Takes expected materials from config, fetches existing, creates difference
 * Returns all materials (existing + newly created)
 * Materials are identified by name (unique identifier)
 */
export async function ensureMaterials(
  supabase: SupabaseClient<Database>,
  companyId: string,
  materialNames: readonly string[],
): Promise<MaterialResult[]> {
  console.log(`🧵 Ensuring ${materialNames.length} materials exist...`);

  // Fetch existing materials for this company
  const { data: existing, error: fetchError } = await supabase
    .from("attributes")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("group_name", "material")
    .order("name", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching materials:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing materials
  if (existingCount === materialNames.length) {
    console.log(`✅ All ${existingCount} materials already exist`);
    return existing!;
  }

  // Determine which materials are missing by filtering out existing names
  const existingNames = new Set(existing?.map((m) => m.name) || []);
  const toCreate = materialNames.filter((name) => !existingNames.has(name));

  console.log(
    `📦 Creating ${toCreate.length} new materials (${existingCount} already exist)...`,
  );

  const { data: created, error: createError } = await supabase
    .from("attributes")
    .insert(
      toCreate.map((name) => ({
        company_id: companyId,
        name,
        group_name: "material",
      })),
    )
    .select("id, name");

  if (createError || !created) {
    console.error("❌ Failed to create materials:", createError);
    throw createError || new Error("Failed to create materials");
  }

  console.log(`✅ Created ${created.length} new materials`);

  // Return all materials (existing + created)
  const allMaterials = [...(existing || []), ...created];
  return allMaterials;
}

/**
 * Ensure colors exist (idempotent with quantity handling)
 * Takes expected colors from config, fetches existing, creates difference
 * Returns all colors (existing + newly created)
 * Colors are identified by name (unique identifier)
 */
export async function ensureColors(
  supabase: SupabaseClient<Database>,
  companyId: string,
  colorNames: readonly string[],
): Promise<ColorResult[]> {
  console.log(`🎨 Ensuring ${colorNames.length} colors exist...`);

  // Fetch existing colors for this company
  const { data: existing, error: fetchError } = await supabase
    .from("attributes")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("group_name", "color")
    .order("name", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching colors:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing colors
  if (existingCount === colorNames.length) {
    console.log(`✅ All ${existingCount} colors already exist`);
    return existing!;
  }

  // Determine which colors are missing by filtering out existing names
  const existingNames = new Set(existing?.map((c) => c.name) || []);
  const toCreate = colorNames.filter((name) => !existingNames.has(name));

  console.log(
    `📦 Creating ${toCreate.length} new colors (${existingCount} already exist)...`,
  );

  const { data: created, error: createError } = await supabase
    .from("attributes")
    .insert(
      toCreate.map((name) => ({
        company_id: companyId,
        name,
        group_name: "color",
      })),
    )
    .select("id, name");

  if (createError || !created) {
    console.error("❌ Failed to create colors:", createError);
    throw createError || new Error("Failed to create colors");
  }

  console.log(`✅ Created ${created.length} new colors`);

  // Return all colors (existing + created)
  const allColors = [...(existing || []), ...created];
  return allColors;
}

/**
 * Ensure tags exist (idempotent with quantity handling)
 * Takes expected tags from config, fetches existing, creates difference
 * Returns all tags (existing + newly created)
 * Tags are identified by name (unique identifier)
 */
export async function ensureTags(
  supabase: SupabaseClient<Database>,
  companyId: string,
  tagNames: readonly string[],
): Promise<TagResult[]> {
  console.log(`🏷️  Ensuring ${tagNames.length} tags exist...`);

  // Fetch existing tags for this company
  const { data: existing, error: fetchError } = await supabase
    .from("attributes")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("group_name", "tag")
    .order("name", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching tags:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing tags
  if (existingCount === tagNames.length) {
    console.log(`✅ All ${existingCount} tags already exist`);
    return existing!;
  }

  // Determine which tags are missing by filtering out existing names
  const existingNames = new Set(existing?.map((t) => t.name) || []);
  const toCreate = tagNames.filter((name) => !existingNames.has(name));

  console.log(
    `📦 Creating ${toCreate.length} new tags (${existingCount} already exist)...`,
  );

  const { data: created, error: createError } = await supabase
    .from("attributes")
    .insert(
      toCreate.map((name) => ({
        company_id: companyId,
        name,
        group_name: "tag",
      })),
    )
    .select("id, name");

  if (createError || !created) {
    console.error("❌ Failed to create tags:", createError);
    throw createError || new Error("Failed to create tags");
  }

  console.log(`✅ Created ${created.length} new tags`);

  // Return all tags (existing + created)
  const allTags = [...(existing || []), ...created];
  return allTags;
}

/**
 * Ensure all attributes exist (materials, colors, tags)
 * Convenience function that creates all attributes in one call
 */
export async function ensureAllAttributes(
  supabase: SupabaseClient<Database>,
  companyId: string,
  materialNames: readonly string[],
  colorNames: readonly string[],
  tagNames: readonly string[],
): Promise<AttributesResult> {
  console.log("🎯 Ensuring all attributes exist...\n");

  const materials = await ensureMaterials(supabase, companyId, materialNames);
  const colors = await ensureColors(supabase, companyId, colorNames);
  const tags = await ensureTags(supabase, companyId, tagNames);

  console.log(
    `\n📊 Total attributes: ${materials.length} materials, ${colors.length} colors, ${tags.length} tags\n`,
  );

  return {
    materials,
    colors,
    tags,
  };
}

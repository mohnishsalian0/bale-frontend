/**
 * Products Module
 * Handles product creation from templates with attribute assignments
 * All functions are idempotent - safe to run multiple times
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ProductTemplate } from "../config/product-templates.config";
import { randomInt, randomFloat, selectRandom } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductResult {
  id: string;
  name: string;
  sequence_number: number;
  stock_type: string;
  measuring_unit: string;
}

export interface AttributeIds {
  materials: Record<string, string>; // name -> id mapping
  colors: Record<string, string>; // name -> id mapping
  tags: Record<string, string>; // name -> id mapping
}

// ============================================================================
// PRODUCT FUNCTIONS
// ============================================================================

/**
 * Ensure products exist (idempotent with quantity handling)
 * Takes expected quantity from templates, fetches existing, creates difference
 * Returns all products (existing + newly created)
 *
 * Products are generated from templates with:
 * - Random GSM, thread count within template ranges
 * - Cost price with margin (25-80%) for selling price
 * - 70% visible on catalog, 80% have min stock alerts
 * - 30% get custom product codes, rest auto-generate
 * - Attributes (materials, colors, tags) linked via product_attribute_assignments
 */
export async function ensureProducts(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  productTemplates: ProductTemplate[],
  attributeIds: AttributeIds,
): Promise<ProductResult[]> {
  console.log(`📦 Ensuring ${productTemplates.length} products exist...\n`);

  // Fetch existing products for this company
  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("id, name, sequence_number, stock_type, measuring_unit")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching products:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing products
  if (existingCount === productTemplates.length) {
    console.log(`✅ All ${existingCount} products already exist\n`);
    return existing!;
  }

  // Determine which products are missing
  const existingNames = new Set(existing?.map((p) => p.name) || []);
  const toCreate = productTemplates.filter(
    (template) => !existingNames.has(template.name),
  );

  console.log(
    `📦 Creating ${toCreate.length} new products (${existingCount} already exist)...`,
  );

  // Generate products from templates in batches
  const createdProducts: ProductResult[] = [];
  const batchSize = 50;
  let successCount = 0;

  for (let i = 0; i < toCreate.length; i += batchSize) {
    const batch = toCreate.slice(i, i + batchSize);
    const productsToInsert = batch.map((template, idx) => {
      const gsm = randomInt(template.gsmRange[0], template.gsmRange[1]);
      const threadCount = randomInt(
        template.threadCountRange[0],
        template.threadCountRange[1],
      );
      const costPrice = randomFloat(
        template.priceRange[0],
        template.priceRange[1],
      );
      const margin = randomFloat(1.25, 1.8); // 25-80% margin
      const sellingPrice = parseFloat((costPrice * margin).toFixed(2));

      const showOnCatalog = Math.random() < 0.7; // 70% visible
      const minStockAlert = Math.random() < 0.8; // 80% have alerts
      const minStockThreshold = minStockAlert ? randomInt(10, 100) : undefined;

      // 30% get custom product codes, 70% auto-generate
      const hasCustomCode = Math.random() < 0.3;
      const productCode = hasCustomCode
        ? `${template.category.toUpperCase().substring(0, 4)}-${String(i + idx + 1).padStart(3, "0")}`
        : undefined; // Will auto-generate as PROD-{sequence}

      return {
        company_id: companyId,
        name: template.name,
        product_code: productCode,
        gsm,
        thread_count_cm: threadCount,
        stock_type: template.stockType,
        measuring_unit: template.measuringUnit,
        cost_price_per_unit: costPrice,
        selling_price_per_unit: sellingPrice,
        show_on_catalog: showOnCatalog,
        min_stock_alert: minStockAlert,
        min_stock_threshold: minStockThreshold,
        hsn_code:
          template.category === "silk"
            ? "5007"
            : template.category === "cotton"
              ? "5208"
              : "5407",
        notes: `${template.category} fabric - auto-generated test data`,
        created_by: userId,
      };
    });

    const { data: insertedProducts, error: insertError } = await supabase
      .from("products")
      .insert(productsToInsert)
      .select("id, name, sequence_number, stock_type, measuring_unit");

    if (insertError || !insertedProducts) {
      console.error("❌ Failed to insert products batch:", insertError);
      throw insertError || new Error("Failed to insert products batch");
    }

    successCount += insertedProducts.length;
    createdProducts.push(...insertedProducts);

    // Link attributes (materials, colors, tags) for each product
    for (let j = 0; j < insertedProducts.length; j++) {
      const product = insertedProducts[j];
      const template = batch[j];

      const attributeAssignments: Array<{
        company_id: string;
        product_id: string;
        attribute_id: string;
      }> = [];

      // Materials (1-3 per product)
      const materialCount = randomInt(1, 3);
      const selectedMaterials = selectRandom(template.materials, materialCount);
      for (const materialName of selectedMaterials) {
        if (attributeIds.materials[materialName]) {
          attributeAssignments.push({
            company_id: companyId,
            product_id: product.id,
            attribute_id: attributeIds.materials[materialName],
          });
        }
      }

      // Colors (1-4 per product)
      const colorCount = randomInt(1, 4);
      const selectedColors = selectRandom(template.colors, colorCount);
      for (const colorName of selectedColors) {
        if (attributeIds.colors[colorName]) {
          attributeAssignments.push({
            company_id: companyId,
            product_id: product.id,
            attribute_id: attributeIds.colors[colorName],
          });
        }
      }

      // Tags (2-6 per product)
      const tagCount = randomInt(2, 6);
      const selectedTags = selectRandom(template.tags, tagCount);
      for (const tagName of selectedTags) {
        if (attributeIds.tags[tagName]) {
          attributeAssignments.push({
            company_id: companyId,
            product_id: product.id,
            attribute_id: attributeIds.tags[tagName],
          });
        }
      }

      // Batch insert all attribute assignments
      if (attributeAssignments.length > 0) {
        const { error: assignError } = await supabase
          .from("product_attribute_assignments")
          .insert(attributeAssignments);

        if (assignError) {
          console.error(
            `⚠️  Failed to assign attributes to product ${product.name}:`,
            assignError,
          );
        }
      }
    }

    console.log(`✅ Created ${successCount} products so far...`);
  }

  console.log(`\n✨ Successfully created ${successCount} new products!`);

  // Return all products (existing + created)
  const allProducts = [...(existing || []), ...createdProducts];

  console.log(`📊 Total products: ${allProducts.length}\n`);

  return allProducts;
}

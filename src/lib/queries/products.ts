import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/supabase";

type Product = Tables<"products">;
type ProductMaterial = Tables<"product_materials">;
type ProductColor = Tables<"product_colors">;
type ProductTag = Tables<"product_tags">;

// Extended product type with materials, colors, and tags
export interface ProductWithAttributes extends Product {
  materials: ProductMaterial[];
  colors: ProductColor[];
  tags: ProductTag[];
}

// Select query for products with all attributes
export const PRODUCT_WITH_ATTRIBUTES_SELECT = `
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
`;

/**
 * Transform raw product data with nested assignments to flat attributes
 */
export function transformProductWithAttributes(
  product: any,
): ProductWithAttributes {
  const materials = (product.product_material_assignments || [])
    .map((a: any) => a.material)
    .filter(Boolean);
  const colors = (product.product_color_assignments || [])
    .map((a: any) => a.color)
    .filter(Boolean);
  const tags = (product.product_tag_assignments || [])
    .map((a: any) => a.tag)
    .filter(Boolean);

  // Remove the nested assignment fields
  const {
    product_material_assignments: _materials,
    product_color_assignments: _colors,
    product_tag_assignments: _tags,
    ...rest
  } = product;

  return {
    ...rest,
    materials,
    colors,
    tags,
  };
}

/**
 * Get all products with attributes (RLS filters by company)
 */
export async function getProductsWithAttributes(): Promise<
  ProductWithAttributes[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_ATTRIBUTES_SELECT)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data || []).map(transformProductWithAttributes);
}

/**
 * Get a single product by ID with attributes
 */
export async function getProductByIdWithAttributes(
  productId: string,
): Promise<ProductWithAttributes | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_ATTRIBUTES_SELECT)
    .eq("id", productId)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return transformProductWithAttributes(data);
}

/**
 * Get a single product by sequence number with attributes
 */
export async function getProductBySequenceNumberWithAttributes(
  sequenceNumber: number,
): Promise<ProductWithAttributes | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_ATTRIBUTES_SELECT)
    .eq("sequence_number", sequenceNumber)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return transformProductWithAttributes(data);
}

// Re-export types for convenience
export type { ProductMaterial, ProductColor, ProductTag };

/**
 * Get all materials (RLS filters by company)
 */
export async function getProductMaterials(): Promise<ProductMaterial[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_materials")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching materials:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all colors (RLS filters by company)
 */
export async function getProductColors(): Promise<ProductColor[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_colors")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching colors:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all tags (RLS filters by company)
 */
export async function getProductTags(): Promise<ProductTag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tags:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all attribute lists in a single call
 */
export async function getProductAttributeLists(): Promise<{
  materials: ProductMaterial[];
  colors: ProductColor[];
  tags: ProductTag[];
}> {
  const [materials, colors, tags] = await Promise.all([
    getProductMaterials(),
    getProductColors(),
    getProductTags(),
  ]);

  return { materials, colors, tags };
}

/**
 * Product with inventory aggregates for a specific warehouse
 */
export interface ProductWithInventory extends ProductWithAttributes {
  in_stock_units: number;
  in_stock_quantity: number;
}

/**
 * Get all products with attributes and inventory aggregates for a specific warehouse
 */
export async function getProductsWithInventory(
  warehouseId: string,
): Promise<ProductWithInventory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
			*,
			product_material_assignments(
				material:product_materials(*)
			),
			product_color_assignments(
				color:product_colors(*)
			),
			product_tag_assignments(
				tag:product_tags(*)
			),
			product_inventory_aggregates!inner(
				in_stock_units,
				in_stock_quantity
			)
		`,
    )
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products with inventory:", error);
    return [];
  }

  return (data || []).map((product: any) => {
    const transformed = transformProductWithAttributes(product);
    const inventory = product.product_inventory_aggregates?.[0];

    return {
      ...transformed,
      in_stock_units: inventory?.in_stock_units || 0,
      in_stock_quantity: inventory?.in_stock_quantity || 0,
    };
  });
}

import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";
import {
  ProductMaterial,
  ProductColor,
  ProductTag,
  ProductInventory,
  ProductListView,
  ProductDetailView,
  ProductWithInventoryListView,
  ProductWithInventoryDetailView,
  ProductUpsertData,
  ProductAttributeAssignmentsRaw,
  ProductFilters,
} from "@/types/products.types";
import { uploadProductImage, deleteProductImagesByUrls } from "@/lib/storage";

// ============================================================================
// NEW SELECT QUERIES - For View types
// ============================================================================

// Select query for ProductListView (minimal fields)
export const PRODUCT_LIST_VIEW_SELECT = `
	id,
	sequence_number,
	name,
	show_on_catalog,
	is_active,
	stock_type,
	measuring_unit,
	product_images,
  min_stock_alert,
  min_stock_threshold,
	product_material_assignments(
		material:product_materials(id, name, color_hex)
	),
	product_color_assignments(
		color:product_colors(id, name, color_hex)
	),
	product_tag_assignments(
		tag:product_tags(id, name, color_hex)
	)
`;

// Select query for ProductDetailView (all fields)
export const PRODUCT_DETAIL_VIEW_SELECT = `
	*,
	product_material_assignments(
		material:product_materials(id, name, color_hex)
	),
	product_color_assignments(
		color:product_colors(id, name, color_hex)
	),
	product_tag_assignments(
		tag:product_tags(id, name, color_hex)
	)
`;

// Select query for ProductWithInventoryListView
export const PRODUCT_WITH_INVENTORY_LIST_VIEW_SELECT = `
	${PRODUCT_LIST_VIEW_SELECT},
	product_inventory_aggregates!inner(in_stock_units, in_stock_quantity, in_stock_value)
`;

// Select query for ProductWithInventoryDetailView
export const PRODUCT_WITH_INVENTORY_DETAIL_VIEW_SELECT = `
	*,
	product_material_assignments(
		material:product_materials(id, name, color_hex)
	),
	product_color_assignments(
		color:product_colors(id, name, color_hex)
	),
	product_tag_assignments(
		tag:product_tags(id, name, color_hex)
	),
	product_inventory_aggregates!inner(*)
`;

// ============================================================================
// LEGACY SELECT QUERIES
// ============================================================================

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

// ============================================================================
// RAW TYPES - For Supabase responses
// ============================================================================

// Raw type for ProductListView query response
export type ProductListViewRaw = Pick<
  Tables<"products">,
  | "id"
  | "sequence_number"
  | "name"
  | "show_on_catalog"
  | "is_active"
  | "stock_type"
  | "measuring_unit"
  | "product_images"
  | "min_stock_alert"
  | "min_stock_threshold"
> &
  ProductAttributeAssignmentsRaw;

// Raw type for ProductDetailView query response
export type ProductDetailViewRaw = Tables<"products"> &
  ProductAttributeAssignmentsRaw;

// Raw type for ProductWithInventoryListView query response
type ProductWithInventoryListViewRaw = ProductListViewRaw & {
  product_inventory_aggregates: Array<
    Pick<
      ProductInventory,
      "in_stock_units" | "in_stock_quantity" | "in_stock_value"
    >
  >;
};

// Raw type for ProductWithInventoryDetailView query response
type ProductWithInventoryDetailViewRaw = ProductDetailViewRaw & {
  product_inventory_aggregates: Array<ProductInventory>;
};

// ============================================================================
// NEW TRANSFORM FUNCTIONS - For View types
// ============================================================================

/**
 * Helper to transform attributes from nested assignments
 */
export function transformAttributes(product: ProductAttributeAssignmentsRaw) {
  const materials = product.product_material_assignments
    .map((a) => a.material)
    .filter((m): m is ProductMaterial => m !== null);
  const colors = product.product_color_assignments
    .map((a) => a.color)
    .filter((c): c is ProductColor => c !== null);
  const tags = product.product_tag_assignments
    .map((a) => a.tag)
    .filter((t): t is ProductTag => t !== null);

  return { materials, colors, tags };
}

/**
 * Transform raw product data to ProductListView
 */
export function transformProductListView(
  product: ProductListViewRaw,
): ProductListView {
  const { materials, colors, tags } = transformAttributes(product);

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
 * Transform raw product data to ProductDetailView
 */
export function transformProductDetailView(
  product: ProductDetailViewRaw,
): ProductDetailView {
  const { materials, colors, tags } = transformAttributes(product);

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
 * Transform raw product data to ProductWithInventoryListView
 */
export function transformProductWithInventoryListView(
  product: ProductWithInventoryListViewRaw,
): ProductWithInventoryListView {
  const { materials, colors, tags } = transformAttributes(product);
  const inventory = product.product_inventory_aggregates?.[0];

  const {
    product_material_assignments: _materials,
    product_color_assignments: _colors,
    product_tag_assignments: _tags,
    product_inventory_aggregates: _inventory,
    ...rest
  } = product;

  return {
    ...rest,
    materials,
    colors,
    tags,
    inventory,
  };
}

/**
 * Transform raw product data to ProductWithInventoryDetailView
 */
export function transformProductWithInventoryDetailView(
  product: ProductWithInventoryDetailViewRaw,
): ProductWithInventoryDetailView {
  const { materials, colors, tags } = transformAttributes(product);
  const inventory = product.product_inventory_aggregates?.[0];

  const {
    product_material_assignments: _materials,
    product_color_assignments: _colors,
    product_tag_assignments: _tags,
    product_inventory_aggregates: _inventory,
    ...rest
  } = product;

  return {
    ...rest,
    materials,
    colors,
    tags,
    inventory,
  };
}

// ============================================================================
// NEW QUERY FUNCTIONS - Using View types
// ============================================================================

/**
 * Get all products (list view with minimal fields)
 */
export async function getProducts(
  filters?: ProductFilters,
): Promise<ProductListView[]> {
  const supabase = createClient();

  let query = supabase
    .from("products")
    .select(PRODUCT_LIST_VIEW_SELECT)
    .is("deleted_at", null);

  // Apply is active
  if (filters?.is_active) {
    query = query.is("is_active", filters.is_active);
  }

  // Apply ordering (defaults to first_name ascending)
  const orderBy = filters?.order_by || "name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  return ((data as unknown as ProductListViewRaw[]) || []).map(
    transformProductListView,
  );
}

/**
 * Get a single product by ID (detail view with all fields)
 */
export async function getProductById(
  productId: string,
): Promise<ProductDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_VIEW_SELECT)
    .eq("id", productId)
    .is("deleted_at", null)
    .single<ProductDetailViewRaw>();

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductDetailView(data);
}

/**
 * Get a single product by sequence number (detail view with all fields)
 */
export async function getProductByNumber(
  sequenceNumber: number,
): Promise<ProductDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_VIEW_SELECT)
    .eq("sequence_number", sequenceNumber)
    .is("deleted_at", null)
    .single<ProductDetailViewRaw>();

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductDetailView(data);
}

/**
 * Get products with inventory (list view) for a specific warehouse
 */
export async function getProductsWithInventory(
  warehouseId: string,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: ProductWithInventoryListView[]; totalCount: number }> {
  const supabase = createClient();

  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_INVENTORY_LIST_VIEW_SELECT, { count: "exact" })
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .range(offset, offset + limit - 1);

  // Apply is active filter
  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  // Apply ordering (defaults to first_name ascending)
  const orderBy = filters?.order_by || "name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  const { data, error, count } = await query;

  if (error) throw error;

  const transformedData = (
    (data as unknown as ProductWithInventoryListViewRaw[]) || []
  ).map(transformProductWithInventoryListView);

  return {
    data: transformedData,
    totalCount: count || 0,
  };
}

/**
 * Get a single product with inventory (detail view) by ID
 */
export async function getProductWithInventoryById(
  productId: string,
  warehouseId: string,
): Promise<ProductWithInventoryDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_INVENTORY_DETAIL_VIEW_SELECT)
    .eq("id", productId)
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .single<ProductWithInventoryDetailViewRaw>();

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductWithInventoryDetailView(data);
}

/**
 * Get a single product with inventory (detail view) by sequence number
 */
export async function getProductWithInventoryByNumber(
  sequenceNumber: number,
  warehouseId: string,
): Promise<ProductWithInventoryDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_INVENTORY_DETAIL_VIEW_SELECT)
    .eq("sequence_number", sequenceNumber)
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .single<ProductWithInventoryDetailViewRaw>();

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductWithInventoryDetailView(data);
}

/**
 * Get all materials (RLS filters by company)
 */
export async function getProductMaterials(): Promise<ProductMaterial[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_materials")
    .select("id, name, color_hex")
    .order("name", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data as ProductMaterial[];
}

/**
 * Get all colors (RLS filters by company)
 */
export async function getProductColors(): Promise<ProductColor[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_colors")
    .select("id, name, color_hex")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching colors:", error);
    return [];
  }

  return data as ProductColor[];
}

/**
 * Get all tags (RLS filters by company)
 */
export async function getProductTags(): Promise<ProductTag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_tags")
    .select("id, name, color_hex")
    .order("name", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data as ProductTag[];
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

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Create a new product material
 */
export async function createProductMaterial(name: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_materials")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("Error creating material:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create material");
  }

  return data.id;
}

/**
 * Create a new product color
 */
export async function createProductColor(name: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_colors")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("Error creating color:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create color");
  }

  return data.id;
}

/**
 * Create a new product tag
 */
export async function createProductTag(name: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_tags")
    .insert({ name })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("Error creating tag:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create tag");
  }

  return data.id;
}

/**
 * Create a new product with attribute assignments
 */
export async function createProduct(
  productData: ProductUpsertData,
  attributeIds: {
    materialIds: string[];
    colorIds: string[];
    tagIds: string[];
  },
): Promise<string> {
  const supabase = createClient();

  // Insert product
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert(productData)
    .select("id")
    .single<{ id: string }>();

  if (productError) {
    console.error("Error creating product:", productError);
    throw productError;
  }

  if (!product) {
    throw new Error("Failed to create product");
  }

  // Insert material assignments
  if (attributeIds.materialIds.length > 0) {
    const materialAssignments = attributeIds.materialIds.map((id) => ({
      product_id: product.id,
      material_id: id,
    }));
    const { error: materialError } = await supabase
      .from("product_material_assignments")
      .insert(materialAssignments);
    if (materialError) {
      console.error("Error inserting materials:", materialError);
      throw materialError;
    }
  }

  // Insert color assignments
  if (attributeIds.colorIds.length > 0) {
    const colorAssignments = attributeIds.colorIds.map((id) => ({
      product_id: product.id,
      color_id: id,
    }));
    const { error: colorError } = await supabase
      .from("product_color_assignments")
      .insert(colorAssignments);
    if (colorError) {
      console.error("Error inserting colors:", colorError);
      throw colorError;
    }
  }

  // Insert tag assignments
  if (attributeIds.tagIds.length > 0) {
    const tagAssignments = attributeIds.tagIds.map((id) => ({
      product_id: product.id,
      tag_id: id,
    }));
    const { error: tagError } = await supabase
      .from("product_tag_assignments")
      .insert(tagAssignments);
    if (tagError) {
      console.error("Error inserting tags:", tagError);
      throw tagError;
    }
  }

  // Fetch and return the complete product with attributes
  return product.id;
}

/**
 * Update an existing product with attribute assignments
 */
export async function updateProduct(
  productId: string,
  productData: ProductUpsertData,
  attributeIds: {
    materialIds: string[];
    colorIds: string[];
    tagIds: string[];
  },
): Promise<string> {
  const supabase = createClient();

  // Update product
  const { data: product, error: productError } = await supabase
    .from("products")
    .update(productData)
    .eq("id", productId)
    .select("id")
    .single<{ id: string }>();

  if (productError) {
    console.error("Error updating product:", productError);
    throw productError;
  }

  if (!product) {
    throw new Error("Failed to update product");
  }

  // Delete old assignments
  await Promise.all([
    supabase
      .from("product_material_assignments")
      .delete()
      .eq("product_id", product.id),
    supabase
      .from("product_color_assignments")
      .delete()
      .eq("product_id", product.id),
    supabase
      .from("product_tag_assignments")
      .delete()
      .eq("product_id", product.id),
  ]);

  // Insert new material assignments
  if (attributeIds.materialIds.length > 0) {
    const materialAssignments = attributeIds.materialIds.map((id) => ({
      product_id: productId,
      material_id: id,
    }));
    const { error: materialError } = await supabase
      .from("product_material_assignments")
      .insert(materialAssignments);
    if (materialError) {
      console.error("Error inserting materials:", materialError);
      throw materialError;
    }
  }

  // Insert new color assignments
  if (attributeIds.colorIds.length > 0) {
    const colorAssignments = attributeIds.colorIds.map((id) => ({
      product_id: productId,
      color_id: id,
    }));
    const { error: colorError } = await supabase
      .from("product_color_assignments")
      .insert(colorAssignments);
    if (colorError) {
      console.error("Error inserting colors:", colorError);
      throw colorError;
    }
  }

  // Insert new tag assignments
  if (attributeIds.tagIds.length > 0) {
    const tagAssignments = attributeIds.tagIds.map((id) => ({
      product_id: productId,
      tag_id: id,
    }));
    const { error: tagError } = await supabase
      .from("product_tag_assignments")
      .insert(tagAssignments);
    if (tagError) {
      console.error("Error inserting tags:", tagError);
      throw tagError;
    }
  }

  // Fetch and return the complete product with attributes
  return product.id;
}

/**
 * Upload product images and return their public URLs
 */
export async function uploadProductImages(
  companyId: string,
  productId: string,
  images: File[],
  offset: number = 0,
): Promise<string[]> {
  const imageUrls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const result = await uploadProductImage(
      companyId,
      productId,
      images[i],
      offset + i,
    );
    imageUrls.push(result.publicUrl);
  }

  return imageUrls;
}

/**
 * Delete product images by URLs
 */
export async function deleteProductImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await deleteProductImagesByUrls(urls);
}

/**
 * Update product's image URLs field
 */
export async function updateProductImagesField(
  productId: string,
  imageUrls: string[],
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("products")
    .update({ product_images: imageUrls })
    .eq("id", productId);

  if (error) {
    console.error("Error updating product images field:", error);
    throw error;
  }
}

/**
 * Toggle product catalog visibility
 */
export async function updateProductCatalogVisibility(
  productId: string,
  value: boolean,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("products")
    .update({ show_on_catalog: value })
    .eq("id", productId);

  if (error) {
    console.error("Error toggling catalog visibility:", error);
    throw error;
  }
}

/**
 * Delete a product (soft delete by setting deleted_at)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

/**
 * Mark a product as inactive
 */
export async function updateProductActiveStatus(
  productId: string,
  value: boolean,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("products")
    .update({ is_active: value })
    .eq("id", productId);

  if (error) {
    console.error("Error marking product as inactive:", error);
    throw error;
  }
}

// ============================================================================
// LOW STOCK PRODUCTS
// ============================================================================

/**
 * Fetch products with low stock (below minimum threshold)
 * Limited to specified number of products
 * Uses RPC function that returns complete product data in a single query
 * Returns products in ProductWithInventoryListView format
 */
export async function getLowStockProducts(
  warehouseId: string,
  limit: number = 5,
): Promise<ProductWithInventoryListView[]> {
  const supabase = createClient();

  // RPC function returns complete product data with materials, colors, tags, and inventory
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc("get_low_stock_products", {
    p_warehouse_id: warehouseId,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching low stock products:", error);
    throw error;
  }

  if (!data) return [];

  // Parse JSONB response directly to ProductWithInventoryListView[]
  return data as ProductWithInventoryListView[];
}

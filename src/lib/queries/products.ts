import { createClient } from "@/lib/supabase/browser";
import type { Database, TablesInsert } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ProductAttribute,
  ProductListView,
  ProductDetailView,
  ProductWithInventoryListView,
  ProductWithInventoryDetailView,
  ProductInventoryView,
  ProductInventoryDetailView,
  ProductUpsertData,
  ProductFilters,
  ProductListViewRaw,
  ProductDetailViewRaw,
  ProductWithInventoryListViewRaw,
  ProductWithInventoryDetailViewRaw,
  ProductInventoryViewRaw,
  ProductInventoryDetailViewRaw,
} from "@/types/products.types";
import type { AttributeGroup } from "@/types/database/enums";
import { uploadProductImage, deleteProductImagesByUrls } from "@/lib/storage";

// Re-export raw types for other modules
export type {
  ProductListViewRaw,
  ProductDetailViewRaw,
  ProductWithInventoryListViewRaw,
  ProductWithInventoryDetailViewRaw,
  ProductInventoryViewRaw,
  ProductInventoryDetailViewRaw,
} from "@/types/products.types";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching products with minimal fields
 */
export const buildProductsQuery = (
  supabase: SupabaseClient<Database>,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 30,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      sequence_number,
      product_code,
      name,
      show_on_catalog,
      is_active,
      stock_type,
      measuring_unit,
      cost_price_per_unit,
      selling_price_per_unit,
      product_images,
      min_stock_alert,
      min_stock_threshold,
      tax_type,
      gst_rate,
      attributes:product_attributes!inner(id, name, group_name, color_hex)
    `,
      { count: "exact" },
    )
    .is("deleted_at", null)
    .range(offset, offset + pageSize - 1);

  if (filters?.is_active) {
    query = query.is("is_active", filters.is_active);
  }

  if (filters?.attributes && filters.attributes.length > 0) {
    filters.attributes.forEach((filter) => {
      query = query.filter("attributes.id", "eq", filter.id);
    });
  }

  const orderBy = filters?.order_by || "name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  return query;
};

/**
 * Query builder for fetching a single product by ID
 */
export const buildProductByIdQuery = (
  supabase: SupabaseClient<Database>,
  productId: string,
) => {
  return supabase
    .from("products")
    .select(
      `
      *,
      attributes:product_attributes!inner(id, name, group_name, color_hex)
    `,
    )
    .eq("id", productId)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching a single product by sequence number
 */
export const buildProductByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: number,
) => {
  return supabase
    .from("products")
    .select(
      `
      *,
      attributes:product_attributes!inner(id, name, group_name, color_hex)
    `,
    )
    .eq("sequence_number", sequenceNumber)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching a single product by product code
 */
export const buildProductByCodeQuery = (
  supabase: SupabaseClient<Database>,
  productCode: string,
) => {
  return supabase
    .from("products")
    .select(
      `
      *,
      attributes:product_attributes!inner(id, name, group_name, color_hex)
    `,
    )
    .eq("product_code", productCode)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching products with inventory
 */
export const buildProductsWithInventoryQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      sequence_number,
      product_code,
      name,
      show_on_catalog,
      is_active,
      stock_type,
      measuring_unit,
      cost_price_per_unit,
      selling_price_per_unit,
      product_images,
      min_stock_alert,
      min_stock_threshold,
      tax_type,
      gst_rate,
      attributes:product_attributes!inner(id, name, group_name, color_hex),
      product_inventory_aggregates!inner(in_stock_units, in_stock_quantity, in_stock_value, pending_qr_units, warehouse_id)
    `,
      { count: "exact" },
    )
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .range(offset, offset + pageSize - 1);

  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  if (filters?.attributes && filters.attributes.length > 0) {
    filters.attributes.forEach((filter) => {
      query = query.filter("attributes.id", "eq", filter.id);
    });
  }

  const orderBy = filters?.order_by || "name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  return query;
};

/**
 * Query builder for fetching a single product with inventory by ID
 */
export const buildProductWithInventoryByIdQuery = (
  supabase: SupabaseClient<Database>,
  productId: string,
  warehouseId: string,
) => {
  return supabase
    .from("products")
    .select(
      `
      *,
      attributes:product_attributes!inner(id, name, group_name, color_hex),
      product_inventory_aggregates!inner(*)
    `,
    )
    .eq("id", productId)
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching a single product with inventory and orders by sequence number
 */
export const buildProductWithInventoryAndOrdersByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: number,
  warehouseId: string,
) => {
  return supabase
    .from("products")
    .select(
      `
      *,
      attributes:product_attributes!inner(id, name, group_name, color_hex),
      product_inventory_aggregates!inner(*),
      product_sales_order_aggregates(*),
      product_purchase_order_aggregates(*)
    `,
    )
    .eq("sequence_number", sequenceNumber)
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching multiple products by IDs
 */
export const buildProductsByIdsQuery = (
  supabase: SupabaseClient<Database>,
  productIds: string[],
) => {
  return supabase
    .from("products")
    .select(
      `
      id,
      sequence_number,
      product_code,
      name,
      show_on_catalog,
      is_active,
      stock_type,
      measuring_unit,
      cost_price_per_unit,
      selling_price_per_unit,
      product_images,
      min_stock_alert,
      min_stock_threshold,
      tax_type,
      gst_rate,
      attributes:product_attributes!inner(id, name, group_name, color_hex)
    `,
    )
    .in("id", productIds)
    .is("deleted_at", null);
};

/**
 * Query builder for fetching multiple products with inventory by IDs
 */
export const buildProductsWithInventoryByIdsQuery = (
  supabase: SupabaseClient<Database>,
  productIds: string[],
  warehouseId: string,
) => {
  return supabase
    .from("products")
    .select(
      `
      id,
      sequence_number,
      product_code,
      name,
      show_on_catalog,
      is_active,
      stock_type,
      measuring_unit,
      cost_price_per_unit,
      selling_price_per_unit,
      product_images,
      min_stock_alert,
      min_stock_threshold,
      tax_type,
      gst_rate,
      attributes:product_attributes!inner(id, name, group_name, color_hex),
      product_inventory_aggregates!inner(in_stock_units, in_stock_quantity, in_stock_value, pending_qr_units, warehouse_id)
    `,
    )
    .in("id", productIds)
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null);
};

/**
 * Query builder for fetching products with inventory and order aggregates (unified query)
 * Used in both products and inventory pages
 * - Products page: shows all products with order data (set has_inventory=false)
 * - Inventory page: shows products with stock > 0 (set has_inventory=true)
 */
export const buildProductsWithInventoryAndOrdersQuery = (
  supabase: SupabaseClient<Database>,
  warehouseId: string,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      sequence_number,
      product_code,
      name,
      show_on_catalog,
      is_active,
      stock_type,
      measuring_unit,
      cost_price_per_unit,
      selling_price_per_unit,
      product_images,
      min_stock_alert,
      min_stock_threshold,
      tax_type,
      gst_rate,
      attributes:product_attributes!inner(id, name, group_name, color_hex),
      product_inventory_aggregates!inner(in_stock_units, in_stock_quantity, in_stock_value, pending_qr_units, warehouse_id),
      product_sales_order_aggregates(active_pending_quantity, active_required_quantity, active_pending_value, active_required_value),
      product_purchase_order_aggregates(active_pending_quantity, active_required_quantity, active_pending_value, active_required_value)
    `,
      { count: "exact" },
    )
    .eq("product_inventory_aggregates.warehouse_id", warehouseId)
    .is("deleted_at", null)
    .range(offset, offset + pageSize - 1);

  // Filter to products with stock > 0 for inventory page
  if (filters?.has_inventory) {
    query = query.gt("product_inventory_aggregates.in_stock_quantity", 0);
  }

  // Filter to products with pending QR codes
  if (filters?.has_pending_qr) {
    query = query.gt("product_inventory_aggregates.pending_qr_units", 0);
  }

  // Filter to low stock products
  if (filters?.is_low_stock) {
    query = query.eq("product_inventory_aggregates.is_low_stock", true);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  if (filters?.attributes && filters.attributes.length > 0) {
    filters.attributes.forEach((filter) => {
      query = query.filter("attributes.id", "eq", filter.id);
    });
  }

  const orderBy = filters?.order_by || "name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  return query;
};

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Helper to transform attributes from nested assignments
 * Groups attributes by group_name into materials, colors, and tags arrays
 */
export function transformAttributes(product: {
  attributes: ProductAttribute[] | null;
}) {
  const allAttributes = (product.attributes || []).filter(
    (attr): attr is ProductAttribute => attr !== null,
  );

  const materials = allAttributes.filter(
    (attr) => attr.group_name === "material",
  );
  const colors = allAttributes.filter((attr) => attr.group_name === "color");
  const tags = allAttributes.filter((attr) => attr.group_name === "tag");

  return { materials, colors, tags };
}

/**
 * Transform raw product data to ProductListView
 */
export function transformProductListView(
  product: ProductListViewRaw,
): ProductListView {
  const { materials, colors, tags } = transformAttributes(product);

  const { attributes: _attributes, ...rest } = product;

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

  const { attributes: _attributes, ...rest } = product;

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
    attributes: _attributes,
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
    attributes: _attributes,
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
 * Transform raw product data to ProductInventoryView (unified transform for list)
 */
export function transformProductInventoryView(
  product: ProductInventoryViewRaw,
): ProductInventoryView {
  const { materials, colors, tags } = transformAttributes(product);
  const inventory = product.product_inventory_aggregates?.[0];
  const sales_orders = product.product_sales_order_aggregates?.[0] || null;
  const purchase_orders =
    product.product_purchase_order_aggregates?.[0] || null;

  const {
    attributes: _attributes,
    product_inventory_aggregates: _inventory,
    product_sales_order_aggregates: _sales,
    product_purchase_order_aggregates: _purchase,
    ...rest
  } = product;

  return {
    ...rest,
    materials,
    colors,
    tags,
    inventory,
    sales_orders,
    purchase_orders,
  };
}

/**
 * Transform raw product data to ProductInventoryDetailView (unified transform for detail)
 */
export function transformProductInventoryDetailView(
  product: ProductInventoryDetailViewRaw,
): ProductInventoryDetailView {
  const { materials, colors, tags } = transformAttributes(product);
  const inventory = product.product_inventory_aggregates?.[0];
  const sales_orders = product.product_sales_order_aggregates?.[0] || null;
  const purchase_orders =
    product.product_purchase_order_aggregates?.[0] || null;

  const {
    attributes: _attributes,
    product_inventory_aggregates: _inventory,
    product_sales_order_aggregates: _sales,
    product_purchase_order_aggregates: _purchase,
    ...rest
  } = product;

  return {
    ...rest,
    materials,
    colors,
    tags,
    inventory,
    sales_orders,
    purchase_orders,
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all products (list view with minimal fields) with pagination
 */
export async function getProducts(
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 30,
): Promise<{ data: ProductListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildProductsQuery(
    supabase,
    filters,
    page,
    pageSize,
  );

  if (error) throw error;

  const transformedData = (data || []).map(transformProductListView);

  return {
    data: transformedData,
    totalCount: count || 0,
  };
}

/**
 * Get a single product by ID (detail view with all fields)
 */
export async function getProductById(
  productId: string,
): Promise<ProductDetailView> {
  const supabase = createClient();
  const { data, error } = await buildProductByIdQuery(supabase, productId);

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
  const { data, error } = await buildProductByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductDetailView(data);
}

/**
 * Get a single product by product code (detail view with all fields)
 */
export async function getProductByCode(
  productCode: string,
): Promise<ProductDetailView> {
  const supabase = createClient();
  const { data, error } = await buildProductByCodeQuery(supabase, productCode);

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
  const { data, error, count } = await buildProductsWithInventoryQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) throw error;

  const transformedData = (data || []).map(
    transformProductWithInventoryListView,
  );

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
  const { data, error } = await buildProductWithInventoryByIdQuery(
    supabase,
    productId,
    warehouseId,
  );

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductWithInventoryDetailView(data);
}

/**
 * Get multiple products (list view) by IDs
 */
export async function getProductsByIds(
  productIds: string[],
): Promise<ProductListView[]> {
  if (productIds.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await buildProductsByIdsQuery(supabase, productIds);

  if (error) throw error;

  const transformedData = (data || []).map(transformProductListView);

  return transformedData;
}

/**
 * Get multiple products with inventory (list view) by IDs
 */
export async function getProductsWithInventoryByIds(
  productIds: string[],
  warehouseId: string,
): Promise<ProductWithInventoryListView[]> {
  if (productIds.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await buildProductsWithInventoryByIdsQuery(
    supabase,
    productIds,
    warehouseId,
  );

  if (error) throw error;

  const transformedData = (data || []).map(
    transformProductWithInventoryListView,
  );

  return transformedData;
}

/**
 * Get a single product with inventory and orders (detail view) by sequence number
 */
export async function getProductWithInventoryAndOrdersByNumber(
  sequenceNumber: number,
  warehouseId: string,
): Promise<ProductInventoryDetailView> {
  const supabase = createClient();
  const { data, error } = await buildProductWithInventoryAndOrdersByNumberQuery(
    supabase,
    sequenceNumber,
    warehouseId,
  );

  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return transformProductInventoryDetailView(data);
}

/**
 * Get products with inventory and order aggregates for inventory page
 * Only includes products with in_stock_quantity > 0
 */
export async function getProductsWithInventoryAndOrders(
  warehouseId: string,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: ProductInventoryView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildProductsWithInventoryAndOrdersQuery(
    supabase,
    warehouseId,
    filters,
    page,
    pageSize,
  );

  if (error) throw error;

  const transformedData = (data || []).map(transformProductInventoryView);

  return {
    data: transformedData,
    totalCount: count || 0,
  };
}

/**
 * Get all attributes, optionally filtered by group_name (RLS filters by company)
 */
export async function getProductAttributes(
  groupName?: AttributeGroup,
): Promise<ProductAttribute[]> {
  const supabase = createClient();

  let query = supabase
    .from("product_attributes")
    .select("id, name, group_name, color_hex")
    .order("name", { ascending: true });

  if (groupName) {
    query = query.eq("group_name", groupName);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching attributes:", error);
    return [];
  }

  return (data as ProductAttribute[]) || [];
}

/**
 * Get all attribute lists in a single call, grouped by type
 */
export async function getProductAttributeLists(): Promise<{
  materials: ProductAttribute[];
  colors: ProductAttribute[];
  tags: ProductAttribute[];
}> {
  const allAttributes = await getProductAttributes();

  const materials = allAttributes.filter(
    (attr) => attr.group_name === "material",
  );
  const colors = allAttributes.filter((attr) => attr.group_name === "color");
  const tags = allAttributes.filter((attr) => attr.group_name === "tag");

  return { materials, colors, tags };
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Create a new product attribute
 */
export async function createProductAttribute(
  name: string,
  groupName: AttributeGroup,
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_attributes")
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

  // Insert product (sequence_number auto-generated by trigger)
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert(productData as TablesInsert<"products">)
    .select("id")
    .single<{ id: string }>();

  if (productError) {
    console.error("Error creating product:", productError);
    throw productError;
  }

  if (!product) {
    throw new Error("Failed to create product");
  }

  // Collect all attribute IDs
  const allAttributeIds = [
    ...attributeIds.materialIds,
    ...attributeIds.colorIds,
    ...attributeIds.tagIds,
  ];

  // Insert attribute assignments
  if (allAttributeIds.length > 0) {
    const attributeAssignments = allAttributeIds.map((id) => ({
      product_id: product.id,
      attribute_id: id,
    }));
    const { error: assignmentError } = await supabase
      .from("product_attribute_assignments")
      .insert(attributeAssignments);
    if (assignmentError) {
      console.error("Error inserting attribute assignments:", assignmentError);
      throw assignmentError;
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
  await supabase
    .from("product_attribute_assignments")
    .delete()
    .eq("product_id", product.id);

  // Collect all attribute IDs
  const allAttributeIds = [
    ...attributeIds.materialIds,
    ...attributeIds.colorIds,
    ...attributeIds.tagIds,
  ];

  // Insert new attribute assignments
  if (allAttributeIds.length > 0) {
    const attributeAssignments = allAttributeIds.map((id) => ({
      product_id: productId,
      attribute_id: id,
    }));
    const { error: assignmentError } = await supabase
      .from("product_attribute_assignments")
      .insert(attributeAssignments);
    if (assignmentError) {
      console.error("Error inserting attribute assignments:", assignmentError);
      throw assignmentError;
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
 * Raw type from get_low_stock_products RPC function (JSONB response)
 */
type LowStockProductRaw = {
  id: string;
  sequence_number: number;
  product_code: string | null;
  name: string;
  show_on_catalog: boolean;
  is_active: boolean;
  stock_type: string;
  measuring_unit: string;
  cost_price_per_unit: number | null;
  selling_price_per_unit: number | null;
  product_images: string[] | null;
  min_stock_alert: boolean;
  min_stock_threshold: number | null;
  tax_type: string;
  gst_rate: number | null;
  inventory: {
    in_stock_units: number;
    in_stock_quantity: number;
    in_stock_value: number;
    pending_qr_units: number | null;
  };
  attributes: Array<{
    id: string;
    name: string;
    group_name: string;
    color_hex: string | null;
  }>;
};

/**
 * Transform RPC JSONB response to ProductWithInventoryListView
 */
function transformLowStockProduct(
  raw: LowStockProductRaw,
): ProductWithInventoryListView {
  // Group attributes by type
  const materials = raw.attributes.filter(
    (attr) => attr.group_name === "material",
  );
  const colors = raw.attributes.filter((attr) => attr.group_name === "color");
  const tags = raw.attributes.filter((attr) => attr.group_name === "tag");

  return {
    id: raw.id,
    sequence_number: raw.sequence_number,
    product_code: raw.product_code,
    name: raw.name,
    show_on_catalog: raw.show_on_catalog,
    is_active: raw.is_active,
    stock_type: raw.stock_type,
    measuring_unit: raw.measuring_unit,
    cost_price_per_unit: raw.cost_price_per_unit,
    selling_price_per_unit: raw.selling_price_per_unit,
    product_images: raw.product_images,
    min_stock_alert: raw.min_stock_alert,
    tax_type: raw.tax_type,
    gst_rate: raw.gst_rate,
    min_stock_threshold: raw.min_stock_threshold,
    materials,
    colors,
    tags,
    inventory: raw.inventory,
  };
}

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
  const { data, error } = await supabase.rpc("get_low_stock_products", {
    p_warehouse_id: warehouseId,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching low stock products:", error);
    throw error;
  }

  if (!data) return [];

  // Transform JSONB response to ProductWithInventoryListView[]
  return (data as LowStockProductRaw[]).map(transformLowStockProduct);
}

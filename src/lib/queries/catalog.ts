import { createClient } from "@/lib/supabase/browser";
import type {
  PublicProduct,
  PublicCompany,
  CatalogConfiguration,
} from "@/types/catalog.types";
import { calculateStockStatus } from "@/lib/utils/product";
import { transformAttributes } from "./products";
import {
  Product,
  ProductAttributeAssignmentsRaw,
  ProductInventory,
} from "@/types/products.types";

// Re-export types for convenience
export type { PublicProduct, PublicCompany } from "@/types/catalog.types";

// Raw type for ProductListView query response
export type ProductListViewRaw = Pick<
  Product,
  | "id"
  | "sequence_number"
  | "name"
  | "stock_type"
  | "measuring_unit"
  | "product_images"
  | "min_stock_threshold"
> & {
  inventory: Array<
    Pick<
      ProductInventory,
      "in_stock_units" | "in_stock_quantity" | "warehouse_id"
    >
  >;
} & ProductAttributeAssignmentsRaw;

/**
 * Get company by slug (public access)
 */
export async function getCompanyBySlug(slug: string): Promise<PublicCompany> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single<PublicCompany>();

  if (error) throw error;
  if (!data) throw new Error("Company not found");

  return data as PublicCompany;
}

/**
 * Get catalog configuration for a company
 */
export async function getCatalogConfiguration(
  companyId: string,
): Promise<CatalogConfiguration> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("catalog_configurations")
    .select("*")
    .eq("company_id", companyId)
    .single<CatalogConfiguration>();

  if (error) throw error;
  if (!data) throw new Error("Catalog configuration not found");

  return data;
}

/**
 * Get public catalog products with stock status
 * This uses anonymous access via RLS policies
 */
export async function getPublicProducts(
  companyId: string,
  warehouseId?: string,
): Promise<PublicProduct[]> {
  const supabase = createClient();

  console.log("Fetching products for company:", companyId);

  // Fetch products that are visible on catalog with materials, colors, and tags
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `
			id,
			sequence_number,
			name,
			stock_type,
			measuring_unit,
			product_images,
			min_stock_threshold,
			inventory:product_inventory_aggregates!product_id(
				in_stock_units,
				in_stock_quantity,
				warehouse_id
			),
			product_attribute_assignments(
				attribute:product_attributes(id, name, group_name, color_hex)
			)
		`,
    )
    .eq("company_id", companyId)
    .eq("show_on_catalog", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  console.log("Products query result:", { products, productsError });

  if (productsError || !products) {
    console.error("Error fetching public products:", productsError);
    return [];
  }

  // Transform products with stock status and flatten attributes
  const publicProducts: PublicProduct[] = (
    (products as unknown as ProductListViewRaw[]) || []
  ).map((product) => {
    // Find inventory for the specified warehouse, or sum across all warehouses
    let totalStock = 0;
    if (product.inventory && Array.isArray(product.inventory)) {
      if (warehouseId) {
        const warehouseInventory = product.inventory.find(
          (inv) => inv.warehouse_id === warehouseId,
        );
        totalStock = Number(warehouseInventory?.in_stock_quantity || 0);
      } else {
        // Sum across all warehouses
        totalStock = product.inventory.reduce(
          (sum: number, inv) => sum + Number(inv.in_stock_quantity || 0),
          0,
        );
      }
    }

    // Calculate stock status using shared utility
    const stockStatus = calculateStockStatus(
      totalStock,
      product.min_stock_threshold,
    );

    // Transform attributes using shared utility
    const { materials, colors, tags } = transformAttributes(product);

    // Remove the nested assignment fields from the product
    const {
      product_attribute_assignments: _attributes,
      inventory: _inventory,
      ...rest
    } = product;

    return {
      ...rest,
      in_stock_quantity: totalStock,
      stock_status: stockStatus,
      materials,
      colors,
      tags,
    };
  });

  return publicProducts;
}

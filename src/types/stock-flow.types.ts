import type { Tables } from "./database/supabase";

type GoodsInward = Tables<"goods_inwards">;
type GoodsOutward = Tables<"goods_outwards">;
type GoodsOutwardItem = Tables<"goods_outward_items">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;
type SalesOrder = Tables<"sales_orders">;
type JobWork = Tables<"job_works">;
type Product = Tables<"products">;
type ProductMaterial = Tables<"product_materials">;
type ProductColor = Tables<"product_colors">;
type ProductTag = Tables<"product_tags">;
type StockUnit = Tables<"stock_units">;

// =====================================================
// FILTERS
// =====================================================

export interface GoodsInwardFilters extends Record<string, unknown> {
  partner_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface GoodsOutwardFilters extends Record<string, unknown> {
  partner_id?: string;
  date_from?: string;
  date_to?: string;
}

// =====================================================
// LIST VIEW TYPES (for list pages)
// =====================================================

export interface GoodsInwardListItem extends GoodsInward {
  partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  stock_units: Array<{
    initial_quantity: number;
    product: Pick<Product, "id" | "name" | "measuring_unit"> | null;
  }>;
}

export interface GoodsOutwardListItem extends GoodsOutward {
  partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  goods_outward_items: Array<{
    quantity_dispatched: number;
    stock_unit: {
      product: Pick<Product, "id" | "name" | "measuring_unit"> | null;
    } | null;
  }>;
}

// =====================================================
// PRODUCT-RELATED TYPES
// =====================================================

/**
 * Product with all assignments (materials, colors, tags)
 */
export interface ProductWithAssignments extends Product {
  product_material_assignments: Array<{
    material: ProductMaterial;
  }>;
  product_color_assignments: Array<{
    color: ProductColor;
  }>;
  product_tag_assignments: Array<{
    tag: ProductTag;
  }>;
}

/**
 * Stock unit with detailed product information
 */
export interface StockUnitWithDetailedProduct extends StockUnit {
  product: ProductWithAssignments | null;
}

/**
 * Goods inward with all related data needed for detail views
 * This is the canonical type used by both queries and components
 *
 * Note: Uses Pick<> to ensure type safety - only fields actually fetched from the query
 */
export interface GoodsInwardWithDetails extends GoodsInward {
  partner: Pick<
    Partner,
    | "first_name"
    | "last_name"
    | "company_name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  agent: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  from_warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  sales_order: Pick<SalesOrder, "sequence_number"> | null;
  job_work: Pick<JobWork, "sequence_number"> | null;
  stock_units: StockUnitWithDetailedProduct[];
}

/**
 * Goods outward item with detailed stock unit and product information
 */
export interface GoodsOutwardItemWithDetailedProduct extends GoodsOutwardItem {
  stock_unit: StockUnitWithDetailedProduct | null;
}

/**
 * Goods outward with all related data needed for detail views
 * This is the canonical type used by both queries and components
 *
 * Note: Uses Pick<> to ensure type safety - only fields actually fetched from the query
 */
export interface GoodsOutwardWithDetails extends GoodsOutward {
  partner: Pick<
    Partner,
    | "first_name"
    | "last_name"
    | "company_name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  agent: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  to_warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  sales_order: Pick<SalesOrder, "sequence_number"> | null;
  job_work: Pick<JobWork, "sequence_number"> | null;
  goods_outward_items: GoodsOutwardItemWithDetailedProduct[];
}

/**
 * Outward item with details for product detail page
 * Shows outward flow history for a specific product
 */
export interface OutwardItemWithDetails extends GoodsOutwardItem {
  outward:
    | (GoodsOutward & {
        partner: Partner | null;
        to_warehouse: Warehouse | null;
      })
    | null;
}

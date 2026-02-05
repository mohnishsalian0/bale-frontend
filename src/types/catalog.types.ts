import type { QueryData } from "@supabase/supabase-js";
import {
  buildPublicProductsQuery,
  buildCompanyBySlugQuery,
  buildCatalogConfigurationQuery,
} from "@/lib/queries/catalog";
import { buildPublicSalesOrderByIdQuery } from "@/lib/queries/catalog-orders";
import type { ProductStockStatus } from "./database/enums";
import type { ProductAttribute } from "./products.types";

// ============================================================================
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw product type inferred from buildPublicProductsQuery
 * Type automatically matches the query - no manual sync needed
 * This is the raw response before transformation
 * Used internally in: getPublicProducts function
 */
export type PublicProductRaw = QueryData<
  ReturnType<typeof buildPublicProductsQuery>
>[number];

/**
 * Public company type inferred from buildCompanyBySlugQuery
 * Type automatically matches the query - no manual sync needed
 * Used in: public catalog pages
 */
export type PublicCompany = QueryData<
  ReturnType<typeof buildCompanyBySlugQuery>
>;

/**
 * Catalog configuration type inferred from buildCatalogConfigurationQuery
 * Type automatically matches the query - no manual sync needed
 * Used in: catalog configuration pages
 */
export type CatalogConfiguration = QueryData<
  ReturnType<typeof buildCatalogConfigurationQuery>
>;

/**
 * Public sales order type inferred from buildPublicSalesOrderByIdQuery
 * Type automatically matches the query - no manual sync needed
 * Used in: order confirmation page
 */
export type PublicSalesOrder = QueryData<
  ReturnType<typeof buildPublicSalesOrderByIdQuery>
>;

/**
 * Public sales order item type extracted from PublicSalesOrder
 * Type automatically matches the query - no manual sync needed
 * Used in: order confirmation page
 */
export type PublicSalesOrderItem =
  PublicSalesOrder["sales_order_items"][number];

// ============================================================================
// PUBLIC  TYPES
// ============================================================================

/**
 * Public product view for catalog pages
 * Transformed from PublicProductRaw with computed fields
 * - Computed: in_stock_quantity (aggregated from inventory)
 * - Computed: stock_status (calculated from stock and threshold)
 * - Flattened: materials, colors, tags (from attributes array)
 * Used in: public catalog, shopping cart, checkout
 */
export interface PublicProduct extends Omit<
  PublicProductRaw,
  "inventory" | "attributes"
> {
  in_stock_quantity: number; // Aggregated from inventory array
  stock_status: ProductStockStatus; // Computed: in_stock | low_stock | out_of_stock
  materials: ProductAttribute[]; // Flattened from attributes where group_name = 'Material'
  colors: ProductAttribute[]; // Flattened from attributes where group_name = 'Color'
  tags: ProductAttribute[]; // Flattened from attributes where group_name = 'Tag'
}

// ============================================================================
// CHECKOUT & ORDER TYPES
// ============================================================================

/**
 * Guest customer checkout form data
 * Used in: catalog checkout flow
 */
export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  gstin: string;
  shippingSameAsBilling: boolean;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingPinCode: string;
  specialInstructions: string;
  termsAccepted: boolean;
}

/**
 * Parameters for creating a catalog order
 * Used in: catalog checkout mutation
 */
export interface CreateCatalogOrderParams {
  companyId: string;
  formData: CheckoutFormData;
  cartItems: Array<{
    product: PublicProduct;
    quantity: number;
  }>;
}

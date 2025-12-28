import type { Tables } from "./database/supabase";
import type { ProductStockStatus } from "./database/enums";
import { Product, ProductAttribute } from "./products.types";

type Company = Tables<"companies">;
type Partner = Tables<"partners">;
type SalesOrder = Tables<"sales_orders">;
type SalesOrderItem = Tables<"sales_order_items">;
export type CatalogConfiguration = Tables<"catalog_configurations">;

// ============================================================================
// PUBLIC  TYPES
// ============================================================================

/**
 * Public company view for catalog pages
 * Includes computed stock status and flattened attributes
 * Used in: public catalog, shopping cart, checkout
 */
export type PublicCompany = Pick<
  Company,
  "id" | "slug" | "name" | "logo_url" | "email" | "phone_number" | "website_url"
>;

/**
 * Public product view for catalog pages
 * Includes computed stock status and flattened attributes
 * Used in: public catalog, shopping cart, checkout
 */
export interface PublicProduct extends Pick<
  Product,
  | "id"
  | "sequence_number"
  | "name"
  | "stock_type"
  | "measuring_unit"
  | "product_images"
  | "min_stock_threshold"
> {
  in_stock_quantity: number; // Aggregated from product_inventory_aggregates
  stock_status: ProductStockStatus; // Computed: in_stock | low_stock | out_of_stock
  materials: ProductAttribute[];
  colors: ProductAttribute[];
  tags: ProductAttribute[];
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
  specialInstructions: string;
  termsAccepted: boolean;
}

/**
 * Sales order item with product details for public order view
 * Used in: order confirmation page
 */
export interface PublicSalesOrderItem extends SalesOrderItem {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "product_images"
    | "measuring_unit"
    | "sequence_number"
    | "stock_type"
  > | null;
}

/**
 * Sales order with details for public order view
 * Used in: order confirmation page
 */
export interface PublicSalesOrder extends SalesOrder {
  customer: Pick<
    Partner,
    | "id"
    | "first_name"
    | "last_name"
    | "email"
    | "phone_number"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "country"
    | "pin_code"
    | "company_name"
    | "gst_number"
    | "display_name"
  > | null;
  sales_order_items: PublicSalesOrderItem[];
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

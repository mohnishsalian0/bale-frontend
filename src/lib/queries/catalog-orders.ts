import { createClient } from "@/lib/supabase/browser";
import type { Database, Tables } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckoutFormData,
  CreateCatalogOrderParams,
  PublicSalesOrder,
} from "@/types/catalog.types";

// Re-export types for convenience
export type { CheckoutFormData, CreateCatalogOrderParams, PublicSalesOrder };

type Partner = Tables<"partners">;
type SalesOrder = Tables<"sales_orders">;

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching a sales order by ID for public catalog
 */
export const buildPublicSalesOrderByIdQuery = (
  supabase: SupabaseClient<Database>,
  companyId: string,
  orderId: string,
) => {
  return supabase
    .from("sales_orders")
    .select(
      `
      *,
      customer:partners!customer_id(
        id,
        first_name,
        last_name,
        display_name,
        email,
        phone_number,
        billing_address_line1,
        billing_address_line2,
        billing_city,
        billing_state,
        billing_country,
        billing_pin_code,
        company_name,
        gst_number
      ),
      sales_order_items(
        *,
        product:products(
          id,
          name,
          product_code,
          product_images,
          measuring_unit,
          sequence_number,
          stock_type
        )
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("id", orderId)
    .single();
};

/**
 * Update existing customer by email or phone, or create a new one
 */
export async function findOrCreateCustomer(
  companyId: string,
  formData: CheckoutFormData,
): Promise<Partner> {
  const supabase = createClient();

  const payload = {
    company_id: companyId,
    partner_type: "customer",
    company_name: `${formData.firstName} ${formData.lastName}`, // Required field
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    phone_number: formData.phone,
    billing_address_line1: formData.addressLine1,
    billing_address_line2: formData.addressLine2 || undefined,
    billing_city: formData.city,
    billing_state: formData.state,
    billing_country: formData.country,
    billing_pin_code: formData.pinCode,
    shipping_same_as_billing: formData.shippingSameAsBilling,
    // If shipping same as billing, store NULL. Otherwise store shipping fields.
    shipping_address_line1: formData.shippingSameAsBilling
      ? null
      : formData.shippingAddressLine1 || undefined,
    shipping_address_line2: formData.shippingSameAsBilling
      ? null
      : formData.shippingAddressLine2 || undefined,
    shipping_city: formData.shippingSameAsBilling
      ? null
      : formData.shippingCity || undefined,
    shipping_state: formData.shippingSameAsBilling
      ? null
      : formData.shippingState || undefined,
    shipping_country: formData.shippingSameAsBilling
      ? null
      : formData.shippingCountry || undefined,
    shipping_pin_code: formData.shippingSameAsBilling
      ? null
      : formData.shippingPinCode || undefined,
    gst_number: formData.gstin || undefined,
    source: "catalog",
    is_guest: true,
  };

  const { data, error } = await supabase
    .from("partners")
    .upsert(payload, {
      onConflict: "company_id,company_name",
      ignoreDuplicates: false,
    })
    .select()
    .single<Partner>();

  if (error) {
    console.error("Customer upsert error:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Create a sales order from catalog checkout using RPC function
 */
export async function createCatalogOrder({
  companyId,
  formData,
  cartItems,
}: CreateCatalogOrderParams): Promise<SalesOrder> {
  const supabase = createClient();

  // Find or create customer
  const customer = await findOrCreateCustomer(companyId, formData);

  // Prepare order data
  const orderData = {
    company_id: companyId, // Explicit for anonymous users
    customer_id: customer.id,
    warehouse_id: undefined, // Will be assigned during approval
    order_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    notes: formData.specialInstructions || undefined,
    source: "catalog",
    status: "approval_pending",
  };

  // Prepare line items
  const lineItems = cartItems.map((item) => ({
    product_id: item.product.id,
    required_quantity: item.quantity,
    unit_rate: 0, // Default to 0, can be set later by admin
  }));

  // Create sales order with items atomically using RPC function
  const { data: orderId, error: orderError } = await supabase.rpc(
    "create_sales_order_with_items",
    {
      p_order_data: orderData,
      p_line_items: lineItems,
    },
  );

  if (orderError) {
    console.error("Error creating sales order:", orderError);
    throw new Error("Failed to create sales order");
  }

  // Fetch the created order to return
  const { data: salesOrder, error: fetchError } = await supabase
    .from("sales_orders")
    .select("*")
    .eq("id", String(orderId))
    .single<SalesOrder>();

  if (fetchError) {
    console.error("Error fetching created sales order:", fetchError);
    throw new Error("Failed to fetch sales order");
  }

  return salesOrder;
}

/**
 * Get sales order by ID (for anonymous confirmation page)
 */
export async function getSalesOrderById(
  companyId: string,
  orderId: string,
): Promise<PublicSalesOrder | null> {
  const supabase = createClient();
  const { data, error } = await buildPublicSalesOrderByIdQuery(
    supabase,
    companyId,
    orderId,
  );

  if (error) {
    console.error("Error fetching sales order:", error);
    return null;
  }

  return data;
}

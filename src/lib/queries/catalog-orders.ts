import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";
import type { CartItem } from "@/contexts/cart-context";

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

type Partner = Tables<"partners">;
type SalesOrder = Tables<"sales_orders">;
type SalesOrderItem = Tables<"sales_order_items">;
type Product = Tables<"products">;

export interface SalesOrderItemWithProduct extends SalesOrderItem {
  product: Product | null;
}

export interface SalesOrderWithDetails extends SalesOrder {
  customer: Partner | null;
  sales_order_items: SalesOrderItemWithProduct[];
}

export interface CreateCatalogOrderParams {
  companyId: string;
  formData: CheckoutFormData;
  cartItems: CartItem[];
}

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
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    phone_number: formData.phone,
    address_line1: formData.addressLine1,
    address_line2: formData.addressLine2 || null,
    city: formData.city,
    state: formData.state,
    country: formData.country,
    pin_code: formData.pinCode,
    gst_number: formData.gstin || null,
    source: "catalog",
    is_guest: true,
  };

  const { data, error } = await supabase
    .from("partners")
    .upsert(payload, {
      onConflict: "company_id,phone_number",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Customer upsert error:", error);
    throw new Error(error.message);
  }

  return data as Partner;
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
    warehouse_id: null, // Will be assigned during approval
    order_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    notes: formData.specialInstructions || null,
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
    .eq("id", orderId)
    .single();

  if (fetchError) {
    console.error("Error fetching created sales order:", fetchError);
    throw new Error("Failed to fetch sales order");
  }

  return salesOrder as SalesOrder;
}

/**
 * Get sales order by ID (for anonymous confirmation page)
 */
export async function getSalesOrderById(
  companyId: string,
  orderId: string,
): Promise<SalesOrderWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:partners!customer_id(*),
			sales_order_items(
				*,
				product:products(*)
			)
		`,
    )
    .eq("company_id", companyId)
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching sales order:", error);
    return null;
  }

  return data as SalesOrderWithDetails;
}

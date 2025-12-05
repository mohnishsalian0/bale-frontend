import { createClient } from "@/lib/supabase/browser";
import type {
  SalesOrderListView,
  SalesOrderDetailView,
  SalesOrderFilters,
  CreateSalesOrderData,
  CreateSalesOrderLineItem,
  UpdateSalesOrderData,
  CancelSalesOrderData,
  CompleteSalesOrderData,
} from "@/types/sales-orders.types";

// Re-export types for convenience
export type {
  SalesOrderListView,
  SalesOrderDetailView,
  SalesOrderFilters,
  CreateSalesOrderData,
  CreateSalesOrderLineItem,
  UpdateSalesOrderData,
  CancelSalesOrderData,
  CompleteSalesOrderData,
};

/**
 * Fetch sales orders for a warehouse with optional filters
 *
 * Examples:
 * - All orders: getSalesOrders(warehouseId)
 * - Pending orders: getSalesOrders(warehouseId, { status: 'approval_pending' })
 * - Active orders: getSalesOrders(warehouseId, { status: ['approval_pending', 'in_progress'] })
 * - Recent orders: getSalesOrders(warehouseId, { order_by: 'order_date', order_direction: 'desc', limit: 5 })
 */
export async function getSalesOrders(
  warehouseId: string | null,
  filters?: SalesOrderFilters,
): Promise<SalesOrderListView[]> {
  const supabase = createClient();

  let query = supabase
    .from("sales_orders")
    .select(
      `
        *,
        customer:customer_id(
          id, first_name, last_name, company_name
        ),
        agent:agent_id(
          id, first_name, last_name, company_name
        ),
        sales_order_items(
          *,
          product:product_id(
            id, name, stock_type, measuring_unit, product_images, sequence_number
          )
        )
      `,
    )
    .is("deleted_at", null);

  // Apply warehouse filter
  if (warehouseId) {
    query = query.or(`warehouse_id.eq.${warehouseId},warehouse_id.is.null`);
  }

  // Apply status filter (supports single value or array)
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  // Apply ordering (defaults to order_date descending)
  const orderBy = filters?.order_by || "order_date";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  // Apply limit
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) throw new Error("No data returned");

  return data as SalesOrderListView[];
}

/**
 * Fetch sales orders for a customer (for partner detail page)
 */
export async function getSalesOrdersByCustomer(
  customerId: string,
): Promise<SalesOrderListView[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:customer_id(
				id, first_name, last_name, company_name
			),
			agent:agent_id(
				id, first_name, last_name, company_name
			),
			sales_order_items(
				*,
				product:product_id(id, name, stock_type, measuring_unit, product_images, sequence_number)
			)
		`,
    )
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("order_date", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data as SalesOrderListView[];
}

/**
 * Fetch a single sales order by sequence number
 */
export async function getSalesOrderByNumber(
  sequenceNumber: string,
): Promise<SalesOrderDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:customer_id(*),
			agent:agent_id(
				id, first_name, last_name, company_name
			),
			warehouse:warehouse_id(*),
			sales_order_items(
				*,
				product:product_id(
					id,
					name,
					stock_type,
					measuring_unit,
					product_images,
					sequence_number,
					materials:product_material_assignments(
						material:material_id(*)
					),
					colors:product_color_assignments(
						color:color_id(*)
					),
					tags:product_tag_assignments(
						tag:tag_id(*)
					)
				)
			)
		`,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .is("deleted_at", null)
    .single<SalesOrderDetailView>();

  if (error) throw error;
  if (!data) throw new Error("Order not found");

  return data;
}

/**
 * Create a new sales order with line items
 */
export async function createSalesOrder(
  orderData: CreateSalesOrderData,
  lineItems: CreateSalesOrderLineItem[],
): Promise<string> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: orderId, error } = await supabase.rpc(
    "create_sales_order_with_items",
    {
      p_order_data: orderData,
      p_line_items: lineItems,
    },
  );

  if (error) throw error;
  if (!orderId) throw new Error("No order ID returned");

  return orderId as string;
}

/**
 * Approve and update a sales order with new data and line items
 * Uses RPC function for atomic transaction with validation
 */
export async function approveSalesOrder(
  orderId: string,
  orderData: UpdateSalesOrderData,
  lineItems: CreateSalesOrderLineItem[],
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("approve_sales_order_with_items", {
    p_order_id: orderId,
    p_order_data: orderData,
    p_line_items: lineItems,
  });

  if (error) throw error;
}

/**
 * Cancel a sales order with reason
 */
export async function cancelSalesOrder(
  orderId: string,
  cancelData: CancelSalesOrderData,
): Promise<void> {
  const supabase = createClient();

  if (!cancelData.reason || cancelData.reason.trim() === "") {
    throw new Error("Cancellation reason is required");
  }

  // Get current user ID for status tracking
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("sales_orders")
    .update({
      status: "cancelled",
      status_notes: cancelData.reason,
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Complete a sales order with optional notes
 */
export async function completeSalesOrder(
  orderId: string,
  completeData: CompleteSalesOrderData,
): Promise<void> {
  const supabase = createClient();

  // Get current user ID for status tracking
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("sales_orders")
    .update({
      status: "completed",
      status_notes: completeData.notes || null,
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .eq("id", orderId);

  if (error) throw error;
}

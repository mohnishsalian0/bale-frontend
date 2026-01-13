import { createClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SalesOrderFilters,
  SalesOrderListView,
  SalesOrderDetailView,
  CreateSalesOrderData,
  CreateSalesOrderLineItem,
  UpdateSalesOrderData,
  CancelSalesOrderData,
  CompleteSalesOrderData,
  SalesOrderUpdate,
} from "@/types/sales-orders.types";

// Re-export types for convenience
export type {
  SalesOrderFilters,
  SalesOrderListView,
  SalesOrderDetailView,
  CreateSalesOrderData,
  CreateSalesOrderLineItem,
  UpdateSalesOrderData,
  CancelSalesOrderData,
  CompleteSalesOrderData,
  SalesOrderUpdate,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching sales orders with optional filters and pagination
 */
export const buildSalesOrdersQuery = (
  supabase: SupabaseClient<Database>,
  filters?: SalesOrderFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  // Calculate pagination range
  const offset = (page - 1) * pageSize;
  const limit = filters?.limit ? filters.limit : pageSize;

  let query = supabase
    .from("sales_orders")
    .select(
      `
        *,
        customer:partners!customer_id(
          id, first_name, last_name, display_name, company_name
        ),
        agent:partners!agent_id(
          id, first_name, last_name, display_name, company_name
        ),
        sales_order_items!inner(
          *,
          product:products!product_id!inner(
            id, name, stock_type, measuring_unit, product_images, sequence_number, product_code
          )
        )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  // Apply warehouse filter
  if (filters?.warehouseId) {
    query = query.or(
      `warehouse_id.eq.${filters.warehouseId},warehouse_id.is.null`,
    );
  }

  // Apply status filter (supports single value or array)
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      if (filters.status === "overdue") {
        query = query.eq("status", "in_progress");
        query = query.lt("delivery_due_date", new Date().toISOString());
      } else {
        query = query.eq("status", filters.status);
      }
    }
  }

  // Filter by customer if provided
  if (filters?.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }

  // Filter by agent if provided
  if (filters?.agentId) {
    query = query.eq("agent_id", filters.agentId);
  }

  // Filter by product if provided
  if (filters?.productId) {
    query = query.eq("sales_order_items.product.id", filters.productId);
  }

  // Apply full-text search filter
  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  // Apply date range filter
  if (filters?.date_from) {
    query = query.gte("order_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("order_date", filters.date_to);
  }

  // Apply ordering (defaults to order_date descending)
  const orderBy = filters?.order_by || "order_date";
  const ascending = !!filters?.ascending;
  query = query.order(orderBy, { ascending });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  return query;
};

/**
 * Query builder for fetching a single sales order by sequence number
 */
export const buildSalesOrderByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:partners!customer_id(
				*,
				ledger:ledgers!partner_id(id, name)
			),
			agent:partners!agent_id(
				id, first_name, last_name, display_name, company_name
			),
			warehouse:warehouses!warehouse_id(*),
			sales_order_items(
				*,
				product:products!product_id(
          id,
          name,
          stock_type,
          measuring_unit,
          product_images,
          product_code,
          sequence_number
        )
			)
		`,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching a single sales order by ID
 */
export const buildSalesOrderByIdQuery = (
  supabase: SupabaseClient<Database>,
  orderId: string,
) => {
  return supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:partners!customer_id(
				*,
				ledger:ledgers!partner_id(id, name)
			),
			agent:partners!agent_id(
				id, first_name, last_name, display_name, company_name
			),
			warehouse:warehouses!warehouse_id(*),
			sales_order_items(
				*,
				product:products!product_id(
          id,
          name,
          stock_type,
          measuring_unit,
          product_images,
          product_code,
          sequence_number
        )
			)
		`,
    )
    .eq("id", orderId)
    .is("deleted_at", null)
    .single();
};

// ============================================================================
// QUERIES
// ============================================================================

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
  filters?: SalesOrderFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: SalesOrderListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildSalesOrdersQuery(
    supabase,
    filters,
    page,
    pageSize,
  );

  if (error) throw error;

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single sales order by sequence number
 */
export async function getSalesOrderByNumber(
  sequenceNumber: string,
): Promise<SalesOrderDetailView> {
  const supabase = createClient();
  const { data, error } = await buildSalesOrderByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("Order not found");

  return data;
}

/**
 * Fetch a single sales order by ID (UUID)
 */
export async function getSalesOrderById(
  orderId: string,
): Promise<SalesOrderDetailView> {
  const supabase = createClient();
  const { data, error } = await buildSalesOrderByIdQuery(supabase, orderId);

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
): Promise<number> {
  const supabase = createClient();

  const { data: sequenceNumber, error } = await supabase.rpc(
    "create_sales_order_with_items",
    {
      p_order_data: orderData as unknown as Json,
      p_line_items: lineItems as unknown as Json[],
    },
  );

  if (error) throw error;
  if (!sequenceNumber) throw new Error("No sequence number returned");

  return sequenceNumber as number;
}

/**
 * Create a quick sales order (sales order + goods outward) atomically
 * Used when customer visits store and collects items immediately
 */
export async function createQuickSalesOrder(
  orderData: CreateSalesOrderData,
  orderItems: CreateSalesOrderLineItem[],
  stockUnitItems: Array<{
    stock_unit_id: string;
    quantity: number;
  }>,
): Promise<number> {
  const supabase = createClient();

  const { data: sequenceNumber, error } = await supabase.rpc(
    "quick_order_with_outward",
    {
      p_order_data: orderData as unknown as Json,
      p_order_items: orderItems as unknown as Json[],
      p_stock_unit_items: stockUnitItems,
    },
  );

  if (error) {
    console.error("Error creating quick sales order:", error);
    throw error;
  }
  if (!sequenceNumber) throw new Error("No sequence number returned");

  return sequenceNumber as number;
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
    p_order_data: orderData as unknown as Json[],
    p_line_items: lineItems as unknown as Json[],
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

/**
 * Update sales order fields (generic update for any fields)
 */
export async function updateSalesOrder(
  orderId: string,
  data: Partial<SalesOrderUpdate>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("sales_orders")
    .update(data)
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Update line items for a sales order (only when in approval_pending status)
 * Deletes all existing items and inserts new ones in a transaction
 * @deprecated Use updateSalesOrderWithItems instead for atomic updates
 */
export async function updateSalesOrderLineItems(
  orderId: string,
  lineItems: CreateSalesOrderLineItem[],
): Promise<void> {
  const supabase = createClient();

  if (lineItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  // Delete all existing line items
  const { error: deleteError } = await supabase
    .from("sales_order_items")
    .delete()
    .eq("sales_order_id", orderId);

  if (deleteError) throw deleteError;

  // Insert new line items
  const lineItemsToInsert = lineItems.map((item) => ({
    sales_order_id: orderId,
    product_id: item.product_id,
    required_quantity: item.required_quantity,
    unit_rate: item.unit_rate,
    dispatched_quantity: 0,
  }));

  const { error: insertError } = await supabase
    .from("sales_order_items")
    .insert(lineItemsToInsert);

  if (insertError) throw insertError;
}

/**
 * Update sales order with items atomically via RPC function
 * Validates business rules (approval_pending status, no outward records)
 * Deletes old items and inserts new ones in a single transaction
 */
export async function updateSalesOrderWithItems(
  orderId: string,
  orderData: UpdateSalesOrderData,
  lineItems: CreateSalesOrderLineItem[],
): Promise<void> {
  const supabase = createClient();

  if (lineItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  const { error } = await supabase.rpc("update_sales_order_with_items", {
    p_order_id: orderId,
    p_order_data: orderData as unknown as Json,
    p_line_items: lineItems as unknown as Json[],
  });

  if (error) throw error;
}

/**
 * Delete sales order (soft delete)
 */
export async function deleteSalesOrder(orderId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("sales_orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

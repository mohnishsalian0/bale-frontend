import { createClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PurchaseOrderFilters,
  PurchaseOrderListView,
  PurchaseOrderDetailView,
  CreatePurchaseOrderData,
  CreatePurchaseOrderLineItem,
  UpdatePurchaseOrderData,
  CancelPurchaseOrderData,
  CompletePurchaseOrderData,
  PurchaseOrder,
} from "@/types/purchase-orders.types";

// Re-export types for convenience
export type {
  PurchaseOrderFilters,
  PurchaseOrderListView,
  PurchaseOrderDetailView,
  CreatePurchaseOrderData,
  CreatePurchaseOrderLineItem,
  UpdatePurchaseOrderData,
  CancelPurchaseOrderData,
  CompletePurchaseOrderData,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching purchase orders with optional filters and pagination
 */
export const buildPurchaseOrdersQuery = (
  supabase: SupabaseClient<Database>,
  filters?: PurchaseOrderFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;
  const limit = filters?.limit ? filters.limit : pageSize;

  let query = supabase
    .from("purchase_orders")
    .select(
      `
        *,
        supplier:partners!supplier_id(
          id, first_name, last_name, display_name, company_name
        ),
        agent:partners!agent_id(
          id, first_name, last_name, display_name, company_name
        ),
        purchase_order_items!inner(
          *,
          product:products!product_id!inner(
            id, name, stock_type, measuring_unit, product_images, sequence_number, product_code
          )
        )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (filters?.warehouseId) {
    query = query.or(
      `warehouse_id.eq.${filters.warehouseId},warehouse_id.is.null`,
    );
  }

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

  if (filters?.supplierId) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  if (filters?.agentId) {
    query = query.eq("agent_id", filters.agentId);
  }

  if (filters?.productId) {
    query = query.eq("purchase_order_items.product.id", filters.productId);
  }

  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  if (filters?.date_from) {
    query = query.gte("order_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("order_date", filters.date_to);
  }

  const orderBy = filters?.order_by || "order_date";
  const ascending = !!filters?.ascending;
  query = query.order(orderBy, { ascending });

  query = query.range(offset, offset + limit - 1);

  return query;
};

/**
 * Query builder for fetching a single purchase order by sequence number
 */
export const buildPurchaseOrderByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("purchase_orders")
    .select(
      `
			*,
			supplier:partners!supplier_id(
				*,
				ledger:ledgers!partner_id(id, name)
			),
			agent:partners!agent_id(
				id, first_name, last_name, display_name, company_name
			),
			warehouse:warehouses!warehouse_id(*),
			purchase_order_items(
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
 * Query builder for fetching a single purchase order by ID
 */
export const buildPurchaseOrderByIdQuery = (
  supabase: SupabaseClient<Database>,
  orderId: string,
) => {
  return supabase
    .from("purchase_orders")
    .select(
      `
			*,
			supplier:partners!supplier_id(
				*,
				ledger:ledgers!partner_id(id, name)
			),
			agent:partners!agent_id(
				id, first_name, last_name, display_name, company_name
			),
			warehouse:warehouses!warehouse_id(*),
			purchase_order_items(
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
 * Fetch purchase orders for a warehouse with optional filters
 */
export async function getPurchaseOrders(
  filters?: PurchaseOrderFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: PurchaseOrderListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildPurchaseOrdersQuery(
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
 * Fetch a single purchase order by sequence number
 */
export async function getPurchaseOrderByNumber(
  sequenceNumber: string,
): Promise<PurchaseOrderDetailView> {
  const supabase = createClient();
  const { data, error } = await buildPurchaseOrderByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("Order not found");

  return data;
}

/**
 * Fetch a single purchase order by ID (UUID)
 */
export async function getPurchaseOrderById(
  orderId: string,
): Promise<PurchaseOrderDetailView> {
  const supabase = createClient();
  const { data, error } = await buildPurchaseOrderByIdQuery(supabase, orderId);

  if (error) throw error;
  if (!data) throw new Error("Order not found");

  return data;
}

/**
 * Create a new purchase order with line items
 */
export async function createPurchaseOrder(
  orderData: CreatePurchaseOrderData,
  lineItems: CreatePurchaseOrderLineItem[],
): Promise<number> {
  const supabase = createClient();

  const { data: sequenceNumber, error } = await supabase.rpc(
    "create_purchase_order_with_items",
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
 * Approve and update a purchase order with new data and line items
 * Uses RPC function for atomic transaction with validation
 */
export async function approvePurchaseOrder(
  orderId: string,
  orderData: UpdatePurchaseOrderData,
  lineItems: CreatePurchaseOrderLineItem[],
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("approve_purchase_order_with_items", {
    p_order_id: orderId,
    p_order_data: orderData as unknown as Json,
    p_line_items: lineItems as unknown as Json[],
  });

  if (error) throw error;
}

/**
 * Cancel a purchase order with reason
 */
export async function cancelPurchaseOrder(
  orderId: string,
  cancelData: CancelPurchaseOrderData,
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
    .from("purchase_orders")
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
 * Complete a purchase order with optional notes
 */
export async function completePurchaseOrder(
  orderId: string,
  completeData: CompletePurchaseOrderData,
): Promise<void> {
  const supabase = createClient();

  // Get current user ID for status tracking
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("purchase_orders")
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
 * Update purchase order fields (generic update for any fields)
 */
export async function updatePurchaseOrder(
  orderId: string,
  data: Partial<PurchaseOrder>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("purchase_orders")
    .update(data)
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Update line items for a purchase order (only when in approval_pending status)
 * Deletes all existing items and inserts new ones in a transaction
 * @deprecated Use updatePurchaseOrderWithItems instead for atomic updates
 */
export async function updatePurchaseOrderLineItems(
  orderId: string,
  lineItems: CreatePurchaseOrderLineItem[],
): Promise<void> {
  const supabase = createClient();

  if (lineItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  // Delete all existing line items
  const { error: deleteError } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("purchase_order_id", orderId);

  if (deleteError) throw deleteError;

  // Insert new line items
  const lineItemsToInsert = lineItems.map((item) => ({
    purchase_order_id: orderId,
    product_id: item.product_id,
    required_quantity: item.required_quantity,
    unit_rate: item.unit_rate,
    received_quantity: 0,
  }));

  const { error: insertError } = await supabase
    .from("purchase_order_items")
    .insert(lineItemsToInsert);

  if (insertError) throw insertError;
}

/**
 * Update purchase order with items atomically via RPC function
 * Validates business rules (approval_pending status, no inward records)
 * Deletes old items and inserts new ones in a single transaction
 */
export async function updatePurchaseOrderWithItems(
  orderId: string,
  orderData: UpdatePurchaseOrderData,
  lineItems: CreatePurchaseOrderLineItem[],
): Promise<void> {
  const supabase = createClient();

  if (lineItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  const { error } = await supabase.rpc("update_purchase_order_with_items", {
    p_order_id: orderId,
    p_order_data: orderData as unknown as Json,
    p_line_items: lineItems as unknown as Json[],
  });

  if (error) throw error;
}

/**
 * Delete purchase order (soft delete)
 */
export async function deletePurchaseOrder(orderId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("purchase_orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

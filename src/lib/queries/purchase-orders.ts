import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";
import type {
  PurchaseOrderListView,
  PurchaseOrderDetailView,
  PurchaseOrderItemDetailView,
  PurchaseOrderFilters,
  CreatePurchaseOrderData,
  CreatePurchaseOrderLineItem,
  UpdatePurchaseOrderData,
  CancelPurchaseOrderData,
  CompletePurchaseOrderData,
} from "@/types/purchase-orders.types";
import type { ProductAttributeAssignmentsRaw } from "@/types/products.types";
import { transformAttributes } from "./products";

// Re-export types for convenience
export type {
  PurchaseOrderListView,
  PurchaseOrderDetailView,
  PurchaseOrderFilters,
  CreatePurchaseOrderData,
  CreatePurchaseOrderLineItem,
  UpdatePurchaseOrderData,
  CancelPurchaseOrderData,
  CompletePurchaseOrderData,
};

// ============================================================================
// RAW TYPES - For Supabase responses
// ============================================================================

/**
 * Raw type for purchase order item in detail view
 * Includes nested product with attribute assignments
 */
type PurchaseOrderItemDetailViewRaw = Tables<"purchase_order_items"> & {
  product:
    | (Pick<
        Tables<"products">,
        | "id"
        | "name"
        | "stock_type"
        | "measuring_unit"
        | "product_images"
        | "sequence_number"
      > &
        ProductAttributeAssignmentsRaw)
    | null;
};

/**
 * Raw type for purchase order detail view
 * Includes nested supplier, agent, warehouse, and items with raw attributes
 */
type PurchaseOrderDetailViewRaw = Tables<"purchase_orders"> & {
  supplier: Tables<"partners"> | null;
  agent: Pick<
    Tables<"partners">,
    "id" | "first_name" | "last_name" | "company_name"
  > | null;
  warehouse: Tables<"warehouses"> | null;
  purchase_order_items: PurchaseOrderItemDetailViewRaw[];
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch purchase orders for a warehouse with optional filters
 *
 * Examples:
 * - All orders: getPurchaseOrders(warehouseId)
 * - Pending orders: getPurchaseOrders(warehouseId, { status: 'approval_pending' })
 * - Active orders: getPurchaseOrders(warehouseId, { status: ['approval_pending', 'in_progress'] })
 * - Recent orders: getPurchaseOrders(warehouseId, { order_by: 'order_date', order_direction: 'desc', limit: 5 })
 */
export async function getPurchaseOrders(
  filters?: PurchaseOrderFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: PurchaseOrderListView[]; totalCount: number }> {
  const supabase = createClient();

  // Calculate pagination range.
  // NOTE: Filter limit takes precedence over pageSize
  const offset = (page - 1) * pageSize;
  const limit = filters?.limit ? filters.limit : pageSize;

  let query = supabase
    .from("purchase_orders")
    .select(
      `
        *,
        supplier:supplier_id(
          id, first_name, last_name, company_name
        ),
        agent:agent_id(
          id, first_name, last_name, company_name
        ),
        purchase_order_items!inner(
          *,
          product:product_id!inner(
            id, name, stock_type, measuring_unit, product_images, sequence_number
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
        query = query.lt("expected_delivery_date", new Date().toISOString());
      } else {
        query = query.eq("status", filters.status);
      }
    }
  }

  // Filter by supplier if provided
  if (filters?.supplierId) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  // Filter by agent if provided
  if (filters?.agentId) {
    query = query.eq("agent_id", filters.agentId);
  }

  // Filter by product if provided
  if (filters?.productId) {
    query = query.eq("purchase_order_items.product.id", filters.productId);
  }

  // Apply full-text search filter
  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  // Apply ordering (defaults to order_date descending)
  const orderBy = filters?.order_by || "order_date";
  const ascending = !!filters?.ascending;
  query = query.order(orderBy, { ascending });

  // Apply pagination (ignore filters.limit if provided, use page-based pagination)
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data as PurchaseOrderListView[]) || [],
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

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `
			*,
			supplier:supplier_id(*),
			agent:agent_id(
				id, first_name, last_name, company_name
			),
			warehouse:warehouse_id(*),
			purchase_order_items(
				*,
				product:product_id(
					id,
					name,
					stock_type,
					measuring_unit,
					product_images,
					sequence_number,
					attributes:product_attributes!inner(id, name, group_name, color_hex)
				)
			)
		`,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .is("deleted_at", null)
    .single<PurchaseOrderDetailViewRaw>();

  if (error) throw error;
  if (!data) throw new Error("Order not found");

  // Transform purchase order items to flatten attributes
  const transformedItems: PurchaseOrderItemDetailView[] =
    data.purchase_order_items.map((item) => {
      if (!item.product) {
        return { ...item, product: null };
      }

      // Transform attributes using shared utility
      const { materials, colors, tags } = transformAttributes(item.product);

      // Remove nested assignments field
      const { attributes: _attributes, ...productRest } = item.product;

      return {
        ...item,
        product: {
          ...productRest,
          materials,
          colors,
          tags,
        },
      };
    });

  // Return transformed purchase order
  return {
    ...data,
    purchase_order_items: transformedItems,
  };
}

/**
 * Create a new purchase order with line items
 */
export async function createPurchaseOrder(
  orderData: CreatePurchaseOrderData,
  lineItems: CreatePurchaseOrderLineItem[],
): Promise<number> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: sequenceNumber, error } = await supabase.rpc(
    "create_purchase_order_with_items",
    {
      p_order_data: orderData,
      p_line_items: lineItems,
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
    p_order_data: orderData,
    p_line_items: lineItems,
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

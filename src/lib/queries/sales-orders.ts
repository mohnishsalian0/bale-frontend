import { createClient } from "@/lib/supabase/browser";
import type {
  SalesOrderListView,
  SalesOrderDetailView,
  CreateSalesOrderData,
  CreateSalesOrderLineItem,
} from "@/types/sales-orders.types";

// Re-export types for convenience
export type {
  SalesOrderListView,
  SalesOrderDetailView,
  CreateSalesOrderData,
  CreateSalesOrderLineItem,
};

/**
 * Fetch all sales orders for a warehouse
 */
export async function getSalesOrders(
  warehouseId: string | null,
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
            id, name, measuring_unit, product_images, sequence_number
          )
        )
      `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (warehouseId) {
    query = query.or(`warehouse_id.eq.${warehouseId},warehouse_id.is.null`);
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
				product:product_id(id, name, measuring_unit, product_images, sequence_number)
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
export async function getSalesOrderBySequenceNumber(
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
					measuring_unit,
					product_images,
					sequence_number,
					stock_type,
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

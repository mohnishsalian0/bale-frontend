import { createClient } from "@/lib/supabase/client";
import type {
  SalesOrderListView,
  SalesOrderDetailView,
} from "@/types/sales-orders.types";

// Re-export types for convenience
export type { SalesOrderListView, SalesOrderDetailView };

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
export async function getSalesOrder(
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
    .single();

  if (error) throw error;
  if (!data) throw new Error("Order not found");

  // Transform Supabase's array format to single objects
  return data as SalesOrderDetailView;
}

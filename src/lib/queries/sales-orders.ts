import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/supabase";

type SalesOrder = Tables<"sales_orders">;
type Partner = Tables<"partners">;
type Product = Tables<"products">;
type SalesOrderItem = Tables<"sales_order_items">;

export interface SalesOrderWithDetails extends SalesOrder {
  customer: Partner | null;
  agent: Partner | null;
  sales_order_items: Array<
    SalesOrderItem & {
      product: Product | null;
    }
  >;
}

/**
 * Fetch all sales orders for a warehouse
 */
export async function getSalesOrders(
  warehouseId: string | null,
): Promise<SalesOrderWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:partners!sales_orders_customer_id_fkey(
				id, first_name, last_name, company_name
			),
			agent:partners!sales_orders_agent_id_fkey(
				id, first_name, last_name, company_name
			),
			sales_order_items(
				id,
				required_quantity,
				dispatched_quantity,
				pending_quantity,
				product:products(name)
			)
		`,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Filter by warehouse if provided
  if (warehouseId) {
    query = query.or(`warehouse_id.eq.${warehouseId},warehouse_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) throw new Error("No data returned");

  return data as SalesOrderWithDetails[];
}

/**
 * Fetch pending sales orders for a customer (for partner detail page)
 */
export async function getPendingSalesOrdersByCustomer(
  customerId: string,
): Promise<SalesOrderWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      `
			*,
			expected_delivery_date,
			sales_order_items(
				id, product_id, required_quantity, dispatched_quantity,
				pending_quantity, unit_rate, line_total,
				product:products(
					id, name, measuring_unit,
					product_images, sequence_number
				)
			)
		`,
    )
    .eq("customer_id", customerId)
    .in("status", ["in_progress", "approval_pending"])
    .is("deleted_at", null)
    .order("order_date", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data as SalesOrderWithDetails[]) || [];
}

/**
 * Fetch a single sales order by sequence number
 */
export async function getSalesOrder(sequenceNumber: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      `
			*,
			customer:partners!sales_orders_customer_id_fkey(
				id, first_name, last_name, company_name,
				phone_number, email, address_line1, address_line2,
				city, state, pin_code
			),
			agent:partners!sales_orders_agent_id_fkey(
				id, first_name, last_name, company_name
			),
			warehouse:warehouses(id, name, address_line1, address_line2, city, state, pin_code),
			sales_order_items(
				id, product_id, required_quantity, dispatched_quantity,
				pending_quantity, unit_rate, line_total, notes,
				product:products(
					id, name, measuring_unit, product_images, sequence_number,
					product_material_assignments(
						material:product_materials(*)
					),
					product_color_assignments(
						color:product_colors(*)
					),
					product_tag_assignments(
						tag:product_tags(*)
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

  return data;
}

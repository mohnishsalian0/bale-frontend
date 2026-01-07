import { createClient } from "@/lib/supabase/browser";
import type {
  InvoiceAggregateFilters,
  InvoiceAggregateResult,
  OrderAggregateFilters,
  OrderAggregateResult,
  InventoryAggregateFilters,
  InventoryAggregateResult,
} from "@/types/aggregates.types";
import type { MeasuringUnit } from "@/types/database/enums";
import type { Database } from "@/types/database/supabase";

// =====================================================
// INVOICE AGGREGATES
// =====================================================

/**
 * Get invoice aggregates (count and outstanding amount)
 * Calls PostgreSQL function for server-side aggregation
 */
export async function getInvoiceAggregates(
  filters: InvoiceAggregateFilters,
): Promise<InvoiceAggregateResult> {
  const supabase = createClient();

  if (!filters.warehouse_id) {
    throw new Error("warehouse_id is required for invoice aggregates");
  }

  if (!filters.invoice_type) {
    throw new Error("invoice_type is required for invoice aggregates");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc("get_invoice_aggregates", {
    p_warehouse_id: filters.warehouse_id,
    p_invoice_type: filters.invoice_type,
  });

  if (error) throw error;

  const typedData = data as
    | Database["public"]["Functions"]["get_invoice_aggregates"]["Returns"]
    | null;
  const result = typedData?.[0];

  return {
    count: Number(result?.invoice_count || 0),
    total_outstanding: Number(result?.total_outstanding || 0),
  };
}

// =====================================================
// SALES ORDER AGGREGATES
// =====================================================

/**
 * Get sales order aggregates (count and pending quantities by unit)
 * Calls PostgreSQL function for server-side aggregation
 */
export async function getSalesOrderAggregates(
  filters: OrderAggregateFilters,
): Promise<OrderAggregateResult> {
  const supabase = createClient();

  if (!filters.warehouse_id) {
    throw new Error("warehouse_id is required for sales order aggregates");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc("get_sales_order_aggregates", {
    p_warehouse_id: filters.warehouse_id,
  });

  if (error) throw error;

  const typedData = data as
    | Database["public"]["Functions"]["get_sales_order_aggregates"]["Returns"]
    | null;
  const result = typedData?.[0];

  // Convert JSONB array to Map<MeasuringUnit, number>
  const quantitiesArray = (result?.pending_quantities || []) as Array<{
    unit: MeasuringUnit;
    quantity: number;
  }>;

  const unitMap = new Map<MeasuringUnit, number>();
  quantitiesArray.forEach(({ unit, quantity }) => {
    unitMap.set(unit, quantity);
  });

  return {
    count: Number(result?.order_count || 0),
    pending_quantities_by_unit: unitMap,
  };
}

// =====================================================
// PURCHASE ORDER AGGREGATES
// =====================================================

/**
 * Get purchase order aggregates (count and pending quantities by unit)
 * Calls PostgreSQL function for server-side aggregation
 */
export async function getPurchaseOrderAggregates(
  filters: OrderAggregateFilters,
): Promise<OrderAggregateResult> {
  const supabase = createClient();

  if (!filters.warehouse_id) {
    throw new Error("warehouse_id is required for purchase order aggregates");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc("get_purchase_order_aggregates", {
    p_warehouse_id: filters.warehouse_id,
  });

  if (error) throw error;

  const typedData = data as
    | Database["public"]["Functions"]["get_purchase_order_aggregates"]["Returns"]
    | null;
  const result = typedData?.[0];

  // Convert JSONB array to Map<MeasuringUnit, number>
  const quantitiesArray = (result?.pending_quantities || []) as Array<{
    unit: MeasuringUnit;
    quantity: number;
  }>;

  const unitMap = new Map<MeasuringUnit, number>();
  quantitiesArray.forEach(({ unit, quantity }) => {
    unitMap.set(unit, quantity);
  });

  return {
    count: Number(result?.order_count || 0),
    pending_quantities_by_unit: unitMap,
  };
}

// =====================================================
// INVENTORY AGGREGATES
// =====================================================

/**
 * Get inventory aggregates (product count and total quantities by unit)
 * Calls PostgreSQL function for server-side aggregation
 */
export async function getInventoryAggregates(
  filters: InventoryAggregateFilters,
): Promise<InventoryAggregateResult> {
  const supabase = createClient();

  if (!filters.warehouse_id) {
    throw new Error("warehouse_id is required for inventory aggregates");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await supabase.rpc("get_inventory_aggregates", {
    p_warehouse_id: filters.warehouse_id,
  });

  if (error) throw error;

  const typedData = data as
    | Database["public"]["Functions"]["get_inventory_aggregates"]["Returns"]
    | null;
  const result = typedData?.[0];

  // Convert JSONB array to Map<MeasuringUnit, number>
  const quantitiesArray = (result?.total_quantities || []) as Array<{
    unit: MeasuringUnit;
    quantity: number;
  }>;

  const unitMap = new Map<MeasuringUnit, number>();
  quantitiesArray.forEach(({ unit, quantity }) => {
    unitMap.set(unit, quantity);
  });

  return {
    product_count: Number(result?.product_count || 0),
    total_quantities_by_unit: unitMap,
  };
}

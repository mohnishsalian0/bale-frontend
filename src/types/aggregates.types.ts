import type { MeasuringUnit } from "./database/enums";

// =====================================================
// INVOICE AGGREGATES
// =====================================================

export interface InvoiceAggregateFilters extends Record<string, unknown> {
  invoice_type?: "sales" | "purchase";
  warehouse_id?: string;
}

export interface InvoiceAggregateResult {
  count: number;
  total_outstanding: number;
}

// =====================================================
// ORDER AGGREGATES
// =====================================================

export interface OrderAggregateFilters extends Record<string, unknown> {
  order_type: "sales" | "purchase";
  warehouse_id?: string;
}

export interface OrderAggregateResult {
  count: number;
  pending_quantities_by_unit: Map<MeasuringUnit, number>;
}

// =====================================================
// INVENTORY AGGREGATES
// =====================================================

export interface InventoryAggregateFilters extends Record<string, unknown> {
  warehouse_id?: string;
}

export interface InventoryAggregateResult {
  product_count: number;
  total_quantities_by_unit: Map<MeasuringUnit, number>;
}

// =====================================================
// PRODUCT AGGREGATES
// =====================================================

export interface ProductAggregateResult {
  total_products: number;
  active_products: number;
  live_products: number;
  stock_type_breakdown: Array<{ type: string; count: number }>;
}

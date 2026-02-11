import { Tables, TablesInsert, TablesUpdate } from "./database/supabase";

export type Warehouse = Tables<"warehouses">;
export type WarehouseUpdate = TablesUpdate<"warehouses">;
export type WarehouseInsert = Omit<TablesInsert<"warehouses">, "slug">;

/**
 * Warehouse information for PDF generation
 * Used in: Purchase Order PDFs
 */
export type WarehousePDFView = Pick<
  Warehouse,
  "name" | "address_line1" | "address_line2" | "city" | "state" | "pin_code"
>;

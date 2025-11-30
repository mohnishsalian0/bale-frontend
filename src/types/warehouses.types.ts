import { Tables, TablesInsert, TablesUpdate } from "./database/supabase";

export type Warehouse = Tables<"warehouses">;
export type WarehouseUpdate = TablesUpdate<"warehouses">;
export type WarehouseInsert = TablesInsert<"warehouses">;

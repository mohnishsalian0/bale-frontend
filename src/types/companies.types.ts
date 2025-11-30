import { Tables, TablesUpdate } from "./database/supabase";

export type Company = Tables<"companies">;
export type CompanyUpdate = TablesUpdate<"companies">;

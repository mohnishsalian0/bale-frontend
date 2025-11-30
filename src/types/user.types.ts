import { Tables, TablesUpdate } from "./database/supabase";

export type User = Tables<"users">;
export type UserUpdate = TablesUpdate<"users">;

export type Permission = Tables<"permissions">;

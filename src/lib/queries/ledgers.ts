import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database/supabase";
import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

export interface LedgerFilters extends Record<string, unknown> {
  ledger_type?: Database["public"]["Enums"]["ledger_type_enum"];
}

// Query builder function
const buildLedgersQuery = (
  supabase: SupabaseClient<Database>,
  filters?: LedgerFilters,
) => {
  let query = supabase
    .from("ledgers")
    .select("id, name, ledger_type")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (filters?.ledger_type) {
    query = query.eq("ledger_type", filters.ledger_type);
  }

  return query;
};

// Type inferred from query
export type LedgerListView = QueryData<
  ReturnType<typeof buildLedgersQuery>
>[number];

/**
 * Fetch ledgers with optional filters
 * Used for TDS ledger dropdowns, etc.
 */
export async function getLedgers(
  filters?: LedgerFilters,
): Promise<LedgerListView[]> {
  const supabase = createClient();
  const { data, error } = await buildLedgersQuery(supabase, filters);

  if (error) throw error;

  return data || [];
}

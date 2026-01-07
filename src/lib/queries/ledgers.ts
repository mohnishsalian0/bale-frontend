import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";

type Ledger = Tables<"ledgers">;

export type LedgerListView = Pick<Ledger, "id" | "name" | "ledger_type">;

export interface LedgerFilters extends Record<string, unknown> {
  ledger_type?: string;
}

/**
 * Fetch ledgers with optional filters
 * Used for TDS ledger dropdowns, etc.
 */
export async function getLedgers(
  filters?: LedgerFilters,
): Promise<LedgerListView[]> {
  const supabase = createClient();

  let query = supabase
    .from("ledgers")
    .select("id, name, ledger_type")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (filters?.ledger_type) {
    query = query.eq("ledger_type", filters.ledger_type);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []) as LedgerListView[];
}

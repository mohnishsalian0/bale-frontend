import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LedgerListView,
  LedgerDetailView,
  LedgerInsert,
  LedgerUpdate,
  ParentGroup,
} from "@/types/ledgers.types";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

export interface LedgerFilters extends Record<string, unknown> {
  ledger_type?: Database["public"]["Enums"]["ledger_type_enum"];
  parent_group_id?: string;
  search_term?: string;
}

/**
 * Query builder for fetching ledgers list
 */
export const buildLedgersQuery = (
  supabase: SupabaseClient<Database>,
  filters?: LedgerFilters,
) => {
  let query = supabase
    .from("ledgers")
    .select(
      `
      id,
      name,
      ledger_type,
      is_default,
      is_active,
      partner_id,
      parent_group:parent_groups(id, name, category),
      partner:partners(first_name, last_name, company_name)
    `,
    )
    .eq("is_active", true)
    .is("deleted_at", null);

  // Apply filters
  if (filters?.ledger_type) {
    query = query.eq("ledger_type", filters.ledger_type);
  }

  if (filters?.parent_group_id) {
    query = query.eq("parent_group_id", filters.parent_group_id);
  }

  if (filters?.search_term) {
    query = query.ilike("name", `%${filters.search_term}%`);
  }

  return query.order("name", { ascending: true });
};

/**
 * Query builder for fetching single ledger by ID
 */
export const buildLedgerByIdQuery = (
  supabase: SupabaseClient<Database>,
  id: string,
) => {
  return supabase
    .from("ledgers")
    .select(
      `
      *,
      parent_group:parent_groups(*),
      partner:partners(id, first_name, last_name, company_name)
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching parent groups
 */
export const buildParentGroupsQuery = (supabase: SupabaseClient<Database>) => {
  return supabase
    .from("parent_groups")
    .select("*")
    .order("name", { ascending: true });
};

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch ledgers with optional filters
 * Used for ledgers list page and dropdowns
 */
export async function getLedgers(
  filters?: LedgerFilters,
): Promise<LedgerListView[]> {
  const supabase = createClient();
  const { data, error } = await buildLedgersQuery(supabase, filters);

  if (error) throw error;

  return data || [];
}

/**
 * Fetch single ledger by ID
 * Used for ledger detail/edit views
 */
export async function getLedgerById(
  id: string,
): Promise<LedgerDetailView | null> {
  const supabase = createClient();
  const { data, error } = await buildLedgerByIdQuery(supabase, id);

  if (error) throw error;

  return data;
}

/**
 * Fetch all parent groups
 * Used for parent group dropdown in ledger form
 */
export async function getParentGroups(): Promise<ParentGroup[]> {
  const supabase = createClient();
  const { data, error } = await buildParentGroupsQuery(supabase);

  if (error) throw error;

  return data || [];
}

/**
 * Create new ledger
 */
export async function createLedger(ledger: LedgerInsert): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("ledgers")
    .insert(ledger)
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

/**
 * Update existing ledger
 */
export async function updateLedger(
  id: string,
  updates: LedgerUpdate,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("ledgers")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Soft delete ledger
 * Triggers will prevent deletion of system ledgers and ledgers in use
 */
export async function deleteLedger(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("ledgers").delete().eq("id", id);

  if (error) throw error;
}

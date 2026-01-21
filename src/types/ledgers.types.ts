import type { Database } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import type {
  buildLedgersQuery,
  buildLedgerByIdQuery,
  buildParentGroupsQuery,
} from "@/lib/queries/ledgers";

// ============================================================================
// TYPE INFERENCE FROM QUERIES
// ============================================================================

/**
 * Ledger with minimal details for list views
 * Used in: ledgers list page
 * Inferred from: buildLedgersQuery
 */
export type LedgerListView = QueryData<
  ReturnType<typeof buildLedgersQuery>
>[number];

/**
 * Complete ledger details for detail/edit views
 * Used in: ledger form sheet
 * Inferred from: buildLedgerByIdQuery
 */
export type LedgerDetailView = QueryData<ReturnType<typeof buildLedgerByIdQuery>>;

/**
 * Parent group details for dropdowns
 * Inferred from: buildParentGroupsQuery
 */
export type ParentGroup = QueryData<
  ReturnType<typeof buildParentGroupsQuery>
>[number];

// ============================================================================
// INSERT/UPDATE TYPES
// ============================================================================

export type LedgerInsert = Database["public"]["Tables"]["ledgers"]["Insert"];
export type LedgerUpdate = Database["public"]["Tables"]["ledgers"]["Update"];

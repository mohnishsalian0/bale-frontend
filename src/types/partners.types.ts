import type { Tables, TablesInsert, TablesUpdate } from "./database/supabase";

export type Partner = Tables<"partners">;
type PartnerOrderAggregate = Tables<"partner_order_aggregates">;
type PartnerCreditAggregate = Tables<"partner_credit_aggregates">;
type Ledger = Tables<"ledgers">;

// ============================================================================
// FILTERS
// ============================================================================

export interface PartnerFilters extends Record<string, unknown> {
  partner_type?: string | string[]; // Support single or array for IN queries
  limit?: number;
  order_by?: "first_name" | "last_interaction_at" | "credit_aggregates.total_outstanding_amount";
  order_direction?: "asc" | "desc";
}

// ============================================================================
// PARTNER VIEW TYPES
// ============================================================================

/**
 * Partner with minimal details for list views
 * Used in: partners list page, partner selection in invoices/payments
 */
export interface PartnerListView extends Pick<
  Partner,
  | "id"
  | "first_name"
  | "last_name"
  | "company_name"
  | "display_name"
  | "partner_type"
  | "is_active"
  | "phone_number"
  | "email"
  | "city"
  | "state"
  | "image_url"
  | "credit_limit_enabled"
  | "credit_limit"
> {
  ledger: Pick<Ledger, "id" | "name">;
}

/**
 * Partner with all details for detail views
 * Used in: partner detail page, partner form
 */
export type PartnerDetailView = Partner;

/**
 * Partner with statistics for list views
 * Used in: partners list page with stats, accounting dashboard
 */
export interface PartnerWithStatsListView extends PartnerListView {
  order_stats: Pick<
    PartnerOrderAggregate,
    | "approval_pending_count"
    | "approval_pending_value"
    | "in_progress_count"
    | "in_progress_value"
    | "total_orders"
    | "lifetime_order_value"
  > | null;
  credit_aggregates: Pick<
    PartnerCreditAggregate,
    | "total_invoice_amount"
    | "total_outstanding_amount"
    | "total_paid_amount"
    | "invoice_count"
  > | null;
}

/**
 * Partner with full order statistics for detail views
 * Used in: partner detail page
 */
export interface PartnerWithOrderStatsDetailView extends PartnerDetailView {
  order_stats: PartnerOrderAggregate | null;
  credit_aggregates: PartnerCreditAggregate | null;
}

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type PartnerInsert = TablesInsert<"partners">;
export type PartnerUpdate = TablesUpdate<"partners">;

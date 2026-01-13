import type { Tables, TablesInsert, TablesUpdate } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildPartnersQuery,
  buildPartnersWithStatsQuery,
  buildPartnerWithOrderStatsByIdQuery,
} from "@/lib/queries/partners";

export type Partner = Tables<"partners">;
type PartnerSalesAggregate = Tables<"partner_sales_aggregates">;
type PartnerPurchaseAggregate = Tables<"partner_purchase_aggregates">;
type PartnerReceivablesAggregate = Tables<"partner_receivables_aggregates">;
type PartnerPayablesAggregate = Tables<"partner_payables_aggregates">;
type Ledger = Tables<"ledgers">;

// ============================================================================
// FILTERS
// ============================================================================

export interface PartnerFilters extends Record<string, unknown> {
  partner_type?: string | string[]; // Support single or array for IN queries
  limit?: number;
  order_by?:
    | "first_name"
    | "last_interaction_at"
    | "receivables_aggregates.total_outstanding_amount"
    | "payables_aggregates.total_outstanding_amount";
  order_direction?: "asc" | "desc";
}

// ============================================================================
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw type inferred from buildPartnersQuery
 * Used as bridge between Supabase response and PartnerListView
 */
export type PartnerListViewRaw = QueryData<
  ReturnType<typeof buildPartnersQuery>
>[number];

/**
 * Raw type inferred from buildPartnersWithStatsQuery
 * Used as bridge between Supabase response and PartnerWithStatsListView
 */
export type PartnerWithStatsListViewRaw = QueryData<
  ReturnType<typeof buildPartnersWithStatsQuery>
>[number];

/**
 * Raw type inferred from buildPartnerWithOrderStatsByIdQuery
 * Used as bridge between Supabase response and PartnerWithOrderStatsDetailView
 */
export type PartnerWithOrderStatsDetailViewRaw = QueryData<
  ReturnType<typeof buildPartnerWithOrderStatsByIdQuery>
>;

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
  sales_aggregates: Pick<
    PartnerSalesAggregate,
    | "approval_pending_count"
    | "approval_pending_value"
    | "in_progress_count"
    | "in_progress_value"
    | "total_orders"
    | "lifetime_order_value"
  > | null;
  purchase_aggregates: Pick<
    PartnerPurchaseAggregate,
    | "approval_pending_count"
    | "approval_pending_value"
    | "in_progress_count"
    | "in_progress_value"
    | "total_orders"
    | "lifetime_order_value"
  > | null;
  receivables_aggregates: Pick<
    PartnerReceivablesAggregate,
    | "total_invoice_amount"
    | "total_outstanding_amount"
    | "total_paid_amount"
    | "invoice_count"
  > | null;
  payables_aggregates: Pick<
    PartnerPayablesAggregate,
    | "total_invoice_amount"
    | "total_outstanding_amount"
    | "total_paid_amount"
    | "invoice_count"
  > | null;
}

/**
 * Partner with full order and credit statistics for detail views
 * Used in: partner detail page
 */
export interface PartnerWithOrderStatsDetailView extends PartnerDetailView {
  sales_aggregates: PartnerSalesAggregate | null;
  purchase_aggregates: PartnerPurchaseAggregate | null;
  receivables_aggregates: PartnerReceivablesAggregate | null;
  payables_aggregates: PartnerPayablesAggregate | null;
}

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type PartnerInsert = TablesInsert<"partners">;
export type PartnerUpdate = TablesUpdate<"partners">;

import type { Tables, TablesInsert, TablesUpdate } from "./database/supabase";

type Partner = Tables<"partners">;
type PartnerOrderAggregate = Tables<"partner_order_aggregates">;

// ============================================================================
// FILTERS
// ============================================================================

export interface PartnerFilters extends Record<string, unknown> {
  partner_type?: string | string[]; // Support single or array for IN queries
  limit?: number;
  order_by?: "first_name" | "last_interaction_at";
  order_direction?: "asc" | "desc";
}

// ============================================================================
// PARTNER VIEW TYPES
// ============================================================================

/**
 * Partner with minimal details for list views
 * Used in: partners list page
 */
export type PartnerListView = Pick<
  Partner,
  | "id"
  | "first_name"
  | "last_name"
  | "company_name"
  | "partner_type"
  | "is_active"
  | "phone_number"
  | "email"
  | "city"
  | "state"
  | "image_url"
>;

/**
 * Partner with all details for detail views
 * Used in: partner detail page, partner form
 */
export type PartnerDetailView = Partner;

/**
 * Partner with order statistics for list views
 * Used in: partners list page with order stats
 */
export interface PartnerWithOrderStatsListView extends PartnerListView {
  order_stats: Pick<
    PartnerOrderAggregate,
    | "approval_pending_count"
    | "approval_pending_value"
    | "in_progress_count"
    | "in_progress_value"
    | "total_orders"
    | "lifetime_order_value"
  > | null;
}

/**
 * Partner with full order statistics for detail views
 * Used in: partner detail page
 */
export interface PartnerWithOrderStatsDetailView extends PartnerDetailView {
  order_stats: PartnerOrderAggregate | null;
}

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type PartnerInsert = TablesInsert<"partners">;
export type PartnerUpdate = TablesUpdate<"partners">;

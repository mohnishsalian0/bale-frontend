import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadPartnerImage } from "@/lib/storage";
import type {
  PartnerFilters,
  PartnerListView,
  PartnerDetailView,
  PartnerWithStatsListView,
  PartnerWithOrderStatsDetailView,
  PartnerInsert,
  PartnerUpdate,
  PartnerListViewRaw,
  PartnerWithStatsListViewRaw,
  PartnerWithOrderStatsDetailViewRaw,
} from "@/types/partners.types";

// Re-export for convenience
export type { PartnerInsert, PartnerUpdate };

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching partners with minimal fields
 */
export const buildPartnersQuery = (
  supabase: SupabaseClient<Database>,
  filters?: PartnerFilters,
) => {
  let query = supabase
    .from("partners")
    .select(
      `
      id,
      first_name,
      last_name,
      company_name,
      display_name,
      partner_type,
      is_active,
      phone_number,
      email,
      city,
      state,
      image_url,
      credit_limit_enabled,
      credit_limit,
      ledger:ledgers!partner_id(id, name)
    `,
    )
    .is("deleted_at", null);

  if (filters?.partner_type) {
    if (Array.isArray(filters.partner_type)) {
      query = query.in("partner_type", filters.partner_type);
    } else {
      query = query.eq("partner_type", filters.partner_type);
    }
  }

  const orderBy = filters?.order_by || "first_name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  return query;
};

/**
 * Query builder for fetching partners with stats
 */
export const buildPartnersWithStatsQuery = (
  supabase: SupabaseClient<Database>,
  filters?: PartnerFilters,
) => {
  let query = supabase
    .from("partners")
    .select(
      `
      id,
      first_name,
      last_name,
      company_name,
      display_name,
      partner_type,
      is_active,
      phone_number,
      email,
      city,
      state,
      image_url,
      credit_limit_enabled,
      credit_limit,
      ledger:ledgers!partner_id(id, name),
      sales_aggregates:partner_sales_aggregates(
        approval_pending_count,
        approval_pending_value,
        in_progress_count,
        in_progress_value,
        total_orders,
        lifetime_order_value
      ),
      purchase_aggregates:partner_purchase_aggregates(
        approval_pending_count,
        approval_pending_value,
        in_progress_count,
        in_progress_value,
        total_orders,
        lifetime_order_value
      ),
      receivables_aggregates:partner_receivables_aggregates(
        total_invoice_amount,
        total_outstanding_amount,
        total_paid_amount,
        invoice_count
      ),
      payables_aggregates:partner_payables_aggregates(
        total_invoice_amount,
        total_outstanding_amount,
        total_paid_amount,
        invoice_count
      )
    `,
    )
    .is("deleted_at", null);

  if (filters?.partner_type) {
    if (Array.isArray(filters.partner_type)) {
      query = query.in("partner_type", filters.partner_type);
    } else {
      query = query.eq("partner_type", filters.partner_type);
    }
  }

  const orderBy = filters?.order_by || "first_name";
  const ascending = filters?.order_direction !== "desc";

  if (orderBy.includes(".")) {
    const [foreignTable, field] = orderBy.split(".");
    query = query.order(field, { ascending, foreignTable });
  } else {
    query = query.order(orderBy, { ascending });
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  return query;
};

/**
 * Query builder for fetching a single partner with order stats by ID
 */
export const buildPartnerWithOrderStatsByIdQuery = (
  supabase: SupabaseClient<Database>,
  partnerId: string,
) => {
  return supabase
    .from("partners")
    .select(
      `
      *,
      sales_aggregates:partner_sales_aggregates(*),
      purchase_aggregates:partner_purchase_aggregates(*),
      receivables_aggregates:partner_receivables_aggregates(*),
      payables_aggregates:partner_payables_aggregates(*)
    `,
    )
    .eq("id", partnerId)
    .is("deleted_at", null)
    .single();
};

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform raw partner data to PartnerListView
 * Flattens ledger array to single object
 */
function transformPartnerListView(raw: PartnerListViewRaw): PartnerListView {
  return {
    ...raw,
    ledger: Array.isArray(raw.ledger) ? raw.ledger[0] : raw.ledger,
  };
}

/**
 * Transform raw partner data with stats to PartnerWithStatsListView
 * Flattens all aggregate arrays to single objects
 */
function transformPartnerWithStatsListView(
  raw: PartnerWithStatsListViewRaw,
): PartnerWithStatsListView {
  return {
    ...raw,
    ledger: Array.isArray(raw.ledger) ? raw.ledger[0] : raw.ledger,
    //   sales_aggregates: Array.isArray(raw.sales_aggregates)
    //     ? raw.sales_aggregates[0]
    //     : raw.sales_aggregates,
    //   purchase_aggregates: Array.isArray(raw.purchase_aggregates)
    //     ? raw.purchase_aggregates[0]
    //     : raw.purchase_aggregates,
    //   receivables_aggregates: Array.isArray(raw.receivables_aggregates)
    //     ? raw.receivables_aggregates[0]
    //     : raw.receivables_aggregates,
    //   payables_aggregates: Array.isArray(raw.payables_aggregates)
    //     ? raw.payables_aggregates[0]
    //     : raw.payables_aggregates,
  };
}

/**
 * Transform raw partner data with order stats to PartnerWithOrderStatsDetailView
 * Flattens all aggregate arrays to single objects
 */
function transformPartnerWithOrderStatsDetailView(
  raw: PartnerWithOrderStatsDetailViewRaw,
): PartnerWithOrderStatsDetailView {
  return {
    ...raw,
    // sales_aggregates: Array.isArray(raw.sales_aggregates)
    //   ? raw.sales_aggregates[0]
    //   : raw.sales_aggregates,
    // purchase_aggregates: Array.isArray(raw.purchase_aggregates)
    //   ? raw.purchase_aggregates[0]
    //   : raw.purchase_aggregates,
    // receivables_aggregates: Array.isArray(raw.receivables_aggregates)
    //   ? raw.receivables_aggregates[0]
    //   : raw.receivables_aggregates,
    // payables_aggregates: Array.isArray(raw.payables_aggregates)
    //   ? raw.payables_aggregates[0]
    //   : raw.payables_aggregates,
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch partners with optional filters
 *
 * Examples:
 * - All partners: getPartners()
 * - Customers: getPartners({ partner_type: 'customer' })
 * - Suppliers: getPartners({ partner_type: 'supplier' })
 * - Multiple types: getPartners({ partner_type: ['customer', 'supplier'] })
 * - Recent partners: getPartners({ order_by: 'last_interaction_at', order_direction: 'desc', limit: 5 })
 */
export async function getPartners(
  filters?: PartnerFilters,
): Promise<PartnerListView[]> {
  const supabase = createClient();
  const { data, error } = await buildPartnersQuery(supabase, filters);

  if (error) throw error;

  const transformedData = (data || []).map(transformPartnerListView);

  return transformedData;
}

/**
 * Fetch partners with order stats and credit aggregates
 *
 * Examples:
 * - All partners with stats: getPartnersWithStats()
 * - Customers with stats: getPartnersWithStats({ partner_type: 'customer' })
 * - Suppliers with stats: getPartnersWithStats({ partner_type: 'supplier' })
 */
export async function getPartnersWithStats(
  filters?: PartnerFilters,
): Promise<PartnerWithStatsListView[]> {
  const supabase = createClient();
  const { data, error } = await buildPartnersWithStatsQuery(supabase, filters);

  if (error) throw error;
  console.log("raw", data);

  const transformedData = (data || []).map(transformPartnerWithStatsListView);
  console.log("transformed", transformedData);

  return transformedData;
}

/**
 * Fetch a single partner by ID (without order aggregates)
 * Used for: partner form, basic partner details
 */
export async function getPartnerById(
  partnerId: string,
): Promise<PartnerDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .is("deleted_at", null)
    .single<PartnerDetailView>();

  if (error) throw error;
  if (!data) throw new Error("No partner found");

  return data;
}

/**
 * Fetch a single partner by ID with order statistics
 * Used for: partner detail page
 */
export async function getPartnerWithOrderStatsById(
  partnerId: string,
): Promise<PartnerWithOrderStatsDetailView | null> {
  const supabase = createClient();
  const { data, error } = await buildPartnerWithOrderStatsByIdQuery(
    supabase,
    partnerId,
  );

  if (error) throw error;
  if (!data) throw new Error("No partner found");

  return transformPartnerWithOrderStatsDetailView(data);
}

/**
 * Create a new partner
 */
export async function createPartner({
  partner,
  image,
  companyId,
}: {
  partner: Omit<PartnerInsert, "image_url">;
  image: File | null;
  companyId: string;
}): Promise<string> {
  const supabase = createClient();

  const { data: newPartner, error: insertError } = await supabase
    .from("partners")
    .insert(partner)
    .select("id")
    .single<{ id: string }>();

  if (insertError) throw insertError;
  if (!newPartner) throw new Error("Failed to create partner");

  if (image) {
    try {
      const { publicUrl } = await uploadPartnerImage(
        companyId,
        newPartner.id,
        image,
      );

      const { error: imageUpdateError } = await supabase
        .from("partners")
        .update({ image_url: publicUrl })
        .eq("id", newPartner.id);

      if (imageUpdateError) throw imageUpdateError;
    } catch (uploadError) {
      console.error("Image upload failed:", uploadError);
      // Don't re-throw, return partner data without image
    }
  }

  return newPartner.id;
}

/**
 * Update an existing partner
 */
export async function updatePartner({
  partnerId,
  partnerData,
  image,
  companyId,
}: {
  partnerId: string;
  partnerData: PartnerUpdate;
  image: File | null;
  companyId: string;
}): Promise<string> {
  const supabase = createClient();

  if (image) {
    try {
      const { publicUrl } = await uploadPartnerImage(
        companyId,
        partnerId,
        image,
      );
      partnerData.image_url = publicUrl;
    } catch (uploadError) {
      console.error("Image upload failed:", uploadError);
      // Don't re-throw, proceed with other updates
    }
  }

  const { data: updatedPartner, error: updateError } = await supabase
    .from("partners")
    .update(partnerData)
    .eq("id", partnerId)
    .select("id")
    .single<{ id: string }>();

  if (updateError) throw updateError;
  if (!updatedPartner) throw new Error("Failed to update partner");

  return updatedPartner.id;
}

/**
 * Delete a partner (soft delete)
 */
export async function deletePartner(partnerId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("partners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", partnerId);

  if (error) throw error;
}

/**
 * Update partner active status
 */
export async function updatePartnerActiveStatus(
  partnerId: string,
  value: boolean,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("partners")
    .update({ is_active: value })
    .eq("id", partnerId);

  if (error) {
    console.error("Error updating partner active status:", error);
    throw error;
  }
}

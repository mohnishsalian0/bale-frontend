import { createClient } from "@/lib/supabase/browser";
import { uploadPartnerImage } from "@/lib/storage";
import type {
  PartnerFilters,
  PartnerListView,
  PartnerDetailView,
  PartnerWithOrderStatsDetailView,
  PartnerInsert,
  PartnerUpdate,
} from "@/types/partners.types";

// Re-export for convenience
export type { PartnerInsert, PartnerUpdate };

// ============================================================================
// SELECT CONSTANTS
// ============================================================================

// Select query for PartnerListView
export const PARTNER_LIST_VIEW_SELECT = `
  id,
  first_name,
  last_name,
  company_name,
  partner_type,
  is_active,
  phone_number,
  email,
  city,
  state,
  image_url
`;

// Select query for PartnerWithOrderStatsDetailView
export const PARTNER_WITH_ORDER_STATS_DETAIL_VIEW_SELECT = `
  *,
  order_stats:partner_order_aggregates(*)
`;

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

  let query = supabase
    .from("partners")
    .select(PARTNER_LIST_VIEW_SELECT)
    .is("deleted_at", null);

  // Apply partner_type filter (supports single value or array)
  if (filters?.partner_type) {
    if (Array.isArray(filters.partner_type)) {
      query = query.in("partner_type", filters.partner_type);
    } else {
      query = query.eq("partner_type", filters.partner_type);
    }
  }

  // Apply ordering (defaults to first_name ascending)
  const orderBy = filters?.order_by || "first_name";
  const ascending = filters?.order_direction !== "desc";
  query = query.order(orderBy, { ascending });

  // Apply limit
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as PartnerListView[]) || [];
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

  const { data, error } = await supabase
    .from("partners")
    .select(PARTNER_WITH_ORDER_STATS_DETAIL_VIEW_SELECT)
    .eq("id", partnerId)
    .is("deleted_at", null)
    .single<PartnerWithOrderStatsDetailView>();

  if (error) throw error;
  if (!data) throw new Error("No partner found");

  return data;
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

/**
 * Partners Module
 * Handles partner creation (customers, suppliers, vendors, agents)
 * All functions are idempotent - safe to run multiple times
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PartnerConfig } from "../config/partners.config";

// ============================================================================
// TYPES
// ============================================================================

export interface PartnerResult {
  id: string;
  partner_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone_number: string | null;
  email: string | null;
}

// ============================================================================
// PARTNER FUNCTIONS
// ============================================================================

/**
 * Ensure partners exist (idempotent with quantity handling)
 * Takes expected quantity from config, fetches existing, creates difference
 * Returns all partners (existing + newly created)
 * Partners are identified by phone_number (unique identifier)
 */
export async function ensurePartners(
  supabase: SupabaseClient<Database>,
  companyId: string,
  partnerConfigs: PartnerConfig[],
): Promise<PartnerResult[]> {
  console.log(`👥 Ensuring ${partnerConfigs.length} partners exist...\n`);

  // Fetch existing partners for this company
  const { data: existing, error: fetchError } = await supabase
    .from("partners")
    .select(
      "id, partner_type, first_name, last_name, company_name, phone_number, email",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching partners:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing partners
  if (existingCount === partnerConfigs.length) {
    console.log(`✅ All ${existingCount} partners already exist\n`);
    return existing!;
  }

  // Determine which partners are missing by filtering out existing phone numbers
  const existingPhones = new Set(existing?.map((p) => p.phone_number) || []);
  const toCreate = partnerConfigs.filter(
    (config) => !existingPhones.has(config.phone_number),
  );

  console.log(
    `📦 Creating ${toCreate.length} new partners (${existingCount} already exist)...`,
  );

  const { data: created, error: createError } = await supabase
    .from("partners")
    .insert(
      toCreate.map((config) => ({
        company_id: companyId,
        partner_type: config.partner_type,
        first_name: config.first_name,
        last_name: config.last_name,
        company_name: config.company_name,
        phone_number: config.phone_number,
        email: config.email || null,
        billing_address_line1: config.billing_address_line1,
        billing_address_line2: config.billing_address_line2 || null,
        billing_city: config.billing_city,
        billing_state: config.billing_state,
        billing_country: config.billing_country,
        billing_pin_code: config.billing_pin_code,
        shipping_same_as_billing: config.shipping_same_as_billing,
        shipping_address_line1: config.shipping_address_line1 || null,
        shipping_address_line2: config.shipping_address_line2 || null,
        shipping_city: config.shipping_city || null,
        shipping_state: config.shipping_state || null,
        shipping_country: config.shipping_country || null,
        shipping_pin_code: config.shipping_pin_code || null,
        credit_limit_enabled: config.credit_limit_enabled,
        credit_limit: config.credit_limit,
        gst_number: config.gst_number || null,
        pan_number: config.pan_number || null,
      })),
    )
    .select(
      "id, partner_type, first_name, last_name, company_name, phone_number, email",
    );

  if (createError || !created) {
    console.error("❌ Failed to create partners:", createError);
    throw createError || new Error("Failed to create partners");
  }

  console.log(`✅ Created ${created.length} new partners\n`);

  // Return all partners (existing + created)
  const allPartners = [...(existing || []), ...created];

  console.log(`📊 Total partners: ${allPartners.length}\n`);

  return allPartners;
}

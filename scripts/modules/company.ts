/**
 * Company Module
 * Handles company creation, catalog configuration, and admin user setup
 * All functions are idempotent - safe to run multiple times
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";

// ============================================================================
// TYPES
// ============================================================================

export interface CompanyResult {
  companyId: string;
  companyName: string;
  companySlug: string;
}

// ============================================================================
// COMPANY FUNCTIONS
// ============================================================================

/**
 * Ensure company exists (idempotent)
 * Returns existing company or creates new one
 */
export async function ensureCompany(
  supabase: SupabaseClient<Database>,
): Promise<CompanyResult> {
  console.log("🌱 Ensuring company exists...\n");

  // Fetch existing companies
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .limit(1);

  if (companyError) {
    console.error("❌ Error fetching companies:", companyError);
    throw companyError;
  }

  // If company exists, return it
  if (companies && companies.length > 0) {
    const company = companies[0];
    console.log(`📦 Using existing company: ${company.name} (${company.id})\n`);

    return {
      companyId: company.id,
      companyName: company.name,
      companySlug: company.slug,
    };
  }

  // Create new company
  console.log("📦 Creating new company...");
  const { data: newCompany, error: createError } = await supabase
    .from("companies")
    .insert({
      name: "Bale Test Company",
      slug: "",
      gst_number: "27AABCT1234A1Z5",
      pan_number: "AABCT1234A",
      business_type: "Textile Manufacturing",
      address_line1: "123 Test Street",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pin_code: "400001",
    })
    .select()
    .single();

  if (createError || !newCompany) {
    console.error("❌ Failed to create company:", createError);
    throw createError || new Error("Failed to create company");
  }

  console.log(`✅ Created company: ${newCompany.name} (${newCompany.id})\n`);

  return {
    companyId: newCompany.id,
    companyName: newCompany.name,
    companySlug: newCompany.slug,
  };
}

/**
 * Ensure catalog configuration exists (idempotent)
 * Returns existing config or creates new one
 */
export async function ensureCatalogConfiguration(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<void> {
  console.log("🏪 Ensuring catalog configuration exists...");

  // Check if catalog config already exists
  const { data: existing, error: fetchError } = await supabase
    .from("catalog_configurations")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (fetchError) {
    console.error("❌ Error fetching catalog config:", fetchError);
    throw fetchError;
  }

  // If exists, return
  if (existing && existing.length > 0) {
    console.log(`✅ Catalog configuration already exists\n`);
    return;
  }

  // Create new catalog configuration
  const { data: catalogConfig, error: catalogError } = await supabase
    .from("catalog_configurations")
    .insert({
      company_id: companyId,
      accepting_orders: true,
      catalog_name: "Bale Test Store",
      contact_phone: "+91 98765 43210",
      contact_email: "contact@baletest.com",
      contact_address: "123 Test Street, Mumbai, Maharashtra, 400001",
      terms_conditions: "Standard terms and conditions apply.",
      return_policy: "Returns accepted within 7 days of delivery.",
      privacy_policy: "We respect your privacy and protect your data.",
    })
    .select()
    .single();

  if (catalogError || !catalogConfig) {
    console.error("❌ Failed to create catalog configuration:", catalogError);
    throw catalogError || new Error("Failed to create catalog configuration");
  }

  console.log(`✅ Created catalog configuration\n`);
}

/**
 * Ensure admin user exists for company (idempotent)
 * Returns existing user ID or creates new admin user
 */
export async function ensureAdminUser(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouseId: string,
): Promise<string> {
  console.log("👤 Ensuring admin user exists...");

  // Check if admin user already exists
  const { data: existingUsers, error: userError } = await supabase
    .from("users")
    .select("id, email")
    .eq("company_id", companyId)
    .eq("role", "admin")
    .limit(1);

  if (userError) {
    console.error("❌ Error fetching users:", userError);
    throw userError;
  }

  // If admin exists, return their ID
  if (existingUsers && existingUsers.length > 0) {
    const user = existingUsers[0];
    console.log(`✅ Admin user already exists: ${user.email} (${user.id})\n`);
    return user.id;
  }

  // Create new admin user with auth
  console.log("👤 Creating new admin user...");

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: "admin@baletest.com",
      password: "testpassword123",
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    console.error("❌ Failed to create auth user:", authError);
    throw authError || new Error("Failed to create auth user");
  }

  const { data: user, error: createUserError } = await supabase
    .from("users")
    .insert({
      auth_user_id: authUser.user.id,
      company_id: companyId,
      warehouse_id: warehouseId,
      first_name: "Admin",
      last_name: "User",
      email: "admin@baletest.com",
      role: "admin",
      all_warehouses_access: true,
    })
    .select()
    .single();

  if (createUserError || !user) {
    console.error("❌ Failed to create user profile:", createUserError);
    throw createUserError || new Error("Failed to create user profile");
  }

  console.log(`✅ Created admin user: ${user.email} (${user.id})\n`);

  return user.id;
}

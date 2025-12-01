import { createClient } from "@/lib/supabase/browser";
import { type Company, type CompanyUpdate } from "@/types/companies.types";
import { type Warehouse } from "@/types/warehouses.types";
import { uploadCompanyLogo } from "@/lib/storage";

/**
 * Fetch company details for the current authenticated user
 */
export async function getCompany(): Promise<Company> {
  const supabase = createClient();

  // Get the current auth user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  // Get the user record from the users table to get company_id
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !userData) {
    console.error("Error fetching user data:", userError);
    throw new Error("User not found");
  }

  // Fetch the company details
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", userData.company_id)
    .single<Company>();

  if (error) {
    console.error("Error fetching company details:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Company not found");
  }

  return data;
}

/**
 * Fetch all warehouses for the current company
 */
export async function getCompanyWarehouses(): Promise<Warehouse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching company warehouses:", error);
    throw error;
  }
  if (!data) return [];

  return data as Warehouse[];
}

/**
 * Update company details
 */
export async function updateCompanyDetails({
  companyId,
  updates,
  image,
}: {
  companyId: string;
  updates: CompanyUpdate;
  image?: File | null;
}): Promise<Company> {
  const supabase = createClient();

  // Upload logo if provided
  if (image) {
    try {
      const { publicUrl } = await uploadCompanyLogo(companyId, image);
      updates.logo_url = publicUrl;
    } catch (uploadError) {
      console.error("Logo upload failed:", uploadError);
      // Don't re-throw, proceed with other updates
    }
  }

  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", companyId)
    .select()
    .single<Company>();

  if (error) {
    console.error("Error updating company details:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Failed to update company");
  }

  return data;
}

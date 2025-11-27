import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/types/database/supabase";

type Company = Tables<"companies">;
type Warehouse = Tables<"warehouses">;

/**
 * Fetch company details for the current user
 */
export async function getCompanyDetails(): Promise<Company> {
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
    .single();

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

  return data || [];
}

/**
 * Update company details
 */
export async function updateCompanyDetails(
  companyId: string,
  updates: TablesUpdate<"companies">,
): Promise<Company> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", companyId)
    .select()
    .single();

  if (error) {
    console.error("Error updating company details:", error);
    throw error;
  }

  return data;
}

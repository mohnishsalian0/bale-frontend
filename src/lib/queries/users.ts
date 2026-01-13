import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "@/types/database/supabase";
import type { StaffListView, StaffDetailView } from "@/types/staff.types";
import { User, UserUpdate } from "@/types/users.types";
import { Warehouse } from "@/types/warehouses.types";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching user by auth ID
 */
export const buildUserByAuthIdQuery = (
  supabase: SupabaseClient<Database>,
  authUserId: string,
) => {
  return supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();
};

/**
 * Query builder for fetching staff members list with warehouse assignments
 */
export const buildStaffMembersQuery = (supabase: SupabaseClient<Database>) => {
  return supabase
    .from("users")
    .select(
      `
      id,
      first_name,
      last_name,
      phone_number,
      email,
      profile_image_url,
      role,
      all_warehouses_access,
      user_warehouses(warehouses(id, name))
    `,
    )
    .is("deleted_at", null)
    .order("first_name", { ascending: true });
};

/**
 * Query builder for fetching a single staff member by ID with warehouse assignments
 */
export const buildStaffMemberByIdQuery = (
  supabase: SupabaseClient<Database>,
  userId: string,
) => {
  return supabase
    .from("users")
    .select("*, user_warehouses(warehouses(id, name))")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();
};


/**
 * Fetch user
 * This is the primary way to get the current logged-in user
 */
export async function getUser(): Promise<User> {
  const supabase = createClient();

  // Get the current auth user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await buildUserByAuthIdQuery(supabase, authUser.id);

  if (error) {
    console.error("Error fetching user by auth ID:", error);
    supabase.auth.signOut();
    throw error;
  }

  if (!data) {
    supabase.auth.signOut();
    throw new Error("User not found");
  }

  return data;
}

/**
 * Update user's selected warehouse
 */
export async function updateUserWarehouse(
  userId: string,
  warehouseId: string,
): Promise<User> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("users")
    .update({ warehouse_id: warehouseId })
    .eq("id", userId)
    .select()
    .single<User>();

  if (error) {
    console.error("Error updating user warehouse:", error);
    throw error;
  }

  if (!data) {
    throw new Error("User not found");
  }

  return data;
}

/**
 * Fetch user's role and permissions
 */
export async function getUserPermissions(roleName: string): Promise<string[]> {
  const supabase = createClient();

  // Fetch role ID
  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleData) {
    console.error(`Error fetching role: ${roleError}`);
    throw new Error(`Error fetching role: ${roleError}`);
  }

  // Fetch permissions for this role
  const { data: permData, error: permError } = await supabase
    .from("role_permissions")
    .select("permissions!permission_id(permission_path)")
    .eq("role_id", roleData.id);

  if (permError) {
    console.error("Error fetching permissions:", permError);
    throw new Error(`Error fetching permissions: ${permError}`);
  }
  return (
    (permData?.map((p) => p.permissions.permission_path) as string[]) ?? []
  );
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  updates: UserUpdate,
): Promise<User> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single<User>();

  if (error) {
    console.error("Error updating user:", error);
    throw error;
  }

  return data;
}

/**
 * Update staff member role and warehouse assignments
 */
export async function updateStaffMember(params: {
  userId: string;
  companyId: string;
  role: string;
  allWarehousesAccess: boolean;
  warehouseIds: string[];
}): Promise<void> {
  const supabase = createClient();

  // Update user role and warehouse access flag
  const { error: userError } = await supabase
    .from("users")
    .update({
      role: params.role,
      all_warehouses_access: params.allWarehousesAccess,
    })
    .eq("id", params.userId);

  if (userError) {
    console.error("Error updating user:", userError);
    throw userError;
  }

  // Delete all existing warehouse assignments
  const { error: deleteError } = await supabase
    .from("user_warehouses")
    .delete()
    .eq("user_id", params.userId);

  if (deleteError) {
    console.error("Error deleting warehouse assignments:", deleteError);
    throw deleteError;
  }

  // If specific warehouses selected, insert new assignments
  if (!params.allWarehousesAccess && params.warehouseIds.length > 0) {
    const { error: insertError } = await supabase
      .from("user_warehouses")
      .insert(
        params.warehouseIds.map((warehouseId) => ({
          user_id: params.userId,
          warehouse_id: warehouseId,
          company_id: params.companyId,
        })),
      );

    if (insertError) {
      console.error("Error adding warehouse assignments:", insertError);
      throw insertError;
    }
  }
}

/**
 * Fetch all staff members with their warehouse assignments
 * Users with all_warehouses_access will have empty warehouses array
 */
export async function getStaffMembers(): Promise<StaffListView[]> {
  const supabase = createClient();

  const { data: users, error } = await buildStaffMembersQuery(supabase);

  if (error) throw error;
  if (!users || users.length === 0) return [];

  // Transform the raw data to StaffListView format
  return users.map((user) => {
    // Extract warehouses from user_warehouses join
    const warehouses =
      user.user_warehouses
        ?.map((uw) => uw.warehouses)
        .filter((w): w is { id: string; name: string } => w !== null) || [];

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      email: user.email,
      profile_image_url: user.profile_image_url,
      role: user.role,
      all_warehouses_access: user.all_warehouses_access,
      warehouses: user.all_warehouses_access ? [] : warehouses,
    } as StaffListView;
  });
}

/**
 * Fetch a single staff member by ID with warehouse assignments
 * Returns null if user not found or deleted
 */
export async function getStaffMemberById(
  userId: string,
): Promise<StaffDetailView | null> {
  const supabase = createClient();

  const { data: user, error } = await buildStaffMemberByIdQuery(
    supabase,
    userId,
  );

  if (error) {
    console.error("Error fetching staff member:", error);
    return null;
  }

  if (!user) return null;

  // Extract warehouses from user_warehouses join
  const warehouses =
    user.user_warehouses
      ?.map((uw) => uw.warehouses)
      .filter((w): w is { id: string; name: string } => w !== null) || [];

  return {
    ...user,
    warehouses: user.all_warehouses_access ? [] : warehouses,
  } as StaffDetailView;
}

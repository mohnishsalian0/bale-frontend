import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/types/database/supabase";

type User = Tables<"users">;

export interface UserWithRole extends User {
  role_permissions?: {
    permission_path: string;
  }[];
}

/**
 * Fetch user by auth user ID
 * This is the primary way to get the current logged-in user
 */
export async function getUserByAuthId(
  authUserId: string,
): Promise<User | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error) {
    console.error("Error fetching user by auth ID:", error);
    return null;
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
    .single();

  if (error) {
    console.error("Error updating user warehouse:", error);
    throw error;
  }

  return data;
}

/**
 * Fetch user's role and permissions
 */
export async function getUserRole(
  userId: string,
  roleName: string,
): Promise<UserWithRole | null> {
  const supabase = createClient();

  // Fetch user data
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    console.error("Error fetching user:", userError);
    return null;
  }

  // Fetch role ID
  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !roleData) {
    console.error("Error fetching role:", roleError);
    return user;
  }

  // Fetch permissions for this role
  const { data: permData, error: permError } = await supabase
    .from("role_permissions")
    .select("permissions!inner(permission_path)")
    .eq("role_id", roleData.id);

  if (permError) {
    console.error("Error fetching permissions:", permError);
    return user;
  }

  return {
    ...user,
    role_permissions: permData?.map((p: any) => ({
      permission_path: p.permissions.permission_path,
    })),
  };
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  updates: TablesUpdate<"users">,
): Promise<User> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    throw error;
  }

  return data;
}

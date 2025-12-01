import { createClient } from "@/lib/supabase/browser";
import { Permission, User, UserUpdate } from "@/types/users.types";

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

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .single<User>();

  if (error) {
    console.error("Error fetching user by auth ID:", error);
    throw error;
  }

  if (!data) {
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
    console.log(`Error fetching role: ${roleError}`);
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

  console.log(permData);

  return (
    (permData?.map(
      (p: { permissions: Pick<Permission, "permission_path">[] }) =>
        // @ts-expect-error permission is actually a single object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        p.permissions.permission_path,
    ) as string[]) ?? []
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

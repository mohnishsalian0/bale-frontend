import { createClient } from "@/lib/supabase/browser";
import { Tables } from "@/types/database/supabase";
import type { StaffListView, StaffDetailView } from "@/types/staff.types";
import { Permission, User, UserUpdate } from "@/types/users.types";
import { Warehouse } from "@/types/warehouses.types";

// ============================================================================
// RAW TYPES - For Supabase responses
// ============================================================================

type StaffListViewRaw = Omit<StaffListView, "warehouse_names">;

type StaffWarehousesListViewRaw = Pick<Tables<"user_warehouses">, "user_id"> & {
  warehouse: Pick<Warehouse, "name">;
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

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .single<User>();

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

/**
 * SELECT constant for staff list view
 */
export const STAFF_LIST_VIEW_SELECT = `
  id,
  first_name,
  last_name,
  phone_number,
  email,
  profile_image_url,
  role,
  all_warehouses_access
`;

/**
 * Fetch all staff members with their warehouse assignments
 * Users with all_warehouses_access will have empty warehouse_names array
 */
export async function getStaffMembers(): Promise<StaffListView[]> {
  const supabase = createClient();

  // Fetch all users (excluding deleted)
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select(STAFF_LIST_VIEW_SELECT)
    .is("deleted_at", null)
    .order("first_name", { ascending: true });

  if (usersError) throw usersError;
  if (!users || users.length === 0) return [];

  // Filter users who need warehouse data (not all_warehouses_access)
  const usersNeedingWarehouses = users.filter(
    (u: StaffListViewRaw) => !u.all_warehouses_access,
  );

  if (usersNeedingWarehouses.length === 0) {
    // All users have all_warehouses_access, return with empty arrays
    return users.map((user: StaffListViewRaw) => ({
      ...user,
      warehouse_names: [],
    })) as StaffListView[];
  }

  const userIds = usersNeedingWarehouses.map((u: StaffListViewRaw) => u.id);

  // Fetch warehouse assignments
  const { data: userWarehouses, error: warehousesError } = await supabase
    .from("user_warehouses")
    .select("user_id, warehouses(name)")
    .in("user_id", userIds);

  if (warehousesError) throw warehousesError;

  // Build warehouse map
  const warehouseMap = new Map<string, string[]>();
  ((userWarehouses as unknown as StaffWarehousesListViewRaw[]) || []).forEach(
    (uw) => {
      const warehouseName = uw.warehouse?.name;
      if (!warehouseName) return;

      if (!warehouseMap.has(uw.user_id)) {
        warehouseMap.set(uw.user_id, []);
      }
      warehouseMap.get(uw.user_id)!.push(warehouseName);
    },
  );

  // Combine data
  return users.map((user: StaffListViewRaw) => ({
    ...user,
    warehouse_names: user.all_warehouses_access
      ? []
      : warehouseMap.get(user.id) || [],
  })) as StaffListView[];
}

/**
 * Fetch a single staff member by ID with warehouse assignments
 * Returns null if user not found or deleted
 */
export async function getStaffMemberById(
  userId: string,
): Promise<StaffDetailView | null> {
  const supabase = createClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single<User>();

  if (userError) {
    console.error("Error fetching staff member:", userError);
    return null;
  }

  if (!user) return null;

  // If user has all_warehouses_access, return with empty array
  if (user.all_warehouses_access) {
    return { ...user, warehouse_names: [] } as StaffDetailView;
  }

  // Fetch warehouse assignments
  const { data: userWarehouses, error: warehousesError } = await supabase
    .from("user_warehouses")
    .select("warehouses(name)")
    .eq("user_id", userId);

  if (warehousesError) throw warehousesError;

  const warehouseNames = (userWarehouses || []).map(
    (uw) => (uw.warehouses as unknown as { name: string } | null)?.name || "",
  );

  return {
    ...user,
    warehouse_names: warehouseNames,
  } as StaffDetailView;
}

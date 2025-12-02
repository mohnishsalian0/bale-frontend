import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";
import type {
  InviteListView,
  InviteCreateParams,
  AcceptInviteParams,
} from "@/types/invites.types";
import { Warehouse } from "@/types/warehouses.types";

// ============================================================================
// RAW TYPES - For Supabase responses
// ============================================================================

type Invite = Tables<"invites">;

type InviteListViewRaw = Omit<InviteListView, "warehouse_names">;

type InviteWarehousesListViewRaw = Pick<
  Tables<"invite_warehouses">,
  "invite_id"
> & {
  warehouse: Pick<Warehouse, "name">;
};

/**
 * Fetch invite by token/code
 */
export async function getInviteByCode(code: string): Promise<Invite | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("token", code)
    .single<Invite>();

  if (error) {
    console.error("Error fetching invite:", error);
    return null;
  }

  return data;
}

/**
 * Accept an invite and create user profile
 * Uses RPC function for atomic operation with service role privileges
 *
 * Note: This should be called with a service role client
 * or from a secure server-side context
 */
export async function acceptInvite(
  params: AcceptInviteParams,
): Promise<string> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: newUserId, error } = await supabase.rpc(
    "create_user_from_invite",
    {
      p_auth_user_id: params.authUserId,
      p_invite_token: params.inviteToken,
      p_first_name: params.firstName,
      p_last_name: params.lastName,
      p_profile_image_url: params.profileImageUrl || null,
    },
  );

  if (error) {
    console.error("Error accepting invite:", error);
    throw error;
  }

  return newUserId as string;
}

/**
 * SELECT constant for invite list view
 */
export const INVITE_LIST_VIEW_SELECT = `
  id,
  token,
  role,
  company_name,
  all_warehouses_access,
  expires_at,
  created_at
`;

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch all active (unused and non-expired) invites with warehouse assignments
 * Filters: used_at IS NULL AND expires_at > NOW()
 * Invites with all_warehouses_access will have empty warehouse_names array
 */
export async function getActiveInvites(): Promise<InviteListView[]> {
  const supabase = createClient();

  // Fetch active invites (not used and not expired)
  const { data: invites, error: invitesError } = await supabase
    .from("invites")
    .select(INVITE_LIST_VIEW_SELECT)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (invitesError) throw invitesError;
  if (!invites || invites.length === 0) return [];

  // Filter invites that need warehouse data (not all_warehouses_access)
  const invitesNeedingWarehouses = invites.filter(
    (i) => !i.all_warehouses_access,
  );

  if (invitesNeedingWarehouses.length === 0) {
    // All invites have all_warehouses_access, return with empty arrays
    return invites.map((invite) => ({
      ...invite,
      warehouse_names: [],
    })) as InviteListView[];
  }

  const inviteIds = invitesNeedingWarehouses.map(
    (i: InviteListViewRaw) => i.id,
  );

  // Fetch warehouse assignments for these invites
  const { data: inviteWarehouses, error: warehousesError } = await supabase
    .from("invite_warehouses")
    .select("invite_id, warehouse:warehouse_id(name)")
    .in("invite_id", inviteIds);

  if (warehousesError) throw warehousesError;

  // Build warehouse map
  const warehouseMap = new Map<string, string[]>();
  (
    (inviteWarehouses as unknown as InviteWarehousesListViewRaw[]) || []
  ).forEach((iw) => {
    const warehouseName = iw.warehouse?.name;
    if (!warehouseName) return;

    if (!warehouseMap.has(iw.invite_id)) {
      warehouseMap.set(iw.invite_id, []);
    }
    warehouseMap.get(iw.invite_id)!.push(warehouseName);
  });

  // Combine data
  return invites.map((invite: InviteListViewRaw) => ({
    ...invite,
    warehouse_names: invite.all_warehouses_access
      ? []
      : warehouseMap.get(invite.id) || [],
  })) as InviteListView[];
}

/**
 * Create a new staff invite
 * Uses RPC function for atomic creation with service role privileges
 * Returns the invite token
 */
export async function createInvite(
  params: InviteCreateParams,
): Promise<string> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: token, error } = await supabase.rpc("create_staff_invite", {
    p_company_id: params.companyId,
    p_company_name: params.companyName,
    p_role: params.role,
    p_all_warehouses_access: params.allWarehousesAccess,
    p_warehouse_ids: params.warehouseIds,
    p_expires_at: params.expiresAt,
  });

  if (error) {
    console.error("Error creating invite:", error);
    throw error;
  }

  return token as string;
}

/**
 * Delete an invite (hard delete)
 * This permanently removes the invite from the database
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("invites").delete().eq("id", inviteId);

  if (error) {
    console.error("Error deleting invite:", error);
    throw error;
  }
}

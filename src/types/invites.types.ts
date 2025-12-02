import type { Tables } from "@/types/database/supabase";

type Invite = Tables<"invites">;

/**
 * Active invite with details for list views
 * Used in: staff page active invites tab
 */
export interface InviteListView extends Pick<
  Invite,
  | "id"
  | "token"
  | "role"
  | "company_name"
  | "all_warehouses_access"
  | "expires_at"
  | "created_at"
> {
  /**
   * Array of warehouse names this invite grants access to
   * Empty array if all_warehouses_access is true
   */
  warehouse_names: string[];
}

/**
 * Invite details for acceptance page
 * Used in: public invite acceptance page
 */
export interface InviteDetailView extends Pick<
  Invite,
  "id" | "token" | "role" | "company_name" | "company_id" | "expires_at"
> {
  /**
   * Array of warehouse IDs this invite grants access to
   */
  warehouse_ids: string[];
}

/**
 * Parameters for creating a new staff invite
 * Maps to create_staff_invite RPC function
 */
export interface InviteCreateParams {
  companyId: string;
  companyName: string;
  role: "admin" | "staff";
  allWarehousesAccess: boolean;
  warehouseIds: string[];
  expiresAt: string; // ISO timestamp
}

/**
 * Parameters for accepting an invite
 * Maps to create_user_from_invite RPC function
 */
export interface AcceptInviteParams {
  inviteToken: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

import type { Tables } from "@/types/database/supabase";

type User = Tables<"users">;

/**
 * Staff member with minimal details for list views
 * Used in: staff list page
 */
export interface StaffListView extends Pick<
  User,
  | "id"
  | "first_name"
  | "last_name"
  | "phone_number"
  | "email"
  | "profile_image_url"
  | "role"
  | "all_warehouses_access"
> {
  /**
   * Array of warehouse names the staff member is assigned to
   * Empty array if all_warehouses_access is true
   */
  warehouse_names: string[];
}

/**
 * Staff member with full details for detail views
 * Used in: staff detail page (if implemented)
 */
export interface StaffDetailView extends User {
  /**
   * Array of warehouse names the staff member is assigned to
   * Empty array if all_warehouses_access is true
   */
  warehouse_names: string[];
}

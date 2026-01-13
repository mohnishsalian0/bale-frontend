import type { Tables } from "@/types/database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildStaffMembersQuery,
  buildStaffMemberByIdQuery,
} from "@/lib/queries/users";

type User = Tables<"users">;

// ============================================================================
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw type inferred from buildStaffMembersQuery
 * Used as bridge between Supabase response and StaffListView
 */
export type StaffListViewRaw = QueryData<
  ReturnType<typeof buildStaffMembersQuery>
>[number];

/**
 * Raw type inferred from buildStaffMemberByIdQuery
 * Used as bridge between Supabase response and StaffDetailView
 */
export type StaffDetailViewRaw = QueryData<
  ReturnType<typeof buildStaffMemberByIdQuery>
>;

// ============================================================================
// STAFF VIEW TYPES
// ============================================================================

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
   * Array of warehouses the staff member is assigned to
   * Empty array if all_warehouses_access is true
   */
  warehouses: Array<{ id: string; name: string }>;
}

/**
 * Staff member with full details for detail views
 * Used in: staff detail page (if implemented)
 */
export interface StaffDetailView extends User {
  /**
   * Array of warehouses the staff member is assigned to
   * Empty array if all_warehouses_access is true
   */
  warehouses: Array<{ id: string; name: string }>;
}

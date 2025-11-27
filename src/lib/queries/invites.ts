import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/supabase";

type Invite = Tables<"invites">;

export interface AcceptInviteParams {
  inviteToken: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

/**
 * Fetch invite by token/code
 */
export async function getInviteByCode(code: string): Promise<Invite | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("token", code)
    .single();

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

  return newUserId;
}

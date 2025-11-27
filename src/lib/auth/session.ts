import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database/supabase";

type User = Tables<"users">;

/**
 * Get the current authenticated user with their profile
 * Server-side only - use in Server Components, API routes, etc.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerClient();

  // Get authenticated user from Supabase Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Fetch user profile from users table
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .single();

  if (userError || !user) {
    return null;
  }

  return user;
}

/**
 * Get the current user's session
 * Returns auth session with user metadata
 */
export async function getSession() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

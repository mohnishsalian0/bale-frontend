import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { UserRole } from "@/types/database/enums";
import type { Tables } from "@/types/database/supabase";

type User = Tables<"users">;

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/**
 * Get the current authenticated user with their profile
 * Server-side only - use in Server Components, API routes, etc.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

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
    .single<User>();

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
  const supabase = await createClient();
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

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function isStaff(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "staff";
}

export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role as UserRole | null;
}

export async function getCompanyId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.company_id || null;
}

export async function getWarehouseId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.warehouse_id || null;
}

export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Admin access required");
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

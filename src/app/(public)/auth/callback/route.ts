import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type UserMetadata = {
  given_name?: string;
  family_name?: string;
  name?: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const inviteCode = requestUrl.searchParams.get("invite_code");
  const redirectTo = requestUrl.searchParams.get("redirectTo") || "/warehouse";

  console.log("🔍 Auth callback received");
  console.log("Code:", code);
  console.log("Invite code:", inviteCode);

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("❌ Error exchanging code for session:", exchangeError);
      return NextResponse.redirect(
        `${requestUrl.origin}/error?message=auth_failed`,
      );
    }

    console.log("✅ Session established");

    // Get the authenticated user
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !authUser) {
      console.error("❌ Error getting user:", userError);
      return NextResponse.redirect(
        `${requestUrl.origin}/error?message=user_not_found`,
      );
    }

    console.log("✅ Auth user:", authUser.email);

    // Check if user profile already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single();

    console.log("Existing user:", existingUser);
    console.log("User check error:", userCheckError);

    if (existingUser) {
      // Profile exists, redirect to original destination or dashboard
      console.log("✅ Profile exists, redirecting to", redirectTo);
      return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
    }

    // New user - need invite code to create profile
    if (!inviteCode) {
      console.error("❌ No invite code provided for new user");
      return NextResponse.redirect(
        `${requestUrl.origin}/error?message=invite_required`,
      );
    }

    // Fetch the invite
    console.log("🔍 Fetching invite...");
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("token", inviteCode)
      .single<Tables<"invites">>();

    console.log("Invite:", invite);
    console.log("Invite error:", inviteError);

    if (!invite || invite.used_at) {
      console.error("❌ Invalid or used invite");
      // return NextResponse.redirect(`${requestUrl.origin}/error?message=invalid_invite`);
    }

    // Create user profile using RPC function (bypasses RLS)
    console.log("📝 Creating user profile using RPC...");
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const metadata = authUser.user_metadata as UserMetadata;
    const fullName = metadata.name || "";
    const nameParts = fullName.split(" ");

    const firstName = metadata.given_name || nameParts[0] || "User";
    const lastName = metadata.family_name || nameParts.slice(1).join(" ") || "";

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { data: newUserId, error: createError } = await supabaseAdmin.rpc(
      "create_user_from_invite",
      {
        p_auth_user_id: authUser.id,
        p_invite_token: inviteCode,
        p_first_name: firstName,
        p_last_name: lastName,
      },
    );

    console.log("New user ID:", newUserId);
    console.log("Create error:", createError);

    if (createError || !newUserId) {
      console.error("❌ Error creating user profile:", createError);
      return NextResponse.redirect(
        `${requestUrl.origin}/error?message=profile_creation_failed`,
      );
    }

    // 🔄 Refresh session so custom_access_auth_hook runs and injects claims
    console.log("🔄 Refreshing session to trigger access token hook");
    await supabase.auth.refreshSession();

    // Redirect to original destination or dashboard
    console.log("✅ Success! Redirecting to", redirectTo);
    return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
  }

  // No code provided, redirect to home
  return NextResponse.redirect(requestUrl.origin);
}

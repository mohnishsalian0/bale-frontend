import { redirect } from "next/navigation";
import InviteAcceptance from "./InviteAcceptance";
import { createClient } from "@/lib/supabase/server";
import { Invite } from "@/types/invites.types";
import { User } from "@/types/users.types";

interface InvitePageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from("invites")
    .select("*")
    .eq("token", code)
    .single<Invite>();

  if (error) {
    console.error("Error fetching invite:", error);
    return null;
  }

  // Check if user is already logged in
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    // Check if user profile exists
    const { data: currentUser } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .single<User>();

    if (currentUser) {
      redirect("/warehouse");
    }
  }

  if (error || !invite) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid Invite
          </h1>
          <p className="text-gray-600">
            This invite link is invalid or has expired. Please contact your
            administrator for a new invite.
          </p>
        </div>
      </div>
    );
  }

  // Check if already used
  if (invite.used_at) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invite Already Used
          </h1>
          <p className="text-gray-600 mb-6">
            This invite has already been used. If you already have an account,
            please log in.
          </p>
          <a
            href="auth/login"
            className="block w-full text-center bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Check if expired
  const expiresAt = new Date(invite.expires_at);
  if (expiresAt < new Date()) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invite Expired
          </h1>
          <p className="text-gray-600">
            This invite has expired. Please contact your administrator for a new
            invite.
          </p>
        </div>
      </div>
    );
  }

  // Valid invite - show acceptance page
  return (
    <InviteAcceptance
      inviteCode={code}
      companyName={invite.company_name}
      warehouseName={undefined}
      role={invite.role}
    />
  );
}

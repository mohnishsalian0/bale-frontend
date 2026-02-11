import { createSupabaseClient, initializeEnvironment } from "./modules/shared";
import { ensureCompany } from "./modules/company";

async function createAdminInvite() {
  // Initialize environment and Supabase client
  const env = initializeEnvironment();
  const supabase = createSupabaseClient(
    env.supabaseUrl,
    env.supabaseServiceKey,
  );

  // Step 1: Company
  const { companyId, companyName } = await ensureCompany(supabase);

  // Create invite for the test company
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const { data: adminToken, error: adminInviteError } = await supabase.rpc(
    "create_staff_invite",
    {
      p_all_warehouses_access: true,
      p_company_id: companyId,
      p_company_name: companyName,
      p_role: "admin",
      p_warehouse_ids: [], // Admin doesn't need warehouse assignment
      p_expires_at: expiresAt.toISOString(),
    },
  );

  if (adminInviteError || !adminToken) {
    console.error("❌ Error creating admin invite:", adminInviteError);
  } else {
    console.log(`✅ Admin invite created\n`);
  }

  let appUrl: string;

  if (env.env === "staging") {
    appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  } else {
    appUrl = "http://localhost:3000";
  }

  // Print invite links
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔗 Invite Links:\n");
  console.log(`${appUrl}/invite/${adminToken}\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

createAdminInvite().catch(console.error);

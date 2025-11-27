import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// =====================================================
// EDIT THESE DETAILS FOR YOUR COMPANY
// =====================================================

const COMPANY_INFO = {
  name: "Bale inventory",
  gst_number: "27AABCT1234A1Z5", // Optional, set to null if not applicable
  pan_number: "AABCT1234A", // Optional, set to null if not applicable
  business_type: "Textile app", // e.g., "Textile Manufacturing", "Fabric Distribution"

  // Address
  address_line1: "123 Business Street",
  address_line2: "Suite 100", // Optional
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  pin_code: "400001",

  // Contact (Optional)
  // phone_number: '+91 9876543210', // Optional
  // email: 'contact@yourcompany.com', // Optional
  // website: 'https://yourcompany.com', // Optional

  // Logo URL (Optional - you can upload later via the app)
  logo_url: null,
};

const WAREHOUSE_INFO = {
  name: "Main Warehouse",

  // Address
  address_line1: "123 Warehouse Road",
  address_line2: "Godown No. 5", // Optional
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  pin_code: "400002",

  // Contact (Optional)
  // phone_number: '+91 9876543211', // Optional
  // manager_name: 'John Doe', // Optional
};

const ADMIN_INVITE = {
  role: "admin",
  // Admin users don't need warehouse assignment - they operate at company level
  // email: 'admin@yourcompany.com',
  // phone_number: '+91 9876543210', // Optional
};

// =====================================================
// SCRIPT STARTS HERE - DO NOT EDIT BELOW
// =====================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!;
const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

if (!supabaseUrl || !supabaseServiceKey || !appUrl) {
  console.error("❌ Missing environment variables!");
  console.error("Make sure these are set in .env.local:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL_PROD");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY_PROD");
  console.error("  - NEXT_PUBLIC_APP_URL (your custom domain)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupCompany() {
  console.log("🚀 Setting up production company...\n");

  try {
    // Create company
    console.log("📦 Creating company...");
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: COMPANY_INFO.name,
        gst_number: COMPANY_INFO.gst_number,
        pan_number: COMPANY_INFO.pan_number,
        business_type: COMPANY_INFO.business_type,
        address_line1: COMPANY_INFO.address_line1,
        address_line2: COMPANY_INFO.address_line2,
        city: COMPANY_INFO.city,
        state: COMPANY_INFO.state,
        country: COMPANY_INFO.country,
        pin_code: COMPANY_INFO.pin_code,
        // phone_number: COMPANY_INFO.phone_number,
        // email: COMPANY_INFO.email,
        // website: COMPANY_INFO.website,
        logo_url: COMPANY_INFO.logo_url,
      })
      .select()
      .single();

    if (companyError || !company) {
      console.error("❌ Failed to create company:", companyError);
      return;
    }

    console.log(`✅ Created company: ${company.name} (ID: ${company.id})\n`);

    // Create warehouse
    console.log("🏭 Creating warehouse...");
    const { data: warehouse, error: warehouseError } = await supabase
      .from("warehouses")
      .insert({
        company_id: company.id,
        name: WAREHOUSE_INFO.name,
        address_line1: WAREHOUSE_INFO.address_line1,
        address_line2: WAREHOUSE_INFO.address_line2,
        city: WAREHOUSE_INFO.city,
        state: WAREHOUSE_INFO.state,
        country: WAREHOUSE_INFO.country,
        pin_code: WAREHOUSE_INFO.pin_code,
        // phone_number: WAREHOUSE_INFO.phone_number,
        // manager_name: WAREHOUSE_INFO.manager_name,
      })
      .select()
      .single();

    if (warehouseError || !warehouse) {
      console.error("❌ Failed to create warehouse:", warehouseError);
      return;
    }

    console.log(
      `✅ Created warehouse: ${warehouse.name} (ID: ${warehouse.id})\n`,
    );

    // Generate invite code
    console.log("🎫 Generating admin invite...");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: inviteToken, error: inviteTokenError } = await supabase.rpc(
      "create_staff_invite",
      {
        p_company_id: company.id,
        p_company_name: company.name,
        p_role: ADMIN_INVITE.role,
        p_warehouse_ids: null, // Admin doesn't need warehouse assignment
        p_expires_at: expiresAt.toISOString(),
      },
    );

    if (inviteTokenError || !inviteToken) {
      console.error("❌ Failed to create invite:", inviteTokenError);
      return;
    }

    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("token", inviteToken)
      .single();

    if (inviteError || !invite) {
      console.error("❌ Failed to create invite:", inviteTokenError);
      return;
    }

    console.log(`✅ Created invite\n`);

    // Generate invite URL
    const inviteUrl = `${appUrl}/invite/${inviteToken}`;

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ SETUP COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📋 Summary:");
    console.log(`   Company: ${company.name}`);
    console.log(`   Company ID: ${company.id}`);
    console.log(`   Warehouse: ${warehouse.name}`);
    console.log(`   Warehouse ID: ${warehouse.id}`);
    console.log(`   Invite Role: ${invite.role}`);
    console.log(
      `   Invite Expires: ${new Date(invite.expires_at).toLocaleString()}`,
    );
    console.log("\n🔗 Admin Invite Link:");
    console.log(`   ${inviteUrl}`);
    console.log("\n📧 Send this link to the admin user to complete setup.");
    console.log("   They will sign in with Google and accept the invite.");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Run the setup
setupCompany();

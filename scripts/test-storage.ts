import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testStorage() {
  console.log("🧪 Testing storage setup...\n");

  // Test 1: Check if buckets exist
  console.log("1️⃣ Checking storage buckets...");
  const { data: buckets, error: bucketsError } =
    await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error("❌ Error listing buckets:", bucketsError);
    return;
  }

  const requiredBuckets = ["company-logos", "profile-images", "product-images"];
  const existingBuckets = buckets?.map((b) => b.name) || [];

  console.log("   Existing buckets:", existingBuckets);

  for (const bucketName of requiredBuckets) {
    if (existingBuckets.includes(bucketName)) {
      console.log(`   ✅ ${bucketName} - exists`);
    } else {
      console.log(`   ❌ ${bucketName} - missing`);
    }
  }

  // Test 2: Check bucket configurations
  console.log("\n2️⃣ Checking bucket configurations...");
  for (const bucketName of requiredBuckets) {
    const bucket = buckets?.find((b) => b.name === bucketName);
    if (bucket) {
      console.log(`   📦 ${bucketName}:`);
      console.log(`      - Public: ${bucket.public}`);
      console.log(
        `      - File size limit: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024).toFixed(2) + "MB" : "unlimited"}`,
      );
      console.log(
        `      - Allowed MIME types: ${bucket.allowed_mime_types?.join(", ") || "all"}`,
      );
    }
  }

  // Test 3: Check storage policies
  console.log("\n3️⃣ Checking storage policies...");
  const { data: _policies, error: _policiesError } = await supabase.rpc(
    "get_storage_policies" as any,
  );

  // Note: Supabase doesn't provide a direct way to list storage policies via API
  // This would need to be checked manually in the Supabase dashboard or via SQL
  console.log(
    "   ℹ️  Storage policies need to be verified manually in Supabase dashboard",
  );
  console.log("   📋 Expected policies:");
  console.log("      - company-logos: public read, admin write");
  console.log("      - profile-images: public read, user write own");
  console.log("      - product-images: public read, company users write");

  // Test 4: Test file paths
  console.log("\n4️⃣ Testing file path formats...");
  const testCompanyId = "123e4567-e89b-12d3-a456-426614174000";
  const testUserId = "234e5678-e89b-12d3-a456-426614174001";
  const testProductId = "345e6789-e89b-12d3-a456-426614174002";

  console.log("   📁 Expected file paths:");
  console.log(`      - Company logo: ${testCompanyId}/logo.png`);
  console.log(`      - Profile image: ${testUserId}/profile.jpg`);
  console.log(
    `      - Product image: ${testCompanyId}/${testProductId}/0.webp`,
  );

  console.log("\n✨ Storage setup test complete!");
  console.log("\n💡 To test file uploads:");
  console.log("   1. Use the storage utilities in src/lib/storage/index.ts");
  console.log("   2. Create a test page with file upload component");
  console.log("   3. Verify uploads work correctly through the UI");
}

testStorage().catch(console.error);

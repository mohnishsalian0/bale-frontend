/**
 * Dev Script: Create Company, Warehouse, and Invite
 *
 * This script creates test data for development:
 * 1. Creates a company
 * 2. Creates a warehouse for that company
 * 3. Generates an invite link
 *
 * Usage:
 *   npx tsx scripts/create-invite.ts
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🚀 Creating test data...\n');

  // 1. Create Company
  console.log('📦 Creating company...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: 'Looms & Layers',
      address_line1: '123 Textile Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pin_code: '400001',
      gst_number: 'GST123456789',
    })
    .select()
    .single();

  if (companyError) {
    console.error('❌ Error creating company:', companyError);
    process.exit(1);
  }

  console.log(`✅ Company created: ${company.name} (${company.id})\n`);

  // 2. Create Warehouse
  console.log('🏭 Creating warehouse...');
  const { data: warehouse, error: warehouseError } = await supabase
    .from('warehouses')
    .insert({
      company_id: company.id,
      name: 'SwiftLog Depot',
      address_line1: '456 Storage Lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pin_code: '400002',
    })
    .select()
    .single();

  if (warehouseError) {
    console.error('❌ Error creating warehouse:', warehouseError);
    process.exit(1);
  }

  console.log(`✅ Warehouse created: ${warehouse.name} (${warehouse.id})\n`);

  // 3. Create Admin Invite
  console.log('🎟️  Creating admin invite...');
  const adminToken = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const { data: adminInvite, error: adminInviteError } = await supabase
    .from('invites')
    .insert({
      token: adminToken,
      company_id: company.id,
      warehouse_id: warehouse.id,
      role: 'admin',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (adminInviteError) {
    console.error('❌ Error creating admin invite:', adminInviteError);
    process.exit(1);
  }

  console.log(`✅ Admin invite created\n`);

  // 4. Create Staff Invite
  console.log('🎟️  Creating staff invite...');
  const staffToken = randomBytes(32).toString('hex');

  const { data: staffInvite, error: staffInviteError } = await supabase
    .from('invites')
    .insert({
      token: staffToken,
      company_id: company.id,
      warehouse_id: warehouse.id,
      role: 'staff',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (staffInviteError) {
    console.error('❌ Error creating staff invite:', staffInviteError);
    process.exit(1);
  }

  console.log(`✅ Staff invite created\n`);

  // Print invite links
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Setup Complete!\n');
  console.log('📋 Company Details:');
  console.log(`   Name: ${company.name}`);
  console.log(`   ID: ${company.id}\n`);
  console.log('🏭 Warehouse Details:');
  console.log(`   Name: ${warehouse.name}`);
  console.log(`   ID: ${warehouse.id}\n`);
  console.log('🔗 Invite Links (valid for 7 days):\n');
  console.log('👤 Admin Invite:');
  console.log(`   http://localhost:3000/invite/${adminToken}\n`);
  console.log('👷 Staff Invite:');
  console.log(`   http://localhost:3000/invite/${staffToken}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

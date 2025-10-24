import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function createTestPartners() {
	console.log('🌱 Creating test data...\n');

	// Get or create company
	let companyId: string;
	let warehouseId: string;

	const { data: companies, error: companyError } = await supabase
		.from('companies')
		.select('id')
		.limit(1);

	if (companyError) {
		console.error('❌ Error fetching companies:', companyError);
		return;
	}

	if (!companies || companies.length === 0) {
		console.log('📦 Creating test company...');
		const { data: newCompany, error: createError } = await supabase
			.from('companies')
			.insert({
				name: 'Bale Test Company',
				gst_number: '27AABCT1234A1Z5',
				pan_number: 'AABCT1234A',
				business_type: 'Textile Manufacturing',
				address_line1: '123 Test Street',
				city: 'Mumbai',
				state: 'Maharashtra',
				country: 'India',
				pin_code: '400001',
			})
			.select()
			.single();

		if (createError || !newCompany) {
			console.error('❌ Failed to create company:', createError);
			return;
		}

		companyId = newCompany.id;
		console.log(`✅ Created company: ${companyId}\n`);

		// Create a test warehouse
		console.log('🏭 Creating test warehouse...');
		const { data: warehouse, error: warehouseError } = await supabase
			.from('warehouses')
			.insert({
				company_id: companyId,
				name: 'Main Warehouse',
				address_line1: '123 Test Street',
				city: 'Mumbai',
				state: 'Maharashtra',
				country: 'India',
				pin_code: '400001',
			})
			.select()
			.single();

		if (warehouseError || !warehouse) {
			console.error('❌ Failed to create warehouse:', warehouseError);
			return;
		}

		warehouseId = warehouse.id;
		console.log(`✅ Created warehouse: ${warehouseId}\n`);

		// Create a test admin user
		console.log('👤 Creating test admin user...');
		const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
			email: 'admin@baletest.com',
			password: 'testpassword123',
			email_confirm: true,
		});

		if (authError || !authUser.user) {
			console.error('❌ Failed to create auth user:', authError);
		} else {
			const { data: user, error: userError } = await supabase
				.from('users')
				.insert({
					auth_user_id: authUser.user.id,
					company_id: companyId,
					warehouse_id: warehouse.id,
					first_name: 'Admin',
					last_name: 'User',
					email: 'admin@baletest.com',
					role: 'admin',
				})
				.select()
				.single();

			if (userError) {
				console.error('❌ Failed to create user profile:', userError);
			} else {
				console.log(`✅ Created admin user: ${user.id}\n`);
			}
		}
	} else {
		companyId = companies[0].id;
		console.log(`📦 Using existing company: ${companyId}\n`);

		// Get existing warehouse
		const { data: warehouses, error: whError } = await supabase
			.from('warehouses')
			.select('id')
			.eq('company_id', companyId)
			.limit(1);

		if (whError || !warehouses || warehouses.length === 0) {
			console.error('❌ No warehouse found for company');
			return;
		}

		warehouseId = warehouses[0].id;
	}

	// Get a user to use as created_by
	const { data: users, error: userError } = await supabase
		.from('users')
		.select('id')
		.eq('company_id', companyId)
		.limit(1);

	if (userError || !users || users.length === 0) {
		console.error('❌ No users found for this company. Cannot create partners.');
		return;
	}

	const createdBy = users[0].id;
	console.log(`👤 Using user ${createdBy} as creator\n`);

	const testPartners = [
		// Customers
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Rajesh',
			last_name: 'Kumar',
			company_name: 'Kumar Textiles',
			phone_number: '+91 98765 43210',
			email: 'rajesh@kumartextiles.com',
			address_line1: '123 MG Road',
			city: 'Mumbai',
			state: 'Maharashtra',
			pin_code: '400001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Priya',
			last_name: 'Sharma',
			company_name: 'Sharma Fabrics',
			phone_number: '+91 98765 43211',
			email: 'priya@sharmafabrics.com',
			address_line1: '456 Commercial Street',
			city: 'Bangalore',
			state: 'Karnataka',
			pin_code: '560001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Amit',
			last_name: 'Patel',
			phone_number: '+91 98765 43212',
			address_line1: '789 Ashram Road',
			city: 'Ahmedabad',
			state: 'Gujarat',
			pin_code: '380009',
		},
		// Suppliers
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'supplier',
			first_name: 'Suresh',
			last_name: 'Reddy',
			company_name: 'Reddy Cotton Mills',
			phone_number: '+91 98765 43213',
			email: 'suresh@reddycotton.com',
			address_line1: '321 Industrial Area',
			city: 'Coimbatore',
			state: 'Tamil Nadu',
			pin_code: '641001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'supplier',
			first_name: 'Lakshmi',
			last_name: 'Naidu',
			company_name: 'Naidu Silk House',
			phone_number: '+91 98765 43214',
			address_line1: '654 Silk Market',
			city: 'Kanchipuram',
			state: 'Tamil Nadu',
			pin_code: '631502',
		},
		// Vendors
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'vendor',
			first_name: 'Arjun',
			last_name: 'singh',
			company_name: 'Singh Processing Unit',
			phone_number: '+91 98765 43215',
			email: 'arjun@singhprocessing.com',
			address_line1: '987 Factory Lane',
			city: 'Ludhiana',
			state: 'Punjab',
			pin_code: '141001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'vendor',
			first_name: 'Meera',
			last_name: 'Desai',
			company_name: 'Desai Dyeing Works',
			phone_number: '+91 98765 43216',
			address_line1: '147 Textile Park',
			city: 'Surat',
			state: 'Gujarat',
			pin_code: '395003',
		},
		// Agents
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'agent',
			first_name: 'Vikram',
			last_name: 'Mehta',
			phone_number: '+91 98765 43217',
			email: 'vikram.mehta@example.com',
			address_line1: '258 Transport Nagar',
			city: 'Delhi',
			state: 'Delhi',
			pin_code: '110001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'agent',
			first_name: 'Anjali',
			last_name: 'Gupta',
			phone_number: '+91 98765 43218',
			address_line1: '369 Market Road',
			city: 'Pune',
			state: 'Maharashtra',
			pin_code: '411001',
		},
	];

	for (const partner of testPartners) {
		const { data, error } = await supabase
			.from('partners')
			.insert(partner)
			.select()
			.single();

		if (error) {
			console.error(`❌ Failed to create partner: ${partner.first_name} ${partner.last_name}`);
			console.error(`   Error: ${error.message}`);
		} else {
			console.log(
				`✅ Created ${partner.partner_type}: ${partner.first_name} ${partner.last_name} ${partner.company_name ? `(${partner.company_name})` : ''
				}`
			);
		}
	}

	console.log('\n✨ Test partners created successfully!');

	// Create test products
	console.log('\n📦 Creating test products...\n');

	const testProducts = [
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Premium Silk Saree',
			product_number: 'PROD-001',
			material: 'Silk',
			color: 'Red',
			gsm: 120,
			thread_count_cm: 80,
			tags: ['premium', 'wedding', 'traditional'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 2500.00,
			selling_price_per_unit: 3500.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 10,
			hsn_code: '5007',
			notes: 'Premium quality silk saree with golden border',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Cotton Kurta Fabric',
			product_number: 'PROD-002',
			material: 'Cotton',
			color: 'White',
			gsm: 150,
			thread_count_cm: 60,
			tags: ['summer', 'breathable', 'casual'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 450.00,
			selling_price_per_unit: 650.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 50,
			hsn_code: '5208',
			notes: 'Pure cotton fabric ideal for summer kurtas',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Woolen Shawl Material',
			product_number: 'PROD-003',
			material: 'Wool',
			color: 'Black',
			gsm: 200,
			thread_count_cm: 50,
			tags: ['winter', 'warm', 'premium'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 1800.00,
			selling_price_per_unit: 2500.00,
			show_on_catalog: true,
			min_stock_alert: false,
			hsn_code: '5111',
			notes: 'High-quality woolen fabric for shawls',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Polyester Blend Dress Material',
			product_number: 'PROD-004',
			material: 'Polyester',
			color: 'Blue',
			gsm: 180,
			thread_count_cm: 70,
			tags: ['modern', 'formal', 'wrinkle-free'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 350.00,
			selling_price_per_unit: 550.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 30,
			hsn_code: '5407',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Linen Summer Fabric',
			product_number: 'PROD-005',
			material: 'Linen',
			color: 'White',
			gsm: 140,
			thread_count_cm: 55,
			tags: ['summer', 'eco-friendly', 'breathable'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 800.00,
			selling_price_per_unit: 1200.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 20,
			hsn_code: '5309',
			notes: 'Eco-friendly linen fabric for summer wear',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Designer Silk Fabric',
			product_number: 'PROD-006',
			material: 'Silk',
			color: 'Green',
			gsm: 110,
			thread_count_cm: 75,
			tags: ['designer', 'luxury', 'festive'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 3000.00,
			selling_price_per_unit: 4200.00,
			show_on_catalog: false,
			min_stock_alert: false,
			hsn_code: '5007',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Cotton Denim',
			product_number: 'PROD-007',
			material: 'Denim',
			color: 'Blue',
			gsm: 300,
			thread_count_cm: 40,
			tags: ['denim', 'casual', 'durable'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 600.00,
			selling_price_per_unit: 900.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 40,
			hsn_code: '5209',
			notes: 'Heavy-duty cotton denim fabric',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Yellow Cotton Print',
			product_number: 'PROD-008',
			material: 'Cotton',
			color: 'Yellow',
			gsm: 130,
			thread_count_cm: 65,
			tags: ['printed', 'colorful', 'casual'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 400.00,
			selling_price_per_unit: 600.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 25,
			hsn_code: '5208',
		},
	];

	for (const product of testProducts) {
		const { data, error } = await supabase
			.from('products')
			.insert(product)
			.select()
			.single();

		if (error) {
			console.error(`❌ Failed to create product: ${product.name}`);
			console.error(`   Error: ${error.message}`);
		} else {
			console.log(`✅ Created product: ${product.name} (${product.product_number})`);
		}
	}

	console.log('\n✨ Test products created successfully!');

	// 5. Create invite for the test company
	console.log('\n🎟️  Creating admin invite for test company...');
	const adminToken = randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

	const { data: adminInvite, error: adminInviteError } = await supabase
		.from('invites')
		.insert({
			token: adminToken,
			company_id: companyId,
			warehouse_id: warehouseId,
			role: 'admin',
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (adminInviteError) {
		console.error('❌ Error creating admin invite:', adminInviteError);
	} else {
		console.log(`✅ Admin invite created\n`);
	}

	// 6. Create staff invite
	console.log('🎟️  Creating staff invite for test company...');
	const staffToken = randomBytes(32).toString('hex');

	const { data: staffInvite, error: staffInviteError } = await supabase
		.from('invites')
		.insert({
			token: staffToken,
			company_id: companyId,
			warehouse_id: warehouseId,
			role: 'staff',
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (staffInviteError) {
		console.error('❌ Error creating staff invite:', staffInviteError);
	} else {
		console.log(`✅ Staff invite created\n`);
	}

	// Print invite links
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🎉 Setup Complete!\n');
	console.log('📋 Test Company Details:');
	console.log(`   Company ID: ${companyId}`);
	console.log(`   Warehouse ID: ${warehouseId}\n`);
	console.log('🔗 Invite Links (valid for 7 days):\n');
	console.log('👤 Admin Invite:');
	console.log(`   http://localhost:3000/invite/${adminToken}\n`);
	console.log('👷 Staff Invite:');
	console.log(`   http://localhost:3000/invite/${staffToken}\n`);
	console.log('💡 Use these invite links to create users for the test company with partners data');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

createTestPartners().catch(console.error);
